import { spawnSync } from "node:child_process";
import { delimiter } from "node:path";

function deduplicatePath(environment) {
  const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === "path");
  if (!pathKey) return environment;

  const uniqueEntries = [];
  const seenEntries = new Set();
  for (const entry of environment[pathKey].split(delimiter)) {
    const normalizedEntry = entry.toLowerCase();
    if (!entry || seenEntries.has(normalizedEntry)) continue;
    seenEntries.add(normalizedEntry);
    uniqueEntries.push(entry);
  }

  return { ...environment, [pathKey]: uniqueEntries.join(delimiter) };
}

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) throw new Error("npm_execpath is required to build the desktop server.");

const coreBuild = spawnSync(process.execPath, [npmCliPath, "run", "build"], {
  env: deduplicatePath(process.env),
  stdio: "inherit",
});
if (coreBuild.error) throw coreBuild.error;
if (coreBuild.status !== 0) {
  throw new Error(`Core build exited with code ${coreBuild.status ?? "unknown"}.`);
}

await import("./build-desktop-server.mjs");
