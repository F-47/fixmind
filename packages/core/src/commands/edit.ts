import { stdin, stdout } from "node:process";
import { intro, note, outro } from "@clack/prompts";
import { common, optionString, parseList } from "../cli-utils.js";
import type { LessonStore } from "../storage.js";
import type { Lesson, LessonInput, Understanding } from "../types.js";
import { findLesson } from "./find-lesson.js";
import { createLessonFieldReader } from "./lesson-fields.js";
import type { CommandDefinition } from "./registry.js";

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

  const updated = store.update(
    lesson.id,
    await buildLessonUpdate({
      lesson,
      interactive,
      options,
    }),
  );
  if (interactive) {
    outro(`Updated lesson ${updated.id}: ${updated.title}`, common);
  } else {
    console.log(`Updated lesson ${updated.id}: ${updated.title}`);
  }
}

interface LessonEditContext {
  lesson: Lesson;
  interactive: boolean;
  options: Record<string, string | boolean>;
}

const TEXT_FIELDS = [
  ["title", "title", "Title"],
  ["problem", "problem", "Problem"],
  ["mistake", "mistake", "Mistake"],
  ["rootCause", "root-cause", "Root cause"],
  ["fixSummary", "fix-summary", "Fix summary"],
  ["takeaway", "takeaway", "One-sentence takeaway"],
  ["mistakePattern", "mistake-pattern", "Short mistake pattern"],
  ["whenNotApplicable", "when-not-applicable", "When this advice doesn't apply"],
  ["codeExample", "code-example", "Small code example"],
  ["badCodeExample", "bad-code-example", "Minimal wrong code example"],
  ["goodCodeExample", "good-code-example", "Minimal corrected code example"],
  ["codeExplanation", "code-explanation", "Why the corrected example works"],
  ["practiceTask", "practice-task", "Small practice task"],
] as const;

async function buildLessonUpdate(context: LessonEditContext): Promise<Partial<LessonInput>> {
  const { lesson, interactive, options } = context;
  const reader = createLessonFieldReader(interactive, options);
  const partial = await readTextUpdates(reader, lesson);
  Object.assign(partial, await readListUpdates(reader, lesson));
  const understanding = optionString(options.understanding);
  if (understanding !== undefined) partial.understanding = parseUnderstanding(understanding);
  return partial;
}

async function readListUpdates(
  reader: LessonFieldReader,
  lesson: Lesson,
): Promise<Partial<LessonInput>> {
  const updates: Partial<LessonInput> = {};
  const concepts = await readList(reader, "concepts", "Concepts", lesson.concepts);
  if (concepts !== undefined) updates.concepts = parseList(concepts);
  const filesChanged = await readList(
    reader,
    "files-changed",
    "Files changed",
    lesson.filesChanged,
  );
  if (filesChanged !== undefined) updates.filesChanged = parseList(filesChanged);
  const tags = await readList(
    reader,
    "tags",
    "Tags",
    lesson.tags.map((tag) => tag.name),
  );
  if (tags !== undefined) updates.tags = parseList(tags).map((name) => ({ name }));
  return updates;
}

type LessonFieldReader = ReturnType<typeof createLessonFieldReader>;

async function readTextUpdates(
  reader: LessonFieldReader,
  lesson: Lesson,
): Promise<Partial<LessonInput>> {
  const entries: Array<[string, string]> = [];
  for (const [field, option, label] of TEXT_FIELDS) {
    const currentText = lesson[field] ?? "";
    const updatedText = await reader.optional(option, label, currentText);
    if (updatedText !== undefined) entries.push([field, updatedText]);
  }
  return Object.fromEntries(entries) as Partial<LessonInput>;
}

function readList(
  reader: LessonFieldReader,
  option: string,
  label: string,
  current: string[],
): Promise<string | undefined> {
  return reader.optional(option, `${label} (comma-separated)`, current.join(", "));
}

function parseUnderstanding(rawUnderstanding: string): Understanding {
  if (
    rawUnderstanding === "understood" ||
    rawUnderstanding === "partial" ||
    rawUnderstanding === "copied_blindly" ||
    rawUnderstanding === "unknown"
  ) {
    return rawUnderstanding;
  }
  throw new Error("--understanding must be understood, partial, copied_blindly, or unknown.");
}

export const editCommand: CommandDefinition = {
  names: ["edit"],
  usage: ["  fixmind edit <id> [--title ... --problem ... ...]"],
  kind: "store",
  run: ({ options, positionals, store }) => {
    const id = positionals[0];
    if (!id) throw new Error("Usage: fixmind edit <id> [--title ... --problem ...]");
    return editLesson(store, id, options);
  },
};
