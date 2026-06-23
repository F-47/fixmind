#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { readConfig } from "./config.js";
import { formatMemoryLessons, getMemoryLessons } from "./memory.js";
import { readGitContext } from "./git.js";
import { databasePath } from "./paths.js";
import { initializeDataDirectory, createLessonStore, type LessonStore } from "./storage.js";
import { assessLessonQuality, validateLessonInput } from "./validation.js";

function captureModeGuidance(captureMode: "strict" | "balanced"): string {
  return captureMode === "balanced"
    ? `Capture mode: balanced.
Balanced mode is more willing to save borderline-but-useful fixes. If a change teaches a reusable rule and the lesson is not obviously junk, lean toward saving it.`
    : `Capture mode: strict.
Strict mode only saves clear, learning-worthy fixes. If a lesson feels borderline or mostly descriptive, skip it.`;
}

export function buildMcpInstructions(captureMode: "strict" | "balanced"): string {
  return `
You are the fixmind learning recorder. Your job is to capture lessons that help developers improve over time.

${captureModeGuidance(captureMode)}

Use the memory tool when a new task looks similar to an earlier mistake or when the user explicitly asks to "use fixmind memory". Retrieve a few relevant reviewed lessons and reuse the underlying rule, not the whole history.

BEFORE calling save_lesson, run this checklist:
  1. Was real logic fixed? (a bug, an incorrect assumption, a missing guard, wrong API usage, bad state management, etc.)
  2. Does the developer now understand something they did not understand before?
  3. Can you write a concrete badCodeExample showing the wrong pattern?
  4. Can you explain WHY the old code was wrong, not just WHAT changed?
  5. Can you state when this fix would NOT apply - a different framework/version,
     a context where the old code is actually correct, or a case that needs a
     different fix entirely?

If any answer is NO, do NOT call save_lesson.

DO NOT save a lesson for:
  - Moving code to a different file (pure relocation, no logic change)
  - Renaming variables, functions, or files
  - Formatting-only changes (whitespace, semicolons, quotes, line breaks)
  - Generated files or build artifacts
  - Adding a comment or doc-string without changing logic
  - Splitting one file into multiple files without changing logic
  - Purely mechanical refactors with no new understanding gained
  - UI-only or styling-only changes (CSS, className, spacing, color, copy
    tweaks) that don't change behavior or fix a bug
  - Any change where you cannot point to a behavior that was wrong before
    and correct after

FIELD GUIDE - each field has a distinct job. Do not let them repeat each other:
  - problem: The user-visible SYMPTOM. What broke, what error appeared, or
    what the user/tester observed. This is the "what happened".
  - mistake: The WRONG ASSUMPTION or approach in the code that caused the
    symptom - describe the flawed thinking, not just the line that changed.
  - rootCause: WHY the mistake produced the symptom. This must add new
    information beyond problem and mistake - if you find yourself repeating
    either of them, dig one level deeper (e.g. "the API resolves before the
    body streams" rather than "the data was empty").
  - fixSummary: WHY the new code avoids the root cause - not just what code
    changed. A reader should understand why this fix actually works, so they
    could apply the same reasoning elsewhere.

REQUIRED fields — every lesson must answer these:
  - mistake: What the developer actually did wrong in their thinking (not just what line changed)
  - takeaway: One sentence to remember. Example: "fetch() resolves when headers arrive, not when the body is parsed."
  - whenNotApplicable: When this advice does NOT apply. Example: "Doesn't apply inside Server Components, which can't use useEffect at all."

STRONGLY RECOMMENDED fields — provide these when code is involved:
  - badCodeExample: The minimal broken snippet. Example: "const data = await fetch(url)"
  - goodCodeExample: The corrected version, paired with badCodeExample. Example: "const res = await fetch(url); const data = await res.json();"
  - mistakePattern: A 2–4 word reusable category. Examples: "Missing await", "Stale closure", "Off-by-one", "Wrong event lifetime"
  - tags: 1-3 entries naming the APIs/concepts involved, e.g. { "name": "MDN: URL.revokeObjectURL", "url": "https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static" }. Only set url when you are confident it is a real, official documentation page (MDN, the framework's own docs). If unsure, omit url and the tag is shown as a plain label.

REVIEW QUESTIONS - write TRANSFER questions, not recall questions:
  - Bad (recall): "What did you change?" / "Summarize the fix."
  - Good (transfer): a question that asks the developer to apply the same
    reasoning to a DIFFERENT situation, spot the same mistake in different
    code, or predict what would happen under slightly different conditions.
  - expectedAnswer should reference the underlying principle (rootCause /
    takeaway), not just describe the diff.

THE SAVE CAN BE REJECTED. If save_lesson returns an error, it means
the lesson didn't clear the quality bar. Common reasons, with the fix for each:
  - rootCause or fixSummary just repeated another field word-for-word - rewrite
    it to add the missing WHY (the mechanism, not a restatement).
  - mistake and fixSummary both read as a pure refactor with no code comparison
    - add badCodeExample/goodCodeExample, or don't save this as a lesson.
  - problem/mistake/fixSummary read as a UI-only or styling-only change (colors,
    spacing, className, fonts, etc.) with no described behavior change - say
    what BROKE (an element became unclickable, content overflowed and hid other
    content, etc.), not just what looked different.
  - mistake, rootCause, or fixSummary is a generic placeholder like "fixed the
    bug" or "the code was wrong" - name the actual function, condition, or
    value involved.
  - every reviewQuestion is a recall question ("what did you change") - rewrite
    or add one TRANSFER question per the REVIEW QUESTIONS section above.
Re-read the FIELD GUIDE above, rewrite the offending field with real new
information, and try again. If you genuinely cannot explain a root cause beyond
the symptom, this was probably not a learning-worthy fix - do not save it.

For codeExample, badCodeExample, and goodCodeExample: write multi-line snippets
with real line breaks and normal indentation, the same way you'd write the code
in a file. Do not flatten the snippet onto one line using the two characters
"\" + "n" as a stand-in for a newline - the dashboard renders these fields
verbatim, so literal "\n" text shows up as "\n" instead of a line break.

SUPERSEDING A PREVIOUS LESSON:
If you previously called save_lesson for a fix that turned out NOT to
work, and you are now saving a lesson for the CORRECT fix, set:
  - supersedesLessonId: the id of the earlier (wrong) lesson, from its
    "Saved learning lesson <id>" response in this conversation.
  - supersedeReason: one sentence on what was wrong with the earlier fix and
    why this one replaces it.
The old lesson stops appearing in search and spaced-repetition review, but
stays in history with a link to this corrected lesson. Only use this for
fixes that turned out to be incorrect or incomplete — not for pure rewording.

Write as a teacher, not as an agent log. Keep lessons short and human-readable.
`.trim();
}

