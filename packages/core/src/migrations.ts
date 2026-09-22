import fs from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { legacyIntervalDays } from "./review-schedule.js";
import type { Understanding } from "./types.js";

interface Migration {
  version: number;
  name: string;
  statements: string[];
  run?: (db: DatabaseSync) => void;
}

const LESSONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    tool TEXT NOT NULL,
    project_path TEXT NOT NULL,
    title TEXT NOT NULL,
    original_prompt TEXT NOT NULL,
    problem TEXT NOT NULL,
    mistake TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    fix_summary TEXT NOT NULL,
    takeaway TEXT,
    mistake_pattern TEXT,
    when_not_applicable TEXT,
    concepts TEXT NOT NULL,
    files_changed TEXT NOT NULL,
    code_example TEXT,
    bad_code_example TEXT,
    good_code_example TEXT,
    code_explanation TEXT,
    practice_task TEXT,
    review_questions TEXT NOT NULL,
    understanding TEXT NOT NULL,
    next_review_at TEXT NOT NULL,
    review_count INTEGER NOT NULL DEFAULT 0,
    source_diff TEXT,
    tags TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    superseded_by TEXT,
    supersedes TEXT,
    supersede_reason TEXT
  );
`;

const FTS_COLUMNS = [
  "title",
  "mistake_pattern",
  "problem",
  "mistake",
  "root_cause",
  "fix_summary",
  "takeaway",
  "when_not_applicable",
  "concepts",
  "files_changed",
  "tags",
] as const;

function ftsColumnList(): string {
  return FTS_COLUMNS.join(", ");
}

function ftsValueList(prefix: "new" | "old"): string {
  return FTS_COLUMNS.map((column) => `${prefix}.${column}`).join(", ");
}

const FTS_STATEMENTS: string[] = [
  `CREATE VIRTUAL TABLE IF NOT EXISTS lessons_fts USING fts5(
    ${ftsColumnList()},
    content='lessons', content_rowid='rowid', tokenize='trigram'
  );`,
  `CREATE TRIGGER IF NOT EXISTS lessons_fts_ai AFTER INSERT ON lessons BEGIN
    INSERT INTO lessons_fts(rowid, ${ftsColumnList()}) VALUES (new.rowid, ${ftsValueList("new")});
  END;`,
  `CREATE TRIGGER IF NOT EXISTS lessons_fts_ad AFTER DELETE ON lessons BEGIN
    INSERT INTO lessons_fts(lessons_fts, rowid, ${ftsColumnList()}) VALUES ('delete', old.rowid, ${ftsValueList("old")});
  END;`,
  `CREATE TRIGGER IF NOT EXISTS lessons_fts_au AFTER UPDATE ON lessons BEGIN
    INSERT INTO lessons_fts(lessons_fts, rowid, ${ftsColumnList()}) VALUES ('delete', old.rowid, ${ftsValueList("old")});
    INSERT INTO lessons_fts(rowid, ${ftsColumnList()}) VALUES (new.rowid, ${ftsValueList("new")});
  END;`,
  "INSERT INTO lessons_fts(lessons_fts) VALUES ('rebuild');",
];

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "lessons table",
    statements: [
      LESSONS_TABLE_SQL,
      "CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);",
      "CREATE INDEX IF NOT EXISTS idx_lessons_next_review_at ON lessons(next_review_at);",
    ],
  },
  {
    version: 2,
    name: "search indexes",
    statements: [
      "CREATE INDEX IF NOT EXISTS idx_lessons_updated_at ON lessons(updated_at);",
      "CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);",
    ],
  },
  {
    version: 3,
    name: "adaptive review scheduler",
    statements: [
      "ALTER TABLE lessons ADD COLUMN ease REAL NOT NULL DEFAULT 2.5",
      "ALTER TABLE lessons ADD COLUMN last_interval_days INTEGER",
    ],
    run: (db) => {
      const rows = db
        .prepare("SELECT id, understanding, review_count FROM lessons WHERE review_count > 0")
        .all() as unknown as Array<{
        id: string;
        understanding: Understanding;
        review_count: number;
      }>;
      const seed = db.prepare("UPDATE lessons SET last_interval_days = ? WHERE id = ?");
      for (const row of rows) {
        seed.run(legacyIntervalDays(row.understanding, row.review_count), row.id);
      }
    },
  },
];

function readUserVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as unknown as { user_version: number };
  return row.user_version;
}

function tableExists(db: DatabaseSync, name: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
  );
}

function schemaObjectExists(db: DatabaseSync, type: "table" | "trigger", name: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?").get(type, name),
  );
}

export function hasFtsIndex(db: DatabaseSync): boolean {
  return (
    schemaObjectExists(db, "table", "lessons_fts") &&
    schemaObjectExists(db, "trigger", "lessons_fts_ai") &&
    schemaObjectExists(db, "trigger", "lessons_fts_ad") &&
    schemaObjectExists(db, "trigger", "lessons_fts_au")
  );
}

function repairFtsIndex(db: DatabaseSync): void {
  if (hasFtsIndex(db)) return;
  db.exec("SAVEPOINT repair_fts");
  try {
    for (const statement of FTS_STATEMENTS) db.exec(statement);
    db.exec("RELEASE repair_fts");
  } catch (error) {
    db.exec("ROLLBACK TO repair_fts");
    db.exec("RELEASE repair_fts");
    if (!isUnsupportedFtsError(error)) throw error;
  }
}

function isUnsupportedFtsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such module: fts5|unknown tokenizer: trigram/i.test(error.message);
}

export function applyMigrations(db: DatabaseSync, filePath: string): void {
  let version = readUserVersion(db);
  const lessonsExisted = tableExists(db, "lessons");
  if (version === 0 && lessonsExisted) {
    version = 1;
  }

  const pending = MIGRATIONS.filter((migration) => migration.version > version);
  if (
    pending.length > 0 &&
    lessonsExisted &&
    fs.existsSync(filePath) &&
    fs.statSync(filePath).size > 0
  ) {
    fs.copyFileSync(filePath, `${filePath}.bak`);
  }

  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      for (const statement of migration.statements) db.exec(statement);
      migration.run?.(db);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  if (readUserVersion(db) >= 2) repairFtsIndex(db);
}
