import fs from "node:fs";

export function readInstalledVersion(): string {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const raw = fs.readFileSync(packageJsonUrl, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? "unknown";
}
