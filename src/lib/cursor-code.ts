import fs from "fs";
import path from "path";
import readline from "readline";
import { spawn } from "node:child_process";
import type { BuildEvent, Project } from "@/lib/types";
import { generateBuildSpecMarkdown } from "@/lib/claude-code";
import { yieldBuiltMarkers } from "@/lib/build-markers";
import {
  processEnvWithCursorCliPath,
  resolveCursorAgentExecutable,
} from "@/lib/cursor-cli";

const BUILD_TIMEOUT_MS = 300_000;

/**
 * Default `-p` text output is final-answer-only (no lines until exit).
 * stream-json + partial deltas yields line-delimited JSON for live progress.
 * @see https://cursor.com/docs/cli/headless
 */
function createCursorStreamJsonParser(): {
  processRawLine: (raw: string) => BuildEvent[];
  flush: () => BuildEvent[];
} {
  let assistantAcc = "";
  let lastAssistantFlush = 0;
  const flushMs = 750;
  const flushChars = 800;

  function maybeFlushAssistant(force: boolean): BuildEvent | null {
    if (!assistantAcc.trim()) return null;
    const now = Date.now();
    if (
      !force &&
      now - lastAssistantFlush < flushMs &&
      assistantAcc.length < flushChars
    ) {
      return null;
    }
    const text = assistantAcc;
    assistantAcc = "";
    lastAssistantFlush = now;
    return { type: "log", text: text.trimEnd() };
  }

  function parseLine(line: string): BuildEvent[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    let j: Record<string, unknown>;
    try {
      j = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return [{ type: "log", text: trimmed.length > 4000 ? `${trimmed.slice(0, 4000)}…` : trimmed }];
    }

    const type = typeof j.type === "string" ? j.type : "";
    const subtype = typeof j.subtype === "string" ? j.subtype : "";
    const out: BuildEvent[] = [];

    const flushAss = (force: boolean) => {
      const ev = maybeFlushAssistant(force);
      if (ev) out.push(ev);
    };

    if (type === "system" && subtype === "init") {
      flushAss(true);
      const model = typeof j.model === "string" ? j.model : "unknown";
      out.push({ type: "progress", text: `Cursor agent (${model})` });
      return out;
    }

    if (type === "assistant") {
      const msg = j.message;
      let delta = "";
      if (msg && typeof msg === "object") {
        const content = (msg as Record<string, unknown>).content;
        if (Array.isArray(content) && content[0] && typeof content[0] === "object") {
          const t = (content[0] as Record<string, unknown>).text;
          if (typeof t === "string") delta = t;
        }
      }
      if (delta) assistantAcc += delta;
      const ev = maybeFlushAssistant(false);
      if (ev) out.push(ev);
      return out;
    }

    if (type === "tool_call") {
      flushAss(true);
      if (subtype === "started") {
        const tc = j.tool_call;
        if (tc && typeof tc === "object") {
          const o = tc as Record<string, unknown>;
          if (o.writeToolCall && typeof o.writeToolCall === "object") {
            const args = (o.writeToolCall as Record<string, unknown>).args as
              | Record<string, unknown>
              | undefined;
            const p = args && typeof args.path === "string" ? args.path : "?";
            out.push({ type: "tool_use", tool: "write", input: p });
            return out;
          }
          if (o.readToolCall && typeof o.readToolCall === "object") {
            const args = (o.readToolCall as Record<string, unknown>).args as
              | Record<string, unknown>
              | undefined;
            const p = args && typeof args.path === "string" ? args.path : "?";
            out.push({ type: "tool_use", tool: "read", input: p });
            return out;
          }
        }
        out.push({ type: "log", text: "Tool call started" });
        return out;
      }
      if (subtype === "completed") {
        return out;
      }
      return out;
    }

    if (type === "result") {
      flushAss(true);
      const ms = typeof j.duration_ms === "number" ? j.duration_ms : 0;
      out.push({ type: "log", text: `Run finished (${ms}ms)` });
      return out;
    }

    flushAss(true);
    out.push({
      type: "log",
      text: trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}…` : trimmed,
    });
    return out;
  }

  return {
    processRawLine: (raw: string) => parseLine(raw),
    flush: () => {
      const ev = maybeFlushAssistant(true);
      return ev ? [ev] : [];
    },
  };
}

export async function* runCursorBuild(
  project: Project,
  outputDir: string,
  signal?: AbortSignal
): AsyncGenerator<BuildEvent> {
  fs.mkdirSync(outputDir, { recursive: true });
  const buildSpecContent = generateBuildSpecMarkdown(project);
  fs.writeFileSync(path.join(outputDir, "BUILD.md"), buildSpecContent);

  const buildPrompt = `Read BUILD.md in this directory. Semicolon's coding agents will use it to build the entire project according to its specifications.

Build services in dependency order: databases first, then APIs, then workers, then frontends.

After building each service, create a marker file at .semicolon/{serviceId}.done so progress can be tracked.`;

  const bin = resolveCursorAgentExecutable();
  const args = [
    "-p",
    "--force",
    "--trust",
    "--output-format",
    "stream-json",
    "--stream-partial-output",
    buildPrompt,
  ];

  const child = spawn(bin, args, {
    cwd: outputDir,
    env: processEnvWithCursorCliPath(),
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!child.stdout || !child.stderr) {
    yield {
      type: "complete",
      success: false,
      error: `Could not start Cursor CLI (${bin}). Is it installed and on PATH?`,
    };
    return;
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, BUILD_TIMEOUT_MS);

  const abortListener = () => {
    child.kill("SIGTERM");
  };
  if (signal) {
    if (signal.aborted) abortListener();
    else signal.addEventListener("abort", abortListener, { once: true });
  }

  const exitPromise = new Promise<number | null>((resolve) => {
    child.once("close", (code) => resolve(code));
  });

  let spawnErrMsg: string | null = null;
  child.once("error", (e: NodeJS.ErrnoException) => {
    spawnErrMsg = e.message;
  });

  async function drainLinesToQueue(
    input: NodeJS.ReadableStream,
    push: (line: string) => void
  ): Promise<void> {
    const rl = readline.createInterface({ input });
    try {
      for await (const line of rl) {
        const trimmed = line.trim();
        if (trimmed) push(trimmed);
      }
    } finally {
      rl.close();
    }
  }

  try {
    const rawLines: string[] = [];
    let wake: (() => void) | undefined;

    const poke = () => {
      wake?.();
      wake = undefined;
    };

    const pushLine = (text: string) => {
      rawLines.push(text);
      poke();
    };

    let readersLeft = 2;
    const onReaderDone = () => {
      readersLeft -= 1;
      poke();
    };

    void drainLinesToQueue(child.stdout, pushLine).finally(onReaderDone);
    void drainLinesToQueue(child.stderr, pushLine).finally(onReaderDone);

    const parser = createCursorStreamJsonParser();

    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        setTimeout(r, ms);
      });

    while (readersLeft > 0 || rawLines.length > 0) {
      if (signal?.aborted) {
        yield {
          type: "complete",
          success: false,
          error: "Build interrupted.",
        };
        return;
      }
      if (rawLines.length > 0) {
        const line = rawLines.shift()!;
        for (const ev of parser.processRawLine(line)) {
          yield ev;
        }
        continue;
      }
      await Promise.race([
        new Promise<void>((r) => {
          wake = r;
        }),
        sleep(1000),
      ]);
      for (const ev of parser.flush()) {
        yield ev;
      }
    }

    for (const ev of parser.flush()) {
      yield ev;
    }

    const code = await exitPromise;

    if (spawnErrMsg) {
      yield {
        type: "complete",
        success: false,
        error: `Cursor CLI failed to start: ${spawnErrMsg}`,
      };
      return;
    }

    if (signal?.aborted) {
      yield {
        type: "complete",
        success: false,
        error: "Build interrupted.",
      };
      return;
    }

    if (timedOut) {
      yield {
        type: "complete",
        success: false,
        error: "Cursor build timed out.",
      };
      return;
    }

    if (code !== 0) {
      yield {
        type: "complete",
        success: false,
        error: `Cursor agent exited with code ${code ?? "unknown"}.`,
      };
      return;
    }

    for (const ev of yieldBuiltMarkers(project, outputDir)) {
      yield ev;
    }
    yield { type: "complete", success: true };
  } catch (err) {
    yield {
      type: "complete",
      success: false,
      error: String(err),
    };
  } finally {
    clearTimeout(timer);
    if (signal) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}
