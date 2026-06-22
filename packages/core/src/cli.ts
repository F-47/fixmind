#!/usr/bin/env node
import fs from "node:fs";
import { stdin, stdout } from "node:process";
import { parseArgs as nodeParseArgs } from "node:util";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { lessonsToJson, lessonsToMarkdown } from "./export.js";
import { readGitContext } from "./git.js";
import {
  createLessonStore,
  initializeDataDirectory,
  type LessonStore,
} from "./storage.js";
import type { Lesson, LessonInput, ReviewQuestion, Understanding } from "./types.js";
import { assessLessonQuality, validateLessonInput } from "./validation.js";
import { isAddressInUseError, parseArgs as parseCliArgs } from "./cli-utils.js";
import {
  loginCommand as runLoginCommand,
  logoutCommand as runLogoutCommand,
  setup as runSetupCommand,
  syncCommand as runSyncCommand,
} from "./cli-sync.js";

const common = { input: stdin, output: stdout };

function readInstalledVersion(): string {
  const packageJsonUrl = new URL("../../package.json", import.meta.url);
  const raw = fs.readFileSync(packageJsonUrl, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version ?? "unknown";
}

const VERSION = readInstalledVersion();

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) { cancel("Operation cancelled."); process.exit(0); }
  return value as T;
}

function terminalLink(text: string, url: string): string {
  const esc = "\x1b";
  return `${esc}]8;;${url}\u0007${text}${esc}]8;;\u0007`;
}

function optionString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberOption(value: string | boolean | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error("--limit must be a positive integer.");
  return parsed;
}

function optionalPort(value: string | boolean | undefined): number | undefined {
  if (value === undefined) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("--port must be an integer from 0 to 65535.");
  return port;
}

function parseList(value?: string): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function formatLessonList(lessons: Lesson[]): string {
  if (lessons.length === 0) return "No lessons found.";
  return lessons.map((lesson) => {
    const concepts = lesson.concepts.join(", ") || "none";
    const suffix = lesson.status === "superseded" ? " [superseded]" : "";
    return [
      `${lesson.id.slice(0, 8)}  ${lesson.title}${suffix}`,
      `  concepts: ${concepts}`,
      `  understanding: ${lesson.understanding} | next review: ${formatDate(lesson.nextReviewAt)}`,
    ].join("\n");
  }).join("\n\n");
}

interface ParsedArgs {
  command?: string;
  positionals: string[];
  options: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.options.version) {
    console.log(VERSION);
    return;
  }

  if (!args.command || args.options.help) {
    printHelp();
    return;
  }

  if (args.command === "mcp") {
    const { startMcpServer } = await import("./mcp.js");
    await startMcpServer();
    return;
  }

  if (args.command === "setup") {
    await runSetupCommand(args.options);
    return;
  }

  if (args.command === "login") {
    await runLoginCommand(args.options);
    return;
  }

  if (args.command === "logout") {
    await runLogoutCommand();
    return;
  }

  if (args.command === "sync") {
    await runSyncCommand(args.positionals[0]);
    return;
  }

  if (args.command === "dashboard") {
    const { startDashboard } = await import("./dashboard.js");
    try {
      const handle = await startDashboard({
        port: optionalPort(args.options.port),
        open: !args.options["no-open"],
      });
      console.log(`Fixmind dashboard: ${handle.url}`);
      console.log("Press Ctrl+C to stop.");
    } catch (error) {
      if (isAddressInUseError(error)) {
        throw new Error(
          `Dashboard port is already in use. Run \`fixmind dashboard --port <different-port>\` or stop the process using 127.0.0.1:${optionalPort(args.options.port) ?? 4317}.`,
        );
      }
      throw error;
    }
    return;
  }

  initializeDataDirectory();
  const store = createLessonStore();
  try {
    switch (args.command) {
      case "save-manual":
      case "save":
        await saveLesson(store, args.options);
        break;
      case "save-ai-summary":
      case "save-from-summary":
        await saveLessonFromSummary(store, args.options);
        break;
      case "list": {
        const includeSuperseded = Boolean(args.options["include-superseded"]);
        const lessons = store.list(numberOption(args.options.limit, 20))
          .filter((lesson) => includeSuperseded || lesson.status !== "superseded");
        console.log(formatLessonList(lessons));
        break;
      }
      case "search": {
        const query = args.positionals.join(" ").trim();
        if (!query) throw new Error("Usage: fixmind search <query>");
        console.log(formatLessonList(store.search(query, {
          includeSuperseded: Boolean(args.options["include-superseded"]),
        })));
        break;
      }
      case "review":
        await review(store);
        break;
      case "stats":
        showStats(store);
        break;
      case "status":
        showStatus(store);
        break;
      case "delete": {
        const id = args.positionals[0];
        if (!id) throw new Error("Usage: fixmind delete <id> [--yes]");
        await deleteLesson(store, id, args.options);
        break;
      }
      case "edit": {
        const id = args.positionals[0];
        if (!id) throw new Error("Usage: fixmind edit <id> [--title ... --problem ...]");
        await editLesson(store, id, args.options);
        break;
      }
      case "supersede": {
        const oldId = args.positionals[0];
        const newId = args.positionals[1];
        if (!oldId || !newId) {
          throw new Error('Usage: fixmind supersede <oldId> <newId> [--reason "..."]');
        }
        supersedeLesson(store, oldId, newId, args.options);
        break;
      }
      case "export":
        exportLessons(store, args.options);
        break;
      default:
        throw new Error(
          `Unknown command: ${args.command}. Run fixmind --help for usage.`,
        );
    }
  } finally {
    store.close();
  }
}

