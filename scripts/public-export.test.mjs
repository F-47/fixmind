import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  classifyPublicExportPath,
  createPublicPackageManifest,
  requirePublicPaths,
  validateCandidatePaths,
} from "./public-export-policy.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("classifies representative public, private, and removed paths", () => {
  assert.equal(classifyPublicExportPath("packages/core/src/sync.ts"), "public");
  assert.equal(classifyPublicExportPath("docs/commercial-service-boundary.md"), "public");
  assert.equal(classifyPublicExportPath("THIRD_PARTY_NOTICES.md"), "public");
  assert.equal(classifyPublicExportPath("supabase/schema.sql"), "private");
  assert.equal(classifyPublicExportPath("OPEN-SOURCE-COMMERCIAL-PLAN.md"), "private");
  assert.equal(classifyPublicExportPath("skills-lock.json"), "remove");
  assert.equal(classifyPublicExportPath("apps/website/AGENTS.md"), "remove");
  assert.equal(classifyPublicExportPath("apps/website/CLAUDE.md"), "remove");
  assert.equal(classifyPublicExportPath("unexpected.txt"), "unclassified");
});

test("every tracked or proposed working-tree path has an explicit classification", () => {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  const paths = output.split("\0").filter(Boolean);

  assert.doesNotThrow(() => validateCandidatePaths(paths));
});

test("rejects unsafe and unclassified candidate paths", () => {
  assert.throws(() => validateCandidatePaths(["../outside.txt"]), /Unsafe path/);
  assert.throws(() => validateCandidatePaths(["new-root-file.txt"]), /Unclassified path/);
});

test("rejects an export missing a required public file", () => {
  assert.throws(() => requirePublicPaths(["README.md", "package.json"]), /LICENSE/);
});

test("removes private-service commands from the public package manifest", () => {
  const source = {
    name: "fixmind-monorepo",
    scripts: {
      test: "npm run test -w fixmind",
      "test:sync-policy": "node supabase/tests/run-policy-tests.mjs",
    },
  };

  const publicManifest = createPublicPackageManifest(source);

  assert.equal(publicManifest.scripts.test, source.scripts.test);
  assert.equal(publicManifest.scripts["test:sync-policy"], undefined);
  assert.equal(source.scripts["test:sync-policy"], "node supabase/tests/run-policy-tests.mjs");
});

test("exports public files and omits private service material", () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "fixmind-public-export-test-"));
  const destination = path.join(temporaryRoot, "repository");

  try {
    execFileSync(
      process.execPath,
      ["scripts/export-public.mjs", "--destination", destination, "--allow-dirty"],
      { cwd: repositoryRoot, stdio: "pipe" },
    );

    assert.equal(readFileSync(path.join(destination, "README.md"), "utf8").length > 0, true);
    assert.equal(
      readFileSync(path.join(destination, "package.json"), "utf8").includes("test:sync-policy"),
      false,
    );
    assert.throws(() => readFileSync(path.join(destination, "supabase", "schema.sql"), "utf8"), {
      code: "ENOENT",
    });

    const exportManifest = JSON.parse(
      readFileSync(path.join(destination, ".fixmind-public-manifest.json"), "utf8"),
    );
    assert.equal(exportManifest.schemaVersion, 1);
    assert.equal(
      exportManifest.files.some(({ path: filePath }) => filePath.startsWith("supabase/")),
      false,
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
