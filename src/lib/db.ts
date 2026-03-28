import Database from "better-sqlite3";
import path from "path";
import {
  ArchNode,
  Project,
  ProjectSpec,
  Architecture,
  ProjectStatus,
  ArchitectureChatTurn,
} from "./types";
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        spec TEXT,
        architecture TEXT,
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
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
  spec?: ProjectSpec
): Project {
  const d = getDb();
  d.prepare(
    `INSERT INTO projects (id, name, spec) VALUES (?, ?, ?)`
  ).run(id, name, spec ? JSON.stringify(spec) : null);
  return getProject(id)!;
}

export function getProject(id: string): Project | null {
  const d = getDb();
  const row = d.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToProject(row) : null;
}

export function updateProject(
  id: string,
  updates: {
    name?: string;
    spec?: ProjectSpec;
    architecture?: Architecture;
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