const reviewQuestionSchema = z.object({
  question: z.string().trim().min(1).describe("A TRANSFER question - apply the lesson to a different situation, spot the same mistake elsewhere, or predict an outcome. Do not ask 'what did you change' or 'summarize the fix'."),
  expectedAnswer: z.string().trim().min(1).describe("The reasoning a developer who understood rootCause/takeaway would give - not just a description of the diff."),
});

const memoryInputSchema = z.object({
  query: z.string().trim().min(1).optional().describe("A short memory query derived from the current task or mistake pattern."),
  limit: z.number().int().min(1).max(10).default(5).describe("How many memory lessons to return."),
});

export const lessonInputSchema = z.object({
  tool: z.string().trim().min(1).optional().describe("The calling AI tool's name. Usually omit this — it is detected automatically from the MCP client."),
  projectPath: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  originalPrompt: z.string().default(""),
  problem: z.string().trim().min(1).describe("The user-visible SYMPTOM - what broke, what error appeared, or what was observed. The 'what happened', not the 'why'."),
  mistake: z.string().trim().min(1).describe("The wrong assumption or approach in the code that caused the symptom - the flawed thinking, not just the line that changed."),
  rootCause: z.string().trim().min(1).describe("WHY the mistake produced the symptom. Must add information beyond problem and mistake, not restate either of them."),
  fixSummary: z.string().trim().min(1).describe("WHY the new code avoids the root cause - not just what code changed."),
  takeaway: z.string().trim().min(1).describe("REQUIRED. One plain sentence the developer should memorize. Example: 'Always revoke object URLs when a component unmounts.'"),
  mistakePattern: z.string().trim().min(1).optional().describe("STRONGLY RECOMMENDED. A 2–4 word reusable category. Examples: Missing cleanup, Stale closure, Off-by-one, Wrong event lifetime."),
  whenNotApplicable: z.string().trim().min(1).describe("REQUIRED. When would this fix/advice NOT apply - a different framework version, a context where the same code is actually correct, or a case needing a different fix. Forces the lesson to state its scope, not just the one fix."),
  concepts: z.array(z.string().trim().min(1)).min(1),
  filesChanged: z.array(z.string().trim().min(1)).default([]),
  codeExample: z.string().optional(),
  badCodeExample: z.string().optional().describe("STRONGLY RECOMMENDED when code is involved. A minimal snippet showing the mistake. Omit only for concept-only lessons with no code change."),
  goodCodeExample: z.string().optional().describe("STRONGLY RECOMMENDED when code is involved. The corrected snippet. Must pair with badCodeExample."),
  codeExplanation: z.string().optional().describe("A short explanation of the key difference between the broken and corrected examples."),
  practiceTask: z.string().optional().describe("A small exercise the developer can do without copying the fix."),
  reviewQuestions: z.array(reviewQuestionSchema).min(1),
  understanding: z.enum(["understood", "partial", "copied_blindly", "unknown"]).default("unknown"),
  sourceDiff: z.string().optional(),
  tags: z.array(z.object({
    name: z.string().trim().min(1),
    url: z.string().min(1).optional(),
  })).default([]),
  supersedesLessonId: z.string().trim().min(1).optional().describe(
    "If this lesson corrects a PREVIOUS lesson you saved earlier in this conversation that turned out to be wrong or incomplete, set this to that lesson's id (from its 'Saved learning lesson <id>' response). The old lesson is marked superseded and hidden from future search/review, but kept in history.",
  ),
  supersedeReason: z.string().trim().min(1).optional().describe(
    "Use together with supersedesLessonId. One sentence on what was wrong with the old lesson and why this one replaces it.",
  ),
});

