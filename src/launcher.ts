#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "cli.js",
);

const result = spawnSync(
  process.execPath,
  ["--disable-warning=ExperimentalWarning", cliPath, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(
    `Failed to start Fixmind: ${result.error.message}`,
  );
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
