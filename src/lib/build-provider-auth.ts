import { spawn } from "node:child_process";
import type { BuildProviderId } from "@/lib/build-providers/types";
import {
  processEnvWithCursorCliPath,
  resolveCursorAgentExecutable,
} from "@/lib/cursor-cli";

export type ProviderAuthSnapshot = {
  ready: boolean;
  message: string;
  loginSteps: string[];
};

function spawnAgent(
  args: string[],
  options: { cwd?: string } = {}
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const bin = resolveCursorAgentExecutable();
  const env = processEnvWithCursorCliPath();
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("error", () => {
      resolve({ code: null, stdout, stderr });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? null, stdout, stderr });
    });
  });
}

export function getClaudeAuthSnapshot(): ProviderAuthSnapshot {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  if (hasKey) {
    return {
      ready: true,
      message: "ANTHROPIC_API_KEY is set for Claude / Anthropic.",
      loginSteps: [],
    };
  }
  return {
    ready: false,
    message: "No Anthropic API key configured for Claude builds.",
    loginSteps: [
      "Open https://console.anthropic.com/ and create an API key.",
      "Add ANTHROPIC_API_KEY=... to .env.local in the Semicolon project root.",
      "Restart the dev server (npm run dev) so the key is loaded.",
    ],
  };
}

export async function getCursorAuthSnapshot(): Promise<ProviderAuthSnapshot> {
  if (process.env.CURSOR_API_KEY?.trim()) {
    return {
      ready: true,
      message: "CURSOR_API_KEY is set for Cursor Agent.",
      loginSteps: [],
    };
  }

  const { code, stdout, stderr } = await spawnAgent(["status"]);
  const combined = `${stdout}\n${stderr}`.trim();

  if (code === null) {
    return {
      ready: false,
      message:
        'Could not run the Cursor CLI (`agent status`). It may not be installed or not on PATH.',
      loginSteps: [
        "Install Cursor CLI: curl https://cursor.com/install -fsS | bash",
        "Then authenticate: agent login",
        "Or set CURSOR_API_KEY from https://cursor.com/dashboard/cloud-agents (User API Keys).",
        'Optional: set CURSOR_AGENT_BIN if the binary is not named "agent".',
      ],
    };
  }

  const looksNotAuth = /not\s+authenticated|not\s+logged\s+in|login\s+required|please\s+log\s+in/i.test(
    combined
  );
  const looksLoggedIn =
    /logged\s+in|authenticated|sign\s*\(?ed\s*\)?\s+in|✓\s*logged/i.test(
      combined
    );

  if (code !== null && !looksNotAuth && (code === 0 || looksLoggedIn)) {
    return {
      ready: true,
      message:
        combined.length > 0
          ? combined.trim().slice(0, 300)
          : "Cursor CLI reports an authenticated session.",
      loginSteps: [],
    };
  }

  return {
    ready: false,
    message:
      combined.length > 0
        ? combined.slice(0, 400)
        : "Cursor CLI is not authenticated.",
    loginSteps: [
      "In a terminal on this machine, run: agent login",
      "Complete the browser sign-in for your Cursor account.",
      "Alternatively set CURSOR_API_KEY for API-key authentication.",
      `If Semicolon still cannot find the CLI, add to .env.local: CURSOR_AGENT_BIN=${resolveCursorAgentExecutable()}`,
      "Restart npm run dev after changing .env.local, then click “Check connection” again.",
    ],
  };
}

export async function assertBuildProviderAuthenticated(
  id: BuildProviderId
): Promise<{ ok: true } | { ok: false; snapshot: ProviderAuthSnapshot }> {
  if (id === "claude") {
    const snapshot = getClaudeAuthSnapshot();
    return snapshot.ready ? { ok: true } : { ok: false, snapshot };
  }
  const snapshot = await getCursorAuthSnapshot();
  return snapshot.ready ? { ok: true } : { ok: false, snapshot };
}
