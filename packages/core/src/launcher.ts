#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MINIMUM_NODE_VERSION = "22.13.0";

export function nodeVersionSatisfiesMinimum(
  version: string,
  minimum: string = MINIMUM_NODE_VERSION,
): boolean {
  const currentParts = version.replace(/^v/, "").split(".").map(Number);
  const minimumParts = minimum.replace(/^v/, "").split(".").map(Number);

  for (let index = 0; index < 3; index++) {
    const current = currentParts[index] ?? 0;
    const required = minimumParts[index] ?? 0;
    if (current > required) return true;
    if (current < required) return false;
  }

  return true;
}

export function unsupportedNodeMessage(version: string): string {
  return [
    `fixmind requires Node.js ${MINIMUM_NODE_VERSION} or newer.`,
    `You are using ${version}.`,
    "",
    "Please upgrade Node and run `npx fixmind setup` again.",
    "Download Node from https://nodejs.org or install Node 24 LTS.",
  ].join("\n");
}

export function runLauncher(): void {
  if (!nodeVersionSatisfiesMinimum(process.version)) {
    console.error(unsupportedNodeMessage(process.version));
    process.exitCode = 1;
    return;
  }

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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLauncher();
}
