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

export const MCP_INSTRUCTIONS = [
  "After completing a meaningful coding fix, call save_learning_lesson for the human developer.",
  "Write in plain teaching language. Include a one-sentence takeaway and a short reusable mistake pattern such as Resource cleanup or Stale state.",
  "Capture the mistake, root cause, reusable concept, why the fix works, and one recall question.",
  "Include a minimal wrong example, corrected example, and short practice task whenever code is involved.",
  "Do not save lessons for formatting-only changes, renames, generated files, or purely mechanical edits unless the user asks.",
  "Keep lessons concise and focused on human learning rather than agent memory.",
].join(" ");

const reviewQuestionSchema = z.object({
  question: z.string().trim().min(1),
  expectedAnswer: z.string().trim().min(1),
});

export const lessonInputSchema = z.object({
  tool: z.string().trim().min(1).default("unknown-ai-tool"),
  projectPath: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  originalPrompt: z.string().default(""),
  problem: z.string().trim().min(1),
  mistake: z.string().trim().min(1),
  rootCause: z.string().trim().min(1),
  fixSummary: z.string().trim().min(1),
  takeaway: z.string().trim().min(1).optional().describe("One plain sentence stating what the developer should remember."),
  mistakePattern: z.string().trim().min(1).optional().describe("A short reusable category, usually two to four words."),
  concepts: z.array(z.string().trim().min(1)).min(1),
  filesChanged: z.array(z.string().trim().min(1)).default([]),
  codeExample: z.string().optional(),
  badCodeExample: z.string().optional().describe("A minimal example showing the mistake."),
  goodCodeExample: z.string().optional().describe("A minimal corrected example showing the concept."),
  codeExplanation: z.string().optional().describe("A short explanation of the important difference between the broken and corrected examples."),
  practiceTask: z.string().optional().describe("A small exercise the developer can do without copying the fix."),
  reviewQuestions: z.array(reviewQuestionSchema).min(1),
  understanding: z.enum(["understood", "partial", "copied_blindly", "unknown"]).default("unknown"),
  sourceDiff: z.string().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
});

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
        const projectPath = candidate.projectPath ?? process.cwd();
        if (!candidate.sourceDiff || candidate.filesChanged.length === 0) {
          const git = readGitContext(projectPath);
          candidate.sourceDiff ||= git.sourceDiff;
          if (candidate.filesChanged.length === 0) candidate.filesChanged = git.filesChanged;
        }

        const input = validateLessonInput({ ...candidate, projectPath });
        const saved = store.save(input);
        return {
          content: [{
            type: "text" as const,
            text: [
              `Saved learning lesson ${saved.id}.`,
              `Title: ${saved.title}`,
              `Next review: ${saved.nextReviewAt}`,
              `Database: ${databasePath()}`,
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
