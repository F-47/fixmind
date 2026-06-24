import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const repoRoot = resolve(packageRoot, "..", "..");
const sourceDocs = resolve(repoRoot, "docs");
const targetDocs = resolve(packageRoot, "docs");

mkdirSync(targetDocs, { recursive: true });

for (const file of ["mcp-integration.md", "sync-setup.md"]) {
  cpSync(resolve(sourceDocs, file), resolve(targetDocs, file));
}