export function createLearningLessonServer(
  store: LessonStore = createLessonStore(),
): { server: McpServer; close: () => void } {
  const captureMode = readConfig().captureMode;
  const server = new McpServer(
    { name: "fixmind", version: "0.2.0" },
    { instructions: buildMcpInstructions(captureMode) },
  );

  server.registerTool(
    "memory",
    {
      title: "Recall Memory",
      description: "Retrieve a small set of relevant reviewed lessons to reuse as guidance.",
      inputSchema: memoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (arguments_) => {
      try {
        const lessons = getMemoryLessons(store, {
          query: arguments_.query,
          limit: arguments_.limit,
        });
        return {
          content: [{
            type: "text" as const,
            text: formatMemoryLessons(lessons),
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: error instanceof Error ? error.message : String(error),
          }],
        };
      }
    },
  );

  server.registerTool(
    "save_lesson",
    {
      title: "Save Lesson",
      description: "Save a concise local learning lesson after a meaningful coding fix.",
      inputSchema: lessonInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (arguments_) => {
      try {
        const candidate = { ...arguments_ };
        candidate.tool ||= server.server.getClientVersion()?.name ?? "unknown-ai-tool";
        const projectPath = candidate.projectPath ?? process.cwd();
        if (!candidate.sourceDiff || candidate.filesChanged.length === 0) {
          const git = readGitContext(projectPath);
          candidate.sourceDiff ||= git.sourceDiff;
          if (candidate.filesChanged.length === 0) candidate.filesChanged = git.filesChanged;
        }

        const input = validateLessonInput({ ...candidate, projectPath });
        const quality = assessLessonQuality(input);
        if (quality.errors.length > 0) {
          return {
            isError: true,
            content: [{
              type: "text" as const,
              text: [
                "This lesson was not saved - it doesn't look like a learning-worthy fix yet:",
                ...quality.errors.map((message) => `- ${message}`),
              ].join("\n"),
            }],
          };
        }

        const supersedeTarget = input.supersedesLessonId ? store.get(input.supersedesLessonId) : undefined;
        const saved = store.save(input);
        const { autoPushAfterSave } = await import("./sync.js");
        await autoPushAfterSave(store);

        const supersedeLines: string[] = [];
        if (input.supersedesLessonId) {
          supersedeLines.push(
            supersedeTarget
              ? `Superseded lesson ${input.supersedesLessonId} (hidden from future search/review).`
              : `Warning: supersedesLessonId ${input.supersedesLessonId} was not found - nothing was marked superseded.`,
          );
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Saved learning lesson ${saved.id}.`,
              `Title: ${saved.title}`,
              `Next review: ${saved.nextReviewAt}`,
              `Database: ${databasePath()}`,
              ...(supersedeLines.length ? ["", ...supersedeLines] : []),
              ...(quality.warnings.length ? ["", ...quality.warnings] : []),
            ].join("\n"),
          }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text" as const,
            text: error instanceof Error ? error.message : String(error),
          }],
        };
      }
    },
  );

  return { server, close: () => store.close() };
}

export async function startMcpServer(): Promise<void> {
  initializeDataDirectory();
  const { server, close } = createLearningLessonServer();
  const transport = new StdioServerTransport();
  const shutdown = async (): Promise<void> => {
    await server.close();
    close();
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  await server.connect(transport);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startMcpServer().catch((error: unknown) => {
    console.error(`Fixmind MCP error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
