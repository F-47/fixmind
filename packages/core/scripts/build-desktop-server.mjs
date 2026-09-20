import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(packageDirectory, "dist", "desktop-server");
const bundlePath = path.join(outputDirectory, "server.cjs");
const blobPath = path.join(outputDirectory, "server.blob");
const executablePath = path.join(
  outputDirectory,
  process.platform === "win32" ? "fixmind-server.exe" : "fixmind-server",
);
const configPath = path.join(outputDirectory, "sea-config.json");

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

await build({
  entryPoints: [path.join(packageDirectory, "dist", "src", "desktop-server-bundle.js")],
  outfile: bundlePath,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: false,
});

fs.writeFileSync(
  configPath,
  `${JSON.stringify(
    {
      main: bundlePath,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    },
    null,
    2,
  )}\n`,
);

runCommand(process.execPath, ["--experimental-sea-config", configPath]);
fs.copyFileSync(process.execPath, executablePath);

const require = createRequire(import.meta.url);
const postjectPath = path.join(
  path.dirname(require.resolve("postject/package.json")),
  "dist",
  "cli.js",
);
runCommand(process.execPath, [
  postjectPath,
  executablePath,
  "NODE_SEA_BLOB",
  blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
]);

fs.cpSync(
  path.join(packageDirectory, "dist", "dashboard"),
  path.join(outputDirectory, "dashboard"),
  {
    recursive: true,
  },
);

console.log(`Built ${executablePath}`);

function runCommand(command, args) {
  const commandResult = spawnSync(command, args, { cwd: packageDirectory, stdio: "inherit" });
  if (commandResult.error) throw commandResult.error;
  if (commandResult.status !== 0) {
    throw new Error(
      `${path.basename(command)} exited with code ${commandResult.status ?? "unknown"}.`,
    );
  }
}