async function saveLesson(
  store: LessonStore,
  options: Record<string, string | boolean>,
): Promise<void> {
  const git = readGitContext();
  const interactive = stdin.isTTY && stdout.isTTY;

  if (interactive) {
    intro("Save a learning lesson", common);
    note("Save the reusable lesson, not just the one-off bug report.", "Focus", common);
  }

  const get = async (key: string, label: string, fallback = ""): Promise<string> => {
    const supplied = optionString(options[key]);
    if (supplied !== undefined) return supplied;
    if (!interactive) return fallback;
    return unwrap(await text({ message: label, defaultValue: fallback || undefined, ...common }));
  };

  if (git.stat) {
    if (interactive) {
      note(git.stat, "Working tree changes", common);
    } else {
      console.log(`Detected working tree changes:\n${git.stat}\n`);
    }
  }
  const reviewQuestion = await get("review-question", "Review question");
  const input = validateLessonInput({
    tool: optionString(options.tool) ?? "manual",
    projectPath: process.cwd(),
    title: await get("title", "Title"),
    originalPrompt: await get("original-prompt", "Original prompt"),
    problem: await get("problem", "Problem"),
    mistake: await get("mistake", "Mistake"),
    rootCause: await get("root-cause", "Root cause"),
    fixSummary: await get("fix-summary", "Fix summary"),
    takeaway: await get("takeaway", "One-sentence takeaway"),
    mistakePattern: await get("mistake-pattern", "Short mistake pattern"),
    whenNotApplicable: await get(
      "when-not-applicable",
      "When this advice doesn't apply",
    ),
    concepts: parseList(await get("concepts", "Concepts (comma-separated)")),
    filesChanged: parseList(
      await get(
        "files-changed",
        "Files changed (comma-separated)",
        git.filesChanged.join(","),
      ),
    ),
    codeExample: await get("code-example", "Small code example"),
    badCodeExample: await get(
      "bad-code-example",
      "Minimal wrong code example",
    ),
    goodCodeExample: await get(
      "good-code-example",
      "Minimal corrected code example",
    ),
    codeExplanation: await get(
      "code-explanation",
      "Why the corrected example works",
    ),
    practiceTask: await get("practice-task", "Small practice task"),
    reviewQuestions: [
      {
        question: reviewQuestion,
        expectedAnswer: await get("expected-answer", "Expected answer"),
      },
    ],
    understanding: optionString(options.understanding) ?? "unknown",
    sourceDiff: git.sourceDiff,
    tags: parseList(await get("tags", "Tags (comma-separated)")).map((name) => ({ name })),
  });
  const saved = store.save(input);
  const { autoPushAfterSave } = await import("./sync.js");
  await autoPushAfterSave(store);
  if (interactive) {
    outro(`Saved lesson ${saved.id}: ${saved.title}`, common);
  } else {
    console.log(`Saved lesson ${saved.id}: ${saved.title}`);
  }
}

