import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { backupDatabase, restoreDatabase, verifyDatabase } from "../src/data-management.js";

function makeDatabase(filePath: string, value: string): void {
  const db = new DatabaseSync(filePath);
  db.exec("CREATE TABLE state (value TEXT NOT NULL)");
  db.prepare("INSERT INTO state(value) VALUES (?)").run(value);
  db.close();
}

test("database backup and restore preserve a known-good lesson store", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-data-management-"));
  const database = path.join(directory, "learning.db");
  const backup = path.join(directory, "manual-backup.db");
  makeDatabase(database, "before");

  try {
    assert.equal(verifyDatabase(database).detail, "ok");
    assert.equal(backupDatabase(backup, database), backup);

    const changed = new DatabaseSync(database);
    changed.prepare("UPDATE state SET value = 'after'").run();
    changed.close();

    const previous = restoreDatabase(backup, database);
    assert.ok(fs.existsSync(previous));
    const restored = new DatabaseSync(database);
    assert.equal(restored.prepare("SELECT value FROM state").get()?.value, "before");
    restored.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("corrupt backups are rejected before replacing the current database", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-data-corrupt-"));
  const database = path.join(directory, "learning.db");
  const backup = path.join(directory, "corrupt.db");
  makeDatabase(database, "safe");
  fs.writeFileSync(backup, "not sqlite", "utf8");

  try {
    assert.throws(
      () => restoreDatabase(backup, database),
      /integrity check|malformed|not a database/i,
    );
    const current = new DatabaseSync(database);
    assert.equal(current.prepare("SELECT value FROM state").get()?.value, "safe");
    current.close();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
