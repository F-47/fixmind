import fs from "node:fs";
import { stdin } from "node:process";
import { optionString } from "../cli-utils.js";
import type { LessonStore } from "../storage.js";
import {
  assessLessonQuality,
  formatLessonQualityFeedback,
  validateLessonInput,
} from "../validation.js";
import type { CommandDefinition } from "./registry.js";

async function saveLessonFromSummary(
  store: LessonStore,
  options: Record<string, string | boolean>,
): Promise<void> {
  const file = optionString(options.file);
  const raw = file ? fs.readFileSync(file, "utf8") : await readStdin();
  if (!raw.trim())
    throw new Error("No JSON input received. Pipe JSON to stdin or pass --file <path>.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
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
  const { autoPushAfterSave } = await import("../sync.js");
  await autoPushAfterSave(store);
  console.log(`Saved lesson ${saved.id}: ${saved.title}`);
  const qualityLines = formatLessonQualityFeedback(quality);
  if (qualityLines.length > 0) console.log(qualityLines.join("\n"));
}

async function readStdin(): Promise<string> {
  let result = "";
  for await (const chunk of stdin) result += chunk.toString();
  return result;
}

export const saveFromSummaryCommand: CommandDefinition = {
  names: ["save-from-summary", "save-ai-summary"],
  usage: ["  fixmind save-from-summary [--file lesson.json] < lesson.json"],
  kind: "store",
  run: ({ options, store }) => saveLessonFromSummary(store, options),
};
