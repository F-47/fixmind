import os from "node:os";
import path from "node:path";

export function dataDirectory(): string {
  return process.env.FIXMIND_DATA_DIR
    ? path.resolve(process.env.FIXMIND_DATA_DIR)
    : path.join(os.homedir(), ".fixmind");
}

export function databasePath(): string {
  return path.join(dataDirectory(), "learning.db");
}

export function configPath(): string {
  return path.join(dataDirectory(), "config.json");
}
