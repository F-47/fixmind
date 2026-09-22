import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath, dataDirectory } from "./paths.js";

export interface DatabaseIntegrity {
  filePath: string;
  ok: boolean;
  detail: string;
}

export function verifyDatabase(filePath = databasePath()): DatabaseIntegrity {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    return { filePath: resolved, ok: true, detail: "Database does not exist yet." };
  }

  const db = new DatabaseSync(resolved, { readOnly: true });
  try {
    const row = db.prepare("PRAGMA integrity_check").get() as unknown as {
      integrity_check: string;
    };
    const detail = row.integrity_check;
    return { filePath: resolved, ok: detail === "ok", detail };
  } finally {
    db.close();
  }
}

export function backupDatabase(outputPath?: string, sourcePath = databasePath()): string {
  const source = path.resolve(sourcePath);
  if (!fs.existsSync(source)) throw new Error(`Database does not exist: ${source}`);
  const destination = path.resolve(outputPath ?? `${source}.backup-${fileTimestamp()}.db`);
  if (fs.existsSync(destination)) throw new Error(`Backup already exists: ${destination}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return destination;
}

export function restoreDatabase(backupPath: string, targetPath = databasePath()): string {
  const backup = path.resolve(backupPath);
  const target = path.resolve(targetPath);
  if (!fs.existsSync(backup)) throw new Error(`Backup does not exist: ${backup}`);
  const integrity = verifyDatabase(backup);
  if (!integrity.ok) throw new Error(`Backup failed integrity check: ${integrity.detail}`);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const previous = fs.existsSync(target)
    ? `${target}.before-restore-${fileTimestamp()}.bak`
    : undefined;
  if (previous) fs.copyFileSync(target, previous);

  const temporary = `${target}.restore-${randomUUID()}.tmp`;
  try {
    fs.copyFileSync(backup, temporary);
    if (fs.existsSync(target)) fs.rmSync(target);
    fs.renameSync(temporary, target);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
    throw error;
  }
  return previous ?? target;
}

function fileTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function dataStatus(): { directory: string; database: DatabaseIntegrity } {
  return { directory: dataDirectory(), database: verifyDatabase() };
}
