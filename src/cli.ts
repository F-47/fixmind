#!/usr/bin/env node
import fs from "node:fs";
import { stdin, stdout } from "node:process";
import {
  numberOption,
  optionalPort,
  optionString,
  parseList,
} from "./cli-options.js";
import { supportedClientOptions } from "./client-options.js";
import { formatLessonList } from "./format.js";
import { lessonsToJson, lessonsToMarkdown } from "./export.js";
import { readGitContext } from "./git.js";
import { createPrompter } from "./prompts.js";
import {
  configureClients,
  configureInstructions,
  configurePermissions,
  detectClients,
  genericMcpConfiguration,
  type SupportedClient,
} from "./setup.js";
import {
  createLessonStore,
  initializeDataDirectory,
  type LessonStore,
} from "./storage.js";
import type { Lesson, LessonInput, ReviewQuestion, Understanding } from "./types.js";
import { validateLessonInput } from "./validation.js";

interface ParsedArgs {
  command?: string;
  positionals: string[];
  options: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
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
    await setup(args.options);
    return;
  }

  if (args.command === "dashboard") {
    const { startDashboard } = await import("./dashboard.js");
    const handle = await startDashboard({
      port: optionalPort(args.options.port),
      open: !args.options["no-open"],
    });
    console.log(`Fixmind dashboard: ${handle.url}`);
    console.log("Press Ctrl+C to stop.");
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
      case "list":
        console.log(
          formatLessonList(store.list(numberOption(args.options.limit, 20))),
        );
        break;
      case "search": {
        const query = args.positionals.join(" ").trim();
        if (!query) throw new Error("Usage: fixmind search <query>");
        console.log(formatLessonList(store.search(query)));
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

async function setup(options: Record<string, string | boolean>): Promise<void> {
  const paths = initializeDataDirectory();
  const detected = detectClients();
  const supplied = parseList(optionString(options.client));
  let clients = supplied.length ? validateClients(supplied) : detected;

  if (!supplied.length && stdin.isTTY && stdout.isTTY) {
    const prompt = createPrompter();
    try {
      prompt.intro("Configure Learning Lessons");
      prompt.note(
        "Pick the AI clients that should receive the MCP server configuration.",
        "Setup",
      );
      const selected = await prompt.chooseMany(
        "Clients to configure",
        supportedClientOptions(detected),
        detected,
      );
      clients = validateClients(selected);
    } finally {
      prompt.close();
    }
  }

  if (clients.length === 0) {
    console.log(
      "No supported clients detected. Add this configuration to any stdio MCP client:",
    );
    console.log(JSON.stringify(genericMcpConfiguration(), null, 2));
    return;
  }

  const dryRun = Boolean(options["dry-run"]);
  const results = configureClients({ clients, dryRun });
  const instructions = configureInstructions({ clients, dryRun });
  const permissions = configurePermissions({ clients, dryRun });
  console.log(`Local data initialized at ${paths.directory}.`);
  for (const result of results)
    console.log(`${result.client}: ${result.status} - ${result.detail}`);
  for (const result of instructions)
    console.log(`${result.client} instructions: ${result.status} - ${result.filePath}`);
  for (const result of permissions)
    console.log(`${result.client} permissions: ${result.status} - ${result.filePath}`);
  console.log("Restart configured AI clients so they discover the MCP server.");
}

function validateClients(values: string[]): SupportedClient[] {
  const supported = new Set<SupportedClient>(["codex", "claude", "cursor"]);
  const invalid = values.filter(
    (value) => !supported.has(value as SupportedClient),
  );
  if (invalid.length)
    throw new Error(
      `Unsupported client(s): ${invalid.join(", ")}. Use codex, claude, or cursor.`,
    );
  return [...new Set(values)] as SupportedClient[];
}

async function saveLesson(
  store: LessonStore,
  options: Record<string, string | boolean>,
): Promise<void> {
  const git = readGitContext();
  const interactive = stdin.isTTY && stdout.isTTY;
  const prompt = interactive ? createPrompter() : undefined;
  try {
    if (prompt) {
      prompt.intro("Save a learning lesson");
      prompt.note(
        "Save the reusable lesson, not just the one-off bug report.",
        "Focus",
      );
    }

    const get = async (
      key: string,
      label: string,
      fallback = "",
    ): Promise<string> => {
      const supplied = optionString(options[key]);
      if (supplied !== undefined) return supplied;
      if (!prompt) return fallback;
      return prompt.ask(label, fallback);
    };

    if (git.stat) {
      if (prompt) {
        prompt.note(git.stat, "Working tree changes");
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
    if (prompt) {
      prompt.outro(`Saved lesson ${saved.id}: ${saved.title}`);
    } else {
      console.log(`Saved lesson ${saved.id}: ${saved.title}`);
    }
  } finally {
    prompt?.close();
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
  const saved = store.save(input);
  console.log(`Saved lesson ${saved.id}: ${saved.title}`);
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

  const prompt = createPrompter();
  try {
    prompt.intro("Review learning lessons");
    prompt.info(`${due.length} lesson(s) due.`);
    for (const lesson of due) {
      prompt.note(
        `Problem: ${lesson.problem}\nTakeaway: ${lesson.takeaway ?? lesson.fixSummary}`,
        lesson.title,
      );
      const questions: ReviewQuestion[] = [];
      for (const question of lesson.reviewQuestions) {
        const answer = await prompt.ask(
          `${question.question}\nYour answer (or "skip")`,
        );
        const skipped = answer.toLocaleLowerCase() === "skip";
        questions.push({
          ...question,
          userAnswer: skipped ? undefined : answer,
          status: skipped ? "skipped" : "answered",
        });
        if (!skipped) {
          prompt.info(`Expected: ${question.expectedAnswer}`);
        }
      }
      const understanding = await askUnderstanding(prompt);
      const updated = store.updateReview(
        lesson.id,
        questions,
        understanding,
      );
      prompt.info(`Review saved. Next review: ${updated.nextReviewAt}`);
    }
    prompt.outro("Review session complete.");
  } finally {
    prompt.close();
  }
}

async function askUnderstanding(
  prompt: ReturnType<typeof createPrompter>,
): Promise<Understanding> {
  return prompt.chooseOne(
    "How well do you understand this lesson now?",
    [
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
    "partial",
  );
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
    const prompt = createPrompter();
    try {
      confirmed = await prompt.confirm(
        `Delete "${lesson.title}"? This cannot be undone.`,
        false,
      );
    } finally {
      prompt.close();
    }
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
  const prompt = interactive ? createPrompter() : undefined;

  try {
    if (prompt) {
      prompt.intro(`Edit lesson: ${lesson.title}`);
      prompt.note("Press Enter to keep the current value.", "Tip");
    }

    const get = async (
      key: string,
      label: string,
      current: string,
    ): Promise<string | undefined> => {
      const supplied = optionString(options[key]);
      if (supplied !== undefined) return supplied;
      if (!prompt) return undefined;
      return prompt.ask(label, current);
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
    if (prompt) {
      prompt.outro(`Updated lesson ${updated.id}: ${updated.title}`);
    } else {
      console.log(`Updated lesson ${updated.id}: ${updated.title}`);
    }
  } finally {
    prompt?.close();
  }
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
  const command = argv[0]?.startsWith("-") ? undefined : argv[0];
  const rest = command ? argv.slice(1) : argv;
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "-y") {
      options.yes = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }
    const [name, inline] = argument.slice(2).split("=", 2);
    if (inline !== undefined) {
      options[name] = inline;
    } else if (rest[index + 1] && !rest[index + 1].startsWith("--")) {
      options[name] = rest[++index];
    } else {
      options[name] = true;
    }
  }
  return { command, positionals, options };
}

async function readStdin(): Promise<string> {
  let result = "";
  for await (const chunk of stdin) result += chunk.toString();
  return result;
}

function printHelp(): void {
  console.log(
    `fixmind\n\nCommands:\n  fixmind setup [--client codex,claude,cursor] [--dry-run]\n  fixmind dashboard [--port 4317] [--no-open]\n  fixmind mcp\n  fixmind save [--title ... --problem ... --mistake ... --root-cause ...]\n  fixmind save-from-summary [--file lesson.json] < lesson.json\n  fixmind list [--limit 20]\n  fixmind search <query>\n  fixmind review\n  fixmind stats\n  fixmind status\n  fixmind edit <id> [--title ... --problem ... ...]\n  fixmind delete <id> [--yes | -y]\n  fixmind export [--format json|md] [--output <file>] [--id <id>]\n\nSave options:\n  --title --original-prompt --problem --mistake --root-cause --fix-summary\n  --takeaway --mistake-pattern --concepts --files-changed --code-example\n  --bad-code-example --good-code-example --code-explanation --practice-task\n  --review-question --expected-answer --tool --understanding --tags\n\nEdit accepts the same field options as save (without --review-question,\n--expected-answer, --original-prompt, or --tool). <id> may be the full\nlesson id or any unique prefix shown by \`fixmind list\`.\n\nDelete requires --yes (or -y) when run outside an interactive terminal.\n\nAliases:\n  fixmind save-manual -> fixmind save\n  fixmind save-ai-summary -> fixmind save-from-summary`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
