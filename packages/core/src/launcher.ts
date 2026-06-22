#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cli.js");
const result = spawnSync(
  process.execPath,
  ["--no-warnings", cliPath, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