async function saveLessonFromSummary(
  store: LessonStore,
  options: Record<string, string | boolean>,
): Promise<void> {
  const file = optionString(options.file);
  const raw = file ? fs.readFileSync(file, "utf8") : await readStdin();
  if (!raw.trim())
    throw new Error(
      "No JSON input received. Pipe JSON to stdin or pass --file <path>.",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const input = validateLessonInput(parsed);
  input.projectPath ??= process.cwd();

  const quality = assessLessonQuality(input);
  if (quality.errors.length > 0) {
    throw new Error(
      [
        "This lesson was not saved - it doesn't look like a learning-worthy fix yet:",
        ...quality.errors.map((message) => `- ${message}`),
      ].join("\n"),
    );
  }

  const saved = store.save(input);
  const { autoPushAfterSave } = await import("./sync.js");
  await autoPushAfterSave(store);
  console.log(`Saved lesson ${saved.id}: ${saved.title}`);
  for (const warning of quality.warnings) console.log(warning);
}

async function review(store: LessonStore): Promise<void> {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("The review command requires an interactive terminal.");
  }
  const due = store.due();
  if (due.length === 0) {
    console.log("No lessons are due for review.");
    return;
  }

  intro("Review learning lessons", common);
  log.info(`${due.length} lesson(s) due.`, common);
  for (const lesson of due) {
    note(
      `Problem: ${lesson.problem}\nTakeaway: ${lesson.takeaway ?? lesson.fixSummary}`,
      lesson.title,
      common,
    );
    const questions: ReviewQuestion[] = [];
    for (const question of lesson.reviewQuestions) {
      const answer = unwrap(await text({
        message: `${question.question}\nYour answer (or "skip")`,
        ...common,
      }));
      const skipped = answer.toLocaleLowerCase() === "skip";
      questions.push({
        ...question,
        userAnswer: skipped ? undefined : answer,
        status: skipped ? "skipped" : "answered",
      });
      if (!skipped) {
        log.info(`Expected: ${question.expectedAnswer}`, common);
      }
    }
    const understanding = await askUnderstanding();
    const updated = store.updateReview(lesson.id, questions, understanding);
    log.info(`Review saved. Next review: ${updated.nextReviewAt}`, common);
  }
  outro("Review session complete.", common);
}

async function askUnderstanding(): Promise<Understanding> {
  return unwrap(await select({
    message: "How well do you understand this lesson now?",
    options: [
      {
        value: "understood",
        label: "I understand it",
        hint: "I can explain the rule and apply it elsewhere.",
      },
      {
        value: "partial",
        label: "I partly understand it",
        hint: "I get the shape but still need practice.",
      },
      {
        value: "copied_blindly",
        label: "I need more practice",
        hint: "I can repeat the fix but not generalize it yet.",
      },
    ],
    initialValue: "partial",
    ...common,
  }));
}

function showStats(store: LessonStore): void {
  const concepts = store.conceptStats();
  const mistakes = store.mistakeStats();
  console.log("Repeated concepts");
  console.log(
    concepts.length
      ? concepts.map((item) => `${item.name}: ${item.count} time(s)`).join("\n")
      : "No data yet.",
  );
  console.log("\nRepeated mistakes");
  console.log(
    mistakes.length
      ? mistakes
          .map((item) => `${item.mistake}: ${item.count} time(s)`)
          .join("\n")
      : "No data yet.",
  );
}

function showStatus(store: LessonStore): void {
  const due = store.due();
  console.log(due.length === 0
    ? "Fixmind: no lessons due for review."
    : `Fixmind: ${due.length} lesson(s) due for review. Run \`fixmind review\`.`);
}

function findLesson(store: LessonStore, idOrPrefix: string): Lesson {
  const exact = store.get(idOrPrefix);
  if (exact) return exact;

  const matches = store
    .list(Number.MAX_SAFE_INTEGER)
    .filter((lesson) => lesson.id.startsWith(idOrPrefix));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(
      `"${idOrPrefix}" matches ${matches.length} lessons. Use a longer id prefix.`,
    );
  }
  throw new Error(`Lesson not found: ${idOrPrefix}`);
}

async function deleteLesson(
  store: LessonStore,
  idOrPrefix: string,
  options: Record<string, string | boolean>,
): Promise<void> {
  const lesson = findLesson(store, idOrPrefix);
  const interactive = stdin.isTTY && stdout.isTTY;

  let confirmed = Boolean(options.yes);
  if (!confirmed && interactive) {
    confirmed = unwrap(await confirm({
      message: `Delete "${lesson.title}"? This cannot be undone.`,
      initialValue: false,
      ...common,
    }));
  }

  if (!confirmed) {
    if (!interactive) {
      throw new Error(
        `Refusing to delete without confirmation. Re-run with --yes: fixmind delete ${idOrPrefix} --yes`,
      );
    }
    console.log("Cancelled.");
    return;
  }

  store.delete(lesson.id);
  console.log(`Deleted lesson ${lesson.id}: ${lesson.title}`);
}

