import { stdin, stdout } from "node:process";
import { parseArgs as nodeParseArgs } from "node:util";
import {
  cancel,
  isCancel,
  intro,
  log,
  multiselect,
  note,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import type { Lesson } from "./types.js";

export const common = { input: stdin, output: stdout };

export function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
  return value as T;
}

export function terminalLink(text: string, url: string): string {
  const esc = "\x1b";
  return `${esc}]8;;${url}\u0007${text}${esc}]8;;\u0007`;
}

export function optionString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function numberOption(value: string | boolean | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("--limit must be a positive integer.");
  return parsed;
}

export function optionalPort(value: string | boolean | undefined): number | undefined {
  if (value === undefined) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535.");
  }
  return port;
}

export function parseList(value?: string): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatLessonList(lessons: Lesson[]): string {
  if (lessons.length === 0) return "No lessons found.";
  return lessons
    .map((lesson) => {
      const concepts = lesson.concepts.join(", ") || "none";
      const suffix = lesson.status === "superseded" ? " [superseded]" : "";
      return [
        `${lesson.id.slice(0, 8)}  ${lesson.title}${suffix}`,
        `  concepts: ${concepts}`,
        `  understanding: ${lesson.understanding} | next review: ${formatDate(lesson.nextReviewAt)}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function supportedClientOptions(
  detected: Array<"codex" | "claude" | "cursor">,
): Array<{ value: "codex" | "claude" | "cursor"; label: string; hint?: string }> {
  const detectedSet = new Set(detected);
  return [
    { value: "codex", label: "Codex", hint: detectedSet.has("codex") ? "detected" : undefined },
    { value: "claude", label: "Claude", hint: detectedSet.has("claude") ? "detected" : undefined },
    { value: "cursor", label: "Cursor", hint: detectedSet.has("cursor") ? "detected" : undefined },
  ];
}

export function validateScope(value: string): "user" | "project" {
  if (value !== "user" && value !== "project") throw new Error(`Unsupported scope: ${value}. Use user or project.`);
  return value;
}

export function validateClients(values: string[]): Array<"codex" | "claude" | "cursor"> {
  const supported = new Set<"codex" | "claude" | "cursor">(["codex", "claude", "cursor"]);
  const invalid = values.filter((value) => !supported.has(value as "codex" | "claude" | "cursor"));
  if (invalid.length) {
    throw new Error(`Unsupported client(s): ${invalid.join(", ")}. Use codex, claude, or cursor.`);
  }
  return [...new Set(values)] as Array<"codex" | "claude" | "cursor">;
}

export function isAddressInUseError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "EADDRINUSE") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /address already in use/i.test(message);
}

export async function askText(
  message: string,
  fallback: string | undefined,
  interactive: boolean,
): Promise<string> {
  if (!interactive) return fallback ?? "";
  return unwrap(await text({ message, defaultValue: fallback || undefined, ...common }));
}

export function startSpinner(message: string) {
  const state = spinner();
  state.start(message);
  return state;
}

export { intro, log, multiselect, note, password, select, text };

export function parseArgs(argv: string[]) {
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
      client: S, scope: S, reason: S, url: S, key: S, email: S, password: S,
      passphrase: S, yes: { ...B, short: "y" }, "include-superseded": B, "no-open": B,
      "dry-run": B, help: B, version: { ...B, short: "v" }, "password-login": B,
    },
  });
  const command = positionals[0];
  return { command, positionals: positionals.slice(1), options: values as Record<string, string | boolean> };
}
