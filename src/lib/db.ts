import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import {
  ArchNode,
  Project,
  ProjectSpec,
  Architecture,
  ProjectStatus,
  ArchitectureChatTurn,
} from "./types";
import { BuildProviderId } from "./build-providers/types";
import { resolveBuildProviderId } from "./build-providers";
import {
  BUILD_INSTRUCTIONS_SETTING_KEY,
  DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN,
} from "./build-instructions-default";

const DB_PATH = path.join(process.cwd(), "semicolon.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        spec TEXT,
        architecture TEXT,
        build_provider TEXT NOT NULL DEFAULT 'claude',
        status TEXT NOT NULL DEFAULT 'specifying',
        build_log TEXT DEFAULT '',
        output_dir TEXT,
        architecture_chat TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    const cols = db
      .prepare(`PRAGMA table_info(projects)`)
      .all() as { name: string }[];
    if (!cols.some((c) => c.name === "architecture_chat")) {
      db.exec(`ALTER TABLE projects ADD COLUMN architecture_chat TEXT`);
    }
    if (!cols.some((c) => c.name === "build_provider")) {
      db.exec(
        `ALTER TABLE projects ADD COLUMN build_provider TEXT NOT NULL DEFAULT 'claude'`
      );
    }
    const cols2 = db
      .prepare(`PRAGMA table_info(projects)`)
      .all() as { name: string }[];
    if (!cols2.some((c) => c.name === "user_id")) {
      db.exec(`ALTER TABLE projects ADD COLUMN user_id TEXT`);
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        default_build_provider TEXT NOT NULL DEFAULT 'claude',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }
  return db;
}

function rowToProject(row: Record<string, unknown>): Project {
  let architectureChat: ArchitectureChatTurn[] | null = null;
  const rawChat = row.architecture_chat as string | null | undefined;
  if (rawChat) {
    try {
      architectureChat = JSON.parse(rawChat) as ArchitectureChatTurn[];
    } catch {
      architectureChat = null;
    }
  }
  return {
    id: row.id as string,
    name: row.name as string,
    spec: row.spec ? JSON.parse(row.spec as string) : null,
    architecture: row.architecture
      ? JSON.parse(row.architecture as string)
      : null,
    buildProvider: resolveBuildProviderId((row.build_provider as string) || null),
    status: row.status as ProjectStatus,
    buildLog: (row.build_log as string) || "",
    outputDir: (row.output_dir as string) || null,
    architectureChat,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createProject(
  id: string,
  name: string,
  userId: string,
  spec?: ProjectSpec,
  initialBuildProvider?: BuildProviderId
): Project {
  const d = getDb();
  const bp = resolveBuildProviderId(initialBuildProvider ?? null);
  d.prepare(
    `INSERT INTO projects (id, name, spec, user_id, build_provider) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, spec ? JSON.stringify(spec) : null, userId, bp);
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToProject(row) : null;
}

export function getProjectForUser(
  id: string,
  userId: string
): Project | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? rowToProject(row) : null;
}

export function updateProject(
  id: string,
  updates: {
    name?: string;
    spec?: ProjectSpec;
    architecture?: Architecture;
    buildProvider?: BuildProviderId;
    status?: ProjectStatus;
    buildLog?: string;
    outputDir?: string;
    architectureChat?: ArchitectureChatTurn[] | null;
  }
): void {
  const d = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    sets.push("name = ?");
    values.push(updates.name);
  }
  if (updates.spec !== undefined) {
    sets.push("spec = ?");
    values.push(JSON.stringify(updates.spec));
  }
  if (updates.architecture !== undefined) {
    sets.push("architecture = ?");
    values.push(JSON.stringify(updates.architecture));
  }
  if (updates.buildProvider !== undefined) {
    sets.push("build_provider = ?");
    values.push(resolveBuildProviderId(updates.buildProvider));
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }
  if (updates.buildLog !== undefined) {
    sets.push("build_log = ?");
    values.push(updates.buildLog);
  }
  if (updates.outputDir !== undefined) {
    sets.push("output_dir = ?");
    values.push(updates.outputDir);
  }
  if (updates.architectureChat !== undefined) {
    sets.push("architecture_chat = ?");
    values.push(
      updates.architectureChat === null
        ? null
        : JSON.stringify(updates.architectureChat)
    );
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  d.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values
  );
}

export function appendBuildLog(id: string, text: string): void {
  const d = getDb();
  d.prepare(
    `UPDATE projects SET build_log = build_log || ?, updated_at = datetime('now') WHERE id = ?`
  ).run(text + "\n", id);
}

export function updateNodeStatus(
  id: string,
  serviceId: string,
  status: string
): void {
  const project = getProject(id);
  if (!project?.architecture) return;

  const arch = { ...project.architecture };
  arch.nodes = arch.nodes.map((n) =>
    n.id === serviceId ? { ...n, status: status as ArchNode["status"] } : n
  );
  updateProject(id, { architecture: arch });
}


export function listProjects(): Project[] {
  const d = getDb();
  const rows = d
    .prepare(`SELECT * FROM projects ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToProject);
}

export type SessionUserRow = {
  id: string;
  email: string;
  defaultBuildProvider: BuildProviderId;
};

export function getUserForSessionToken(
  token: string
): SessionUserRow | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT u.id, u.email, u.default_build_provider AS default_build_provider
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')`
    )
    .get(token) as
    | { id: string; email: string; default_build_provider: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    defaultBuildProvider: resolveBuildProviderId(row.default_build_provider),
  };
}

export function createSession(userId: string): string {
  const d = getDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  d.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);
  return token;
}

export function deleteSession(token: string): void {
  const d = getDb();
  d.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

export type DbUserRecord = {
  id: string;
  email: string;
  password_hash: string;
  default_build_provider: string;
};

export function getUserByEmail(email: string): DbUserRecord | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT id, email, password_hash, default_build_provider FROM users WHERE email = ?`)
    .get(email.trim().toLowerCase()) as DbUserRecord | undefined;
  return row ?? null;
}

export function createUser(
  id: string,
  email: string,
  passwordHash: string
): void {
  const d = getDb();
  d.prepare(
    `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`
  ).run(id, email.trim().toLowerCase(), passwordHash);
}

export function updateUserDefaultBuildProvider(
  userId: string,
  provider: BuildProviderId
): void {
  const d = getDb();
  d.prepare(
    `UPDATE users SET default_build_provider = ? WHERE id = ?`
  ).run(resolveBuildProviderId(provider), userId);
}

export function getAppSetting(key: string): string | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setAppSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

/** `undefined` = never saved; use default template in UI and in prompts. */
export function getStoredBuildInstructions(): string | undefined {
  const v = getAppSetting(BUILD_INSTRUCTIONS_SETTING_KEY);
  if (v === null) return undefined;
  return v;
}

/** For coding agents: default template when unset; omit section if user saved empty string. */
export function effectiveBuildInstructionsForPrompt(): string | null {
  const stored = getStoredBuildInstructions();
  if (stored === undefined) return DEFAULT_BUILD_INSTRUCTIONS_MARKDOWN;
  const t = stored.trim();
  return t === "" ? null : stored;
}

export function setBuildInstructionsMarkdown(markdown: string): void {
  setAppSetting(BUILD_INSTRUCTIONS_SETTING_KEY, markdown);
}