async function editLesson(
  store: LessonStore,
  idOrPrefix: string,
  options: Record<string, string | boolean>,
): Promise<void> {
  const lesson = findLesson(store, idOrPrefix);
  const interactive = stdin.isTTY && stdout.isTTY;

  if (interactive) {
    intro(`Edit lesson: ${lesson.title}`, common);
    note("Press Enter to keep the current value.", "Tip", common);
  }

  const get = async (key: string, label: string, current: string): Promise<string | undefined> => {
    const supplied = optionString(options[key]);
    if (supplied !== undefined) return supplied;
    if (!interactive) return undefined;
    return unwrap(await text({ message: label, defaultValue: current, ...common }));
  };

  const partial: Partial<LessonInput> = {};

  const title = await get("title", "Title", lesson.title);
  if (title !== undefined) partial.title = title;

  const problem = await get("problem", "Problem", lesson.problem);
  if (problem !== undefined) partial.problem = problem;

  const mistake = await get("mistake", "Mistake", lesson.mistake);
  if (mistake !== undefined) partial.mistake = mistake;

  const rootCause = await get("root-cause", "Root cause", lesson.rootCause);
  if (rootCause !== undefined) partial.rootCause = rootCause;

  const fixSummary = await get("fix-summary", "Fix summary", lesson.fixSummary);
  if (fixSummary !== undefined) partial.fixSummary = fixSummary;

  const takeaway = await get("takeaway", "One-sentence takeaway", lesson.takeaway ?? "");
  if (takeaway !== undefined) partial.takeaway = takeaway;

  const mistakePattern = await get(
    "mistake-pattern",
    "Short mistake pattern",
    lesson.mistakePattern ?? "",
  );
  if (mistakePattern !== undefined) partial.mistakePattern = mistakePattern;

  const whenNotApplicable = await get(
    "when-not-applicable",
    "When this advice doesn't apply",
    lesson.whenNotApplicable ?? "",
  );
  if (whenNotApplicable !== undefined) partial.whenNotApplicable = whenNotApplicable;

  const codeExample = await get("code-example", "Small code example", lesson.codeExample ?? "");
  if (codeExample !== undefined) partial.codeExample = codeExample;

  const badCodeExample = await get(
    "bad-code-example",
    "Minimal wrong code example",
    lesson.badCodeExample ?? "",
  );
  if (badCodeExample !== undefined) partial.badCodeExample = badCodeExample;

  const goodCodeExample = await get(
    "good-code-example",
    "Minimal corrected code example",
    lesson.goodCodeExample ?? "",
  );
  if (goodCodeExample !== undefined) partial.goodCodeExample = goodCodeExample;

  const codeExplanation = await get(
    "code-explanation",
    "Why the corrected example works",
    lesson.codeExplanation ?? "",
  );
  if (codeExplanation !== undefined) partial.codeExplanation = codeExplanation;

  const practiceTask = await get(
    "practice-task",
    "Small practice task",
    lesson.practiceTask ?? "",
  );
  if (practiceTask !== undefined) partial.practiceTask = practiceTask;

  const concepts = await get(
    "concepts",
    "Concepts (comma-separated)",
    lesson.concepts.join(", "),
  );
  if (concepts !== undefined) partial.concepts = parseList(concepts);

  const filesChanged = await get(
    "files-changed",
    "Files changed (comma-separated)",
    lesson.filesChanged.join(", "),
  );
  if (filesChanged !== undefined) partial.filesChanged = parseList(filesChanged);

  const tags = await get(
    "tags",
    "Tags (comma-separated)",
    lesson.tags.map((tag) => tag.name).join(", "),
  );
  if (tags !== undefined) partial.tags = parseList(tags).map((name) => ({ name }));

  const understanding = optionString(options.understanding);
  if (understanding !== undefined) partial.understanding = understanding as Understanding;

  const updated = store.update(lesson.id, partial);
  if (interactive) {
    outro(`Updated lesson ${updated.id}: ${updated.title}`, common);
  } else {
    console.log(`Updated lesson ${updated.id}: ${updated.title}`);
  }
}

