import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicPackageManifest,
  requirePublicPaths,
  validateCandidatePaths,
} from "./public-export-policy.mjs";

const repositoryRoot = realpathSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
);

function parseArguments(arguments_) {
  let destination;
  let allowDirty = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--allow-dirty") {
      allowDirty = true;
      continue;
    }
    if (argument === "--destination") {
      destination = arguments_[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!destination) {
    throw new Error(
      "Usage: node scripts/export-public.mjs --destination <empty-path> [--allow-dirty]",
    );
  }
  return { allowDirty, destination: path.resolve(destination) };
}

function git(arguments_) {
  return execFileSync("git", arguments_, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function listCandidatePaths(includeUntracked) {
  const arguments_ = ["ls-files", "--cached"];
  if (includeUntracked) arguments_.push("--others", "--exclude-standard");
  arguments_.push("-z");
  return execFileSync("git", arguments_, { cwd: repositoryRoot, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .sort();
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function assertDestinationIsSafe(destination) {
  const relative = path.relative(repositoryRoot, destination);
  if (!relative || relative === ".")
    throw new Error("The export destination cannot be the repository root.");
  if (existsSync(destination)) throw new Error(`Export destination already exists: ${destination}`);
}

const { allowDirty, destination } = parseArguments(process.argv.slice(2));
const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
if (status && !allowDirty) {
  throw new Error("Refusing to export a dirty working tree. Commit the reviewed snapshot first.");
}

assertDestinationIsSafe(destination);
const candidates = listCandidatePaths(allowDirty);
requirePublicPaths(candidates);
const classifications = validateCandidatePaths(candidates);
const publicPaths = candidates.filter(
  (candidatePath) => classifications.get(candidatePath) === "public",
);

mkdirSync(destination, { recursive: false });
for (const relativePath of publicPaths) {
  const sourcePath = path.join(repositoryRoot, ...relativePath.split("/"));
  const sourceStats = lstatSync(sourcePath);
  if (!sourceStats.isFile())
    throw new Error(`Public export only supports regular files: ${relativePath}`);

  const destinationPath = path.join(destination, ...relativePath.split("/"));
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
}

const packageManifestPath = path.join(destination, "package.json");
const sourcePackageManifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
writeFileSync(
  packageManifestPath,
  `${JSON.stringify(createPublicPackageManifest(sourcePackageManifest), null, 2)}\n`,
  "utf8",
);

const manifestFiles = publicPaths.map((relativePath) => ({
  path: relativePath,
  sha256: sha256(path.join(destination, ...relativePath.split("/"))),
}));

const manifest = {
  schemaVersion: 1,
  sourceCommit: git(["rev-parse", "HEAD"]),
  dirtyWorkingTree: Boolean(status),
  fileCount: manifestFiles.length,
  files: manifestFiles,
};
writeFileSync(
  path.join(destination, ".fixmind-public-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`Exported ${manifestFiles.length} public files to ${destination}.`);
if (status) console.log("Rehearsal only: the source working tree was dirty.");
