import fs from "node:fs";
import { optionString } from "../cli-utils.js";
import { lessonsToAnki, lessonsToJson, lessonsToMarkdown } from "../export.js";
import type { LessonStore } from "../storage.js";
import { findLesson } from "./find-lesson.js";
import type { CommandDefinition } from "./registry.js";

function exportLessons(store: LessonStore, options: Record<string, string | boolean>): void {
  const format = optionString(options.format) ?? "json";
  if (format !== "json" && format !== "md" && format !== "anki") {
    throw new Error("--format must be json, md, or anki.");
  }

  const id = optionString(options.id);
  const lessons = id ? [findLesson(store, id)] : store.list(Number.MAX_SAFE_INTEGER);
  const content =
    format === "json"
      ? lessonsToJson(lessons)
      : format === "md"
        ? lessonsToMarkdown(lessons)
        : lessonsToAnki(lessons);

  const output = optionString(options.output);
  if (output) {
    fs.writeFileSync(output, `${content}\n`, "utf8");
    console.log(`Exported ${lessons.length} lesson(s) to ${output}`);
  } else {
    console.log(content);
  }
}

export const exportCommand: CommandDefinition = {
  names: ["export"],
  usage: ["  fixmind export [--format json|md|anki] [--output <file>] [--id <id>]"],
  kind: "store",
  run: ({ options, store }) => exportLessons(store, options),
};
