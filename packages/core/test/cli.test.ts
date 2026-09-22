import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LAUNCHER_PATH = fileURLToPath(new URL("../src/launcher.js", import.meta.url));

const GOLDEN_HELP_LINES = [
  "fixmind",
  "",
  "Commands:",
  "  fixmind setup [--client codex,claude,cursor] [--scope user|project] [--capture-mode strict|balanced] [--dry-run] [--no-dashboard] [--starter-pack] [--session-start-hook]",
  "  fixmind settings [--capture-mode strict|balanced]",
  "  fixmind memory [query] [--limit 5]",
  "  fixmind dashboard [--port 4317] [--no-open]",
  "  fixmind data status",
  "  fixmind data verify",
  "  fixmind data backup [--output <file>]",
  "  fixmind data restore <backup-file>",
  "  fixmind mcp",
  "  fixmind inject [--limit 5]",
  "  fixmind hooks <claude|cursor> [--scope user|project]",
  "  fixmind diagnose",
  "  fixmind diagnostics",
  "  fixmind insights [--weekly]",
  "  fixmind login [--url <supabase-url> --key <anon-key> --passphrase ...]  (opens browser for GitHub sign in)",
  "  fixmind login --password-login --email ... --password ... --passphrase ...  (email/password instead)",
  "  fixmind logout",
  "  fixmind sync push",
  "  fixmind sync pull",
  "  fixmind sync status",
  "  fixmind save [--title ... --problem ... --mistake ... --root-cause ...]  (interactive template picker; Git autofill from the current diff)",
  "  fixmind save-from-summary [--file lesson.json] < lesson.json",
  "  fixmind list [--limit 20] [--include-superseded]",
  "  fixmind search <query> [--include-superseded]",
  "  fixmind review",
  "  fixmind stats",
  "  fixmind status",
  "  fixmind edit <id> [--title ... --problem ... ...]",
  "  fixmind delete <id> [--yes | -y]",
  '  fixmind supersede <oldId> <newId> [--reason "..."]',
  "  fixmind export [--format json|md|anki] [--output <file>] [--id <id>]",
  "",
  "Options:",
  "  -v, --version  Show the installed CLI version.",
  "  -h, --help     Show this help text.",
  "",
  "Save options:",
  "  --title --original-prompt --problem --mistake --root-cause --fix-summary",
  "  --takeaway --mistake-pattern --when-not-applicable --concepts --files-changed",
  "  --code-example --bad-code-example --good-code-example --code-explanation",
  "  --practice-task --review-question --expected-answer --tool --understanding --tags",
  "",
  "Edit accepts the same field options as save (without --review-question,",
  "--expected-answer, --original-prompt, or --tool). <id> may be the full",
  "lesson id or any unique prefix shown by `fixmind list`.",
  "",
  "Delete requires --yes (or -y) when run outside an interactive terminal.",
  "",
  "Supersede marks <oldId> as superseded by <newId> (linked, never deleted).",
  "Superseded lessons are hidden from `list`/`search` and review by default;",
  "pass --include-superseded to see them. <oldId>/<newId> accept id prefixes.",
  "",
  "Aliases:",
  "  fixmind save-manual -> fixmind save",
  "  fixmind save-ai-summary -> fixmind save-from-summary",
];

const GOLDEN_HELP = `${GOLDEN_HELP_LINES.join("\n")}\n`;

const LESSON_SUMMARY = {
  tool: "cli-test",
  title: "Golden pipeline lesson",
  problem: "The integration test could not find saved lessons after restarting the CLI.",
  mistake:
    "The test pointed each CLI invocation at a different temporary data directory, so no invocation ever saw another one's saved lesson.",
  rootCause:
    "The lesson store resolves its database location from the FIXMIND_DATA_DIR environment variable at process start, so sibling processes only share data when they receive the same value.",
  fixSummary:
    "The test creates one temporary directory and passes the same FIXMIND_DATA_DIR value to every spawned CLI invocation, so all commands read and write the same store.",
  takeaway:
    "Share one data directory across spawned CLI processes when a test relies on commands seeing each other's state.",
  mistakePattern: "Wrong fixture scope",
  whenNotApplicable:
    "Does not apply to tests that intentionally verify isolated per-invocation stores.",
  concepts: ["node:test", "CLI integration tests"],
  filesChanged: ["packages/core/test/cli.test.ts"],
  badCodeExample:
    'await runCli(["save-from-summary", "--file", lessonPath], makeDataDirectory());\nawait runCli(["list"], makeDataDirectory());',
  goodCodeExample:
    'const directory = makeDataDirectory();\nawait runCli(["save-from-summary", "--file", lessonPath], directory);\nawait runCli(["list"], directory);',
  codeExplanation:
    "The first version gives every invocation its own empty store, so list never sees the saved lesson. The second reuses one directory so both commands hit the same database.",
  practiceTask:
    "Write a two-command CLI test where the second command depends on state written by the first.",
  reviewQuestions: [
    {
      question:
        "A spawned-process CLI test saves a lesson in one invocation and finds nothing in the next. What environment detail most likely differs between the invocations?",
      expectedAnswer:
        "Each invocation received a different data directory, so each opened a different store; passing the same FIXMIND_DATA_DIR value makes both hit the same database.",
    },
    {
      question:
        "Why is an isolated temporary data directory still preferable to the default user directory in CLI tests, even when the invocations share it?",
      expectedAnswer:
        "A shared temp directory keeps the test deterministic and prevents it from reading or polluting the developer's real lesson history.",
    },
  ],
  understanding: "understood",
  tags: [{ name: "Node.js child_process", url: "https://nodejs.org/api/child_process.html" }],
};

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[], dataDirectory: string): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [LAUNCHER_PATH, ...args], {
      cwd: dataDirectory,
      env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory },
      timeout: 30_000,
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: failure.code ?? 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

function makeDataDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-cli-"));
}

function readPackageVersion(): string {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const parsed = JSON.parse(fs.readFileSync(packageJsonUrl, "utf8")) as { version?: string };
  return parsed.version ?? "unknown";
}

test("--help prints the golden help text", async () => {
  const directory = makeDataDirectory();
  const result = await runCli(["--help"], directory);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, GOLDEN_HELP);
});

test("no arguments prints the same help text", async () => {
  const directory = makeDataDirectory();
  const result = await runCli([], directory);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, GOLDEN_HELP);
});

test("--version prints the installed package version", async () => {
  const directory = makeDataDirectory();
  const result = await runCli(["--version"], directory);
  assert.equal(result.code, 0);
  assert.equal(result.stdout, `${readPackageVersion()}\n`);
});

test("unknown command exits 1 with guidance", async () => {
  const directory = makeDataDirectory();
  const result = await runCli(["bogus"], directory);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Unknown command: bogus\. Run fixmind --help for usage\./);
});

test("read-only commands work against an empty store", async () => {
  const directory = makeDataDirectory();

  const list = await runCli(["list"], directory);
  assert.equal(list.code, 0);
  assert.equal(list.stdout, "No lessons found.\n");

  const status = await runCli(["status"], directory);
  assert.equal(status.code, 0);
  assert.equal(status.stdout, "Fixmind: no lessons due for review.\n");

  const stats = await runCli(["stats"], directory);
  assert.equal(stats.code, 0);
  assert.match(stats.stdout, /Repeated concepts/);
  assert.match(stats.stdout, /Repeated mistakes/);
  assert.match(stats.stdout, /No data yet\./);

  const diagnose = await runCli(["diagnose"], directory);
  assert.equal(diagnose.code, 0);
  assert.ok(diagnose.stdout.trim().length > 0);

  const review = await runCli(["review"], directory);
  assert.equal(review.code, 1);
  assert.match(review.stderr, /The review command requires an interactive terminal\./);

  const search = await runCli(["search"], directory);
  assert.equal(search.code, 1);
  assert.match(search.stderr, /Usage: fixmind search <query>/);
});

test("save-from-summary, list, search, export, and delete flow", async () => {
  const directory = makeDataDirectory();
  const lessonPath = path.join(directory, "lesson.json");
  fs.writeFileSync(lessonPath, JSON.stringify(LESSON_SUMMARY), "utf8");

  const save = await runCli(["save-from-summary", "--file", lessonPath], directory);
  assert.equal(save.code, 0, save.stderr);
  const lessonId = save.stdout.match(/Saved lesson ([\da-f-]{36}):/)?.[1];
  assert.ok(lessonId, `expected a saved lesson id in: ${save.stdout}`);

  const list = await runCli(["list"], directory);
  assert.equal(list.code, 0);
  assert.match(list.stdout, /Golden pipeline lesson/);

  const search = await runCli(["search", "pipeline"], directory);
  assert.equal(search.code, 0);
  assert.match(search.stdout, /Golden pipeline lesson/);

  const exported = await runCli(["export", "--format", "md"], directory);
  assert.equal(exported.code, 0);
  assert.match(exported.stdout, /# Golden pipeline lesson/);
  assert.match(exported.stdout, /## Problem/);

  const deleted = await runCli(["delete", lessonId, "--yes"], directory);
  assert.equal(deleted.code, 0);
  assert.match(deleted.stdout, new RegExp(`Deleted lesson ${lessonId}: Golden pipeline lesson`));

  const emptyList = await runCli(["list"], directory);
  assert.equal(emptyList.code, 0);
  assert.equal(emptyList.stdout, "No lessons found.\n");
});

test("save-from-summary rejects invalid JSON", async () => {
  const directory = makeDataDirectory();
  const lessonPath = path.join(directory, "lesson.json");
  fs.writeFileSync(lessonPath, "{not json", "utf8");

  const result = await runCli(["save-from-summary", "--file", lessonPath], directory);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invalid JSON:/);
});

test("delete without an id exits 1 with usage", async () => {
  const directory = makeDataDirectory();
  const result = await runCli(["delete"], directory);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /Usage: fixmind delete <id> \[--yes\]/);
});
