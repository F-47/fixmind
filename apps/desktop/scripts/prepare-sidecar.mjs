import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = path.resolve(desktopDirectory, "../..");
const sourceDirectory = path.join(
  repositoryDirectory,
  "packages",
  "core",
  "dist",
  "desktop-server",
);
const tauriDirectory = path.join(desktopDirectory, "src-tauri");
const targetTriple = execFileSync("rustc", ["--print", "host-tuple"], {
  encoding: "utf8",
}).trim();
const executableExtension = process.platform === "win32" ? ".exe" : "";
const sourceExecutable = path.join(sourceDirectory, `fixmind-server${executableExtension}`);
const bundledExecutable = path.join(
  tauriDirectory,
  "binaries",
  `fixmind-server-${targetTriple}${executableExtension}`,
);
const bundledDashboard = path.join(tauriDirectory, "resources", "dashboard");

if (!fs.existsSync(sourceExecutable)) {
  throw new Error(`Missing standalone server: ${sourceExecutable}`);
}

fs.mkdirSync(path.dirname(bundledExecutable), { recursive: true });
fs.copyFileSync(sourceExecutable, bundledExecutable);
fs.rmSync(bundledDashboard, { recursive: true, force: true });
fs.cpSync(path.join(sourceDirectory, "dashboard"), bundledDashboard, { recursive: true });

console.log(`Prepared Fixmind sidecar for ${targetTriple}.`);
