import { backupDatabase, dataStatus, restoreDatabase, verifyDatabase } from "../data-management.js";
import type { CommandDefinition } from "./registry.js";

export const dataCommand: CommandDefinition = {
  names: ["data"],
  usage: [
    "  fixmind data status",
    "  fixmind data verify",
    "  fixmind data backup [--output <file>]",
    "  fixmind data restore <backup-file>",
  ],
  kind: "standalone",
  run: ({ options, positionals }) => runDataCommand(options, positionals),
};

function runDataCommand(options: Record<string, string | boolean>, positionals: string[]): void {
  const action = positionals[0] ?? "status";
  if (action === "status") {
    printDataStatus();
    return;
  }
  if (action === "verify") {
    verifyData();
    return;
  }
  if (action === "backup") {
    createDataBackup(options);
    return;
  }
  if (action === "restore") {
    restoreDataBackup(positionals[1]);
    return;
  }
  throw new Error(`Unknown data action: ${action}. Run fixmind data --help for usage.`);
}

function printDataStatus(): void {
  const status = dataStatus();
  console.log(`Data directory: ${status.directory}`);
  console.log(`Database: ${status.database.filePath}`);
  console.log(`Integrity: ${status.database.detail}`);
}

function verifyData(): void {
  const integrity = verifyDatabase();
  if (!integrity.ok) throw new Error(`Database integrity check failed: ${integrity.detail}`);
  console.log(`Database integrity: ${integrity.detail}`);
}

function createDataBackup(options: Record<string, string | boolean>): void {
  const output = typeof options.output === "string" ? options.output : undefined;
  console.log(`Created backup: ${backupDatabase(output)}`);
}

function restoreDataBackup(backupPath: string | undefined): void {
  if (!backupPath) throw new Error("Usage: fixmind data restore <backup-file>");
  console.log(`Restored database. Previous copy: ${restoreDatabase(backupPath)}`);
}
