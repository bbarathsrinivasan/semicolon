import fs from "fs";
import os from "os";
import path from "path";

/** Default install location from https://cursor.com/docs/cli/installation */
function cursorLocalBinDir(): string {
  return path.join(os.homedir(), ".local", "bin");
}

/**
 * Path to the `agent` executable. Prefer CURSOR_AGENT_BIN, then ~/.local/bin/agent
 * when present (GUI-launched Node often lacks ~/.local/bin on PATH).
 */
export function resolveCursorAgentExecutable(): string {
  const fromEnv = process.env.CURSOR_AGENT_BIN?.trim();
  if (fromEnv) return fromEnv;

  const dir = cursorLocalBinDir();
  const macLinux = path.join(dir, "agent");
  if (fs.existsSync(macLinux)) return macLinux;

  const win = path.join(dir, "agent.exe");
  if (fs.existsSync(win)) return win;

  return "agent";
}

/** Ensure ~/.local/bin is on PATH for subprocesses (matches interactive zsh after install). */
export function processEnvWithCursorCliPath(): NodeJS.ProcessEnv {
  const binDir = cursorLocalBinDir();
  if (!fs.existsSync(binDir)) {
    return { ...process.env };
  }
  const sep = path.delimiter;
  const current = process.env.PATH ?? "";
  const normalized = path.resolve(binDir);
  const parts = current.split(sep).filter(Boolean);
  if (parts.some((p) => path.resolve(p) === normalized)) {
    return { ...process.env };
  }
  return {
    ...process.env,
    PATH: `${binDir}${sep}${current}`,
  };
}
