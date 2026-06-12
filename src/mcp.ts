#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";
import { readGitContext } from "./git.js";
import { databasePath } from "./paths.js";
import { initializeDataDirectory, createLessonStore, type LessonStore } from "./storage.js";
import { validateLessonInput } from "./validation.js";

export const MCP_INSTRUCTIONS = `
You are the fixmind learning recorder. Your job is to capture lessons that help developers improve over time.

BEFORE calling save_learning_lesson, run this checklist:
  1. Was real logic fixed? (a bug, an incorrect assumption, a missing guard, wrong API usage, bad state management, etc.)
  2. Does the developer now understand something they did not understand before?
  3. Can you write a concrete badCodeExample showing the wrong pattern?
  4. Can you explain WHY the old code was wrong, not just WHAT changed?

If any answer is NO, do NOT call save_learning_lesson.

DO NOT save a lesson for:
  - Moving code to a different file (pure relocation, no logic change)
  - Renaming variables, functions, or files
  - Formatting-only changes (whitespace, semicolons, quotes, line breaks)
  - Generated files or build artifacts
  - Adding a comment or doc-string without changing logic
  - Splitting one file into multiple files without changing logic
  - Purely mechanical refactors with no new understanding gained

STRONGLY RECOMMENDED fields — always provide these when code is involved:
  - mistake: What the developer actually did wrong in their thinking (not just what line changed)
  - badCodeExample: The minimal broken snippet. Example: "const data = await fetch(url)"
  - goodCodeExample: The corrected version. Example: "const res = await fetch(url); const data = await res.json();"
  - takeaway: One sentence to remember. Example: "fetch() resolves when headers arrive, not when the body is parsed."
  - mistakePattern: A 2–4 word reusable category. Examples: "Missing await", "Stale closure", "Off-by-one", "Wrong event lifetime"
  - tags: 1-3 entries naming the APIs/concepts involved, e.g. { "name": "MDN: URL.revokeObjectURL", "url": "https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static" }. Only set url when you are confident it is a real, official documentation page (MDN, the framework's own docs). If unsure, omit url and the tag is shown as a plain label.

SUPERSEDING A PREVIOUS LESSON:
If you previously called save_learning_lesson for a fix that turned out NOT to
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

const reviewQuestionSchema = z.object({
  question: z.string().trim().min(1),
  expectedAnswer: z.string().trim().min(1),
});

export const lessonInputSchema = z.object({
  tool: z.string().trim().min(1).optional().describe("The calling AI tool's name. Usually omit this — it is detected automatically from the MCP client."),
  projectPath: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  originalPrompt: z.string().default(""),
  problem: z.string().trim().min(1),
  mistake: z.string().trim().min(1),
  rootCause: z.string().trim().min(1),
  fixSummary: z.string().trim().min(1),
  takeaway: z.string().trim().min(1).optional().describe("STRONGLY RECOMMENDED. One plain sentence the developer should memorize. Example: 'Always revoke object URLs when a component unmounts.'"),
  mistakePattern: z.string().trim().min(1).optional().describe("STRONGLY RECOMMENDED. A 2–4 word reusable category. Examples: Missing cleanup, Stale closure, Off-by-one, Wrong event lifetime."),
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

const REFACTOR_PATTERN = /\b(mov(e|ing|ed)|extract(ed|ing)?|split(ting)?|rename(d|ing)?|refactor(ed|ing)?|reorganiz(e|ed|ing)|relocat(e|ed|ing))\b/i;

function detectRefactorWarning(input: ReturnType<typeof validateLessonInput>): string | null {
  const hasCodeExamples = Boolean(input.badCodeExample || input.goodCodeExample);
  if (hasCodeExamples) return null;
  const text = `${input.mistake} ${input.mistakePattern ?? ""}`;
  if (REFACTOR_PATTERN.test(text)) {
    return "Quality notice: This lesson has no code examples and the mistake description sounds like a structural change. If this was a pure refactor (moving/renaming code), do not save it. If a real bug was fixed, add badCodeExample and goodCodeExample so the lesson is useful for future review.";
  }
  if ((input.filesChanged ?? []).length > 0) {
    return "Quality notice: No code examples were captured. Add badCodeExample and goodCodeExample to make this lesson useful for future review.";
  }
  return null;
}

export function createLearningLessonServer(
  store: LessonStore = createLessonStore(),
): { server: McpServer; close: () => void } {
  const server = new McpServer(
    { name: "fixmind", version: "0.2.0" },
    { instructions: MCP_INSTRUCTIONS },
  );

  server.registerTool(
    "save_learning_lesson",
    {
      title: "Save Learning Lesson",
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
        const warning = detectRefactorWarning(input);
        const supersedeTarget = input.supersedesLessonId ? store.get(input.supersedesLessonId) : undefined;
        const saved = store.save(input);

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
              ...(warning ? ["", warning] : []),
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