function supersedeLesson(
  store: LessonStore,
  oldIdPrefix: string,
  newIdPrefix: string,
  options: Record<string, string | boolean>,
): void {
  const oldLesson = findLesson(store, oldIdPrefix);
  const newLesson = findLesson(store, newIdPrefix);
  const reason = optionString(options.reason);

  store.supersede(oldLesson.id, newLesson.id, reason);
  console.log(
    `Superseded ${oldLesson.id} -> ${newLesson.id}${reason ? `: ${reason}` : ""}`,
  );
}

function exportLessons(
  store: LessonStore,
  options: Record<string, string | boolean>,
): void {
  const format = optionString(options.format) ?? "json";
  if (format !== "json" && format !== "md") {
    throw new Error("--format must be json or md.");
  }

  const id = optionString(options.id);
  const lessons = id ? [findLesson(store, id)] : store.list(Number.MAX_SAFE_INTEGER);
  const content = format === "json" ? lessonsToJson(lessons) : lessonsToMarkdown(lessons);

  const output = optionString(options.output);
  if (output) {
    fs.writeFileSync(output, `${content}\n`, "utf8");
    console.log(`Exported ${lessons.length} lesson(s) to ${output}`);
  } else {
    console.log(content);
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const S = { type: "string" as const };
  const B = { type: "boolean" as const };
  const { values, positionals } = nodeParseArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      title: S, "original-prompt": S, problem: S, mistake: S, "root-cause": S,
      "fix-summary": S, takeaway: S, "mistake-pattern": S, "when-not-applicable": S,
      concepts: S, "files-changed": S, "code-example": S, "bad-code-example": S,
      "good-code-example": S, "code-explanation": S, "practice-task": S,
      "review-question": S, "expected-answer": S, tool: S, understanding: S,
      tags: S, file: S, format: S, output: S, id: S, limit: S, port: S,
      client: S, scope: S, reason: S,
      url: S, key: S, email: S, password: S, passphrase: S,
      yes: { ...B, short: "y" }, "include-superseded": B, "no-open": B, "dry-run": B, help: B,
      version: { ...B, short: "v" },
      "password-login": B,
    },
  });
  const command = positionals[0];
  return { command, positionals: positionals.slice(1), options: values as Record<string, string | boolean> };
}

async function readStdin(): Promise<string> {
  let result = "";
  for await (const chunk of stdin) result += chunk.toString();
  return result;
}

function printHelp(): void {
  console.log(
    `fixmind\n\nCommands:\n  fixmind setup [--client codex,claude,cursor] [--scope user|project] [--dry-run] [--no-dashboard]\n  fixmind dashboard [--port 4317] [--no-open]\n  fixmind mcp\n  fixmind login [--url <supabase-url> --key <anon-key> --passphrase ...]  (opens browser for GitHub sign in)\n  fixmind login --password-login --email ... --password ... --passphrase ...  (email/password instead)\n  fixmind logout\n  fixmind sync push\n  fixmind sync pull\n  fixmind sync status\n  fixmind save [--title ... --problem ... --mistake ... --root-cause ...]\n  fixmind save-from-summary [--file lesson.json] < lesson.json\n  fixmind list [--limit 20] [--include-superseded]\n  fixmind search <query> [--include-superseded]\n  fixmind review\n  fixmind stats\n  fixmind status\n  fixmind edit <id> [--title ... --problem ... ...]\n  fixmind delete <id> [--yes | -y]\n  fixmind supersede <oldId> <newId> [--reason "..."]\n  fixmind export [--format json|md] [--output <file>] [--id <id>]\n\nOptions:\n  -v, --version  Show the installed CLI version.\n  -h, --help     Show this help text.\n\nSave options:\n  --title --original-prompt --problem --mistake --root-cause --fix-summary\n  --takeaway --mistake-pattern --when-not-applicable --concepts --files-changed\n  --code-example --bad-code-example --good-code-example --code-explanation\n  --practice-task --review-question --expected-answer --tool --understanding --tags\n\nEdit accepts the same field options as save (without --review-question,\n--expected-answer, --original-prompt, or --tool). <id> may be the full\nlesson id or any unique prefix shown by \`fixmind list\`.\n\nDelete requires --yes (or -y) when run outside an interactive terminal.\n\nSupersede marks <oldId> as superseded by <newId> (linked, never deleted).\nSuperseded lessons are hidden from \`list\`/\`search\` and review by default;\npass --include-superseded to see them. <oldId>/<newId> accept id prefixes.\n\nAliases:\n  fixmind save-manual -> fixmind save\n  fixmind save-ai-summary -> fixmind save-from-summary`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  console.error(`Error: ${message}${cause ? ` (${cause})` : ""}`);
  process.exitCode = 1;
});
