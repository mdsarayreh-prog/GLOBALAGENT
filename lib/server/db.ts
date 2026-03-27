import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

let dbSingleton: DatabaseSync | null = null;
let initialized = false;

function resolveJournalMode(): "WAL" | "DELETE" {
  const configured = process.env.SQLITE_JOURNAL_MODE?.trim().toUpperCase();
  if (configured === "DELETE") {
    return "DELETE";
  }

  if (configured === "WAL") {
    return "WAL";
  }

  if (process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_INSTANCE_ID) {
    return "DELETE";
  }

  return "WAL";
}

function resolveDbPath(): string {
  const configuredPath = process.env.DATABASE_URL?.trim() || process.env.GLOBAL_AGENT_DB_PATH?.trim();
  if (!configuredPath) {
    return resolve(process.cwd(), "data", "global-agent.sqlite");
  }

  if (configuredPath.startsWith("file:")) {
    return resolve(process.cwd(), configuredPath.slice("file:".length));
  }

  return resolve(process.cwd(), configuredPath);
}

function ensureDbDirectory(pathToDb: string) {
  const dir = dirname(pathToDb);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function runMigrations(db: DatabaseSync) {
  const migrationsDir = join(process.cwd(), "lib", "server", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  for (const filename of files) {
    const migrationId = filename.replace(/\.sql$/, "");
    const exists = db
      .prepare("SELECT 1 FROM migrations WHERE id = ? LIMIT 1")
      .get(migrationId) as { 1: number } | undefined;

    if (exists) {
      continue;
    }

    const script = readFileSync(join(migrationsDir, filename), "utf-8");
    db.exec("BEGIN");
    try {
      db.exec(script);
      db.prepare("INSERT INTO migrations (id, applied_at) VALUES (?, ?)").run(migrationId, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDb(): DatabaseSync {
  if (dbSingleton) {
    return dbSingleton;
  }

  const dbPath = resolveDbPath();
  ensureDbDirectory(dbPath);
  dbSingleton = new DatabaseSync(dbPath);
  dbSingleton.exec("PRAGMA foreign_keys = ON;");
  dbSingleton.exec(`PRAGMA journal_mode = ${resolveJournalMode()};`);
  dbSingleton.exec("PRAGMA busy_timeout = 5000;");

  if (!initialized) {
    runMigrations(dbSingleton);
    initialized = true;
  }

  return dbSingleton;
}
