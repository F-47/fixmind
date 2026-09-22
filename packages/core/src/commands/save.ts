import { stdin, stdout } from "node:process";
import { intro, note, outro, select } from "@clack/prompts";
import { common, optionString, parseList, unwrap } from "../cli-utils.js";
import { readGitContext } from "../git.js";
import { buildGitAutofill } from "../git-autofill.js";
import {
  getLessonTemplate,
  type LessonTemplate,
  lessonTemplateOptions,
} from "../lesson-templates.js";
import type { LessonStore } from "../storage.js";
import type { LessonInput } from "../types.js";
import {
  assessLessonQuality,
  formatLessonQualityFeedback,
  validateLessonInput,
} from "../validation.js";
import { createLessonFieldReader } from "./lesson-fields.js";
import type { CommandDefinition } from "./registry.js";

async function saveLesson(
  store: LessonStore,
  options: Record<string, string | boolean>,
): Promise<void> {
  const git = readGitContext();
  const interactive = stdin.isTTY && stdout.isTTY;
  introduceSave(interactive);
  const template = await pickLessonTemplate(interactive);
  if (interactive && template) note(template.description, template.label, common);
  const gitAutofill = buildGitAutofill(git);
  showWorkingTree(git.stat, interactive);
  const input = await buildLessonInput({
    git,
    interactive,
    options,
    template,
    autofill: gitAutofill,
  });
  const quality = assessLessonQuality(input);
  const saved = store.save(input);
  const { autoPushAfterSave } = await import("../sync.js");
  await autoPushAfterSave(store);
  reportSavedLesson(saved, formatLessonQualityFeedback(quality), interactive);
}

function introduceSave(interactive: boolean): void {
  if (!interactive) return;
  intro("Save a learning lesson", common);
  note("Save the reusable lesson, not just the one-off bug report.", "Focus", common);
}

function showWorkingTree(stat: string | undefined, interactive: boolean): void {
  if (!stat) return;
  if (interactive) note(stat, "Working tree changes", common);
  else console.log(`Detected working tree changes:\n${stat}\n`);
}

function reportSavedLesson(
  lesson: { id: string; title: string },
  qualityLines: string[],
  interactive: boolean,
): void {
  if (interactive) outro(`Saved lesson ${lesson.id}: ${lesson.title}`, common);
  else console.log(`Saved lesson ${lesson.id}: ${lesson.title}`);
  if (qualityLines.length === 0) return;
  if (interactive) note(qualityLines.join("\n"), "Quality feedback", common);
  else console.log(qualityLines.join("\n"));
}

interface LessonDraftContext {
  git: ReturnType<typeof readGitContext>;
  interactive: boolean;
  options: Record<string, string | boolean>;
  template?: LessonTemplate;
  autofill: ReturnType<typeof buildGitAutofill>;
}

async function buildLessonInput(context: LessonDraftContext): Promise<LessonInput> {
  const { git, interactive, options, template, autofill: gitAutofill } = context;
  const reader = createLessonFieldReader(interactive, options);
  const textFields = await readRequiredTextFields(reader, context);
  return validateLessonInput({
    tool: optionString(options.tool) ?? "manual",
    projectPath: process.cwd(),
    ...textFields,
    concepts: await readConcepts(reader, context),
    filesChanged: await readFilesChanged(reader, gitAutofill.filesChanged),
    reviewQuestions: [await readReviewQuestion(reader, template)],
    understanding: optionString(options.understanding) ?? "unknown",
    sourceDiff: git.sourceDiff,
    tags: await readTags(reader),
  });
}

async function readFilesChanged(reader: LessonFieldReader, files: string[]): Promise<string[]> {
  const changedFilesText = await reader.required(
    "files-changed",
    "Files changed (comma-separated)",
    files.join(", "),
  );
  return parseList(changedFilesText);
}

async function readReviewQuestion(reader: LessonFieldReader, template?: LessonTemplate) {
  const question = await reader.required(
    "review-question",
    "Review question",
    template?.reviewQuestion.question ?? "",
  );
  const expectedAnswer = await reader.required(
    "expected-answer",
    "Expected answer",
    template?.reviewQuestion.expectedAnswer ?? "",
  );
  return { question, expectedAnswer };
}

async function readTags(reader: LessonFieldReader) {
  const tagList = await reader.required("tags", "Tags (comma-separated)");
  return parseList(tagList).map((name) => ({ name }));
}

type LessonFieldReader = ReturnType<typeof createLessonFieldReader>;
type RequiredTextSpec = readonly [field: string, option: string, label: string, fallback: string];

async function readRequiredTextFields(
  reader: LessonFieldReader,
  context: LessonDraftContext,
): Promise<Record<string, string>> {
  const entries: Array<[string, string]> = [];
  for (const [field, option, label, fallback] of requiredTextSpecs(context)) {
    entries.push([field, await reader.required(option, label, fallback)]);
  }
  return Object.fromEntries(entries);
}

function requiredTextSpecs(context: LessonDraftContext): RequiredTextSpec[] {
  const defaults = context.template?.defaults;
  return [
    ["title", "title", "Title", defaults?.title ?? ""],
    ["originalPrompt", "original-prompt", "Original prompt", defaults?.originalPrompt ?? ""],
    ["problem", "problem", "Problem", defaults?.problem ?? ""],
    ["mistake", "mistake", "Mistake", defaults?.mistake ?? ""],
    ["rootCause", "root-cause", "Root cause", defaults?.rootCause ?? ""],
    ["fixSummary", "fix-summary", "Fix summary", defaults?.fixSummary ?? ""],
    ["takeaway", "takeaway", "One-sentence takeaway", defaults?.takeaway ?? ""],
    [
      "mistakePattern",
      "mistake-pattern",
      "Short mistake pattern",
      defaults?.mistakePattern ?? context.autofill.mistakePattern ?? "",
    ],
    [
      "whenNotApplicable",
      "when-not-applicable",
      "When this advice doesn't apply",
      defaults?.whenNotApplicable ?? "",
    ],
    ["codeExample", "code-example", "Small code example", context.autofill.codeExample ?? ""],
    ["badCodeExample", "bad-code-example", "Minimal wrong code example", ""],
    ["goodCodeExample", "good-code-example", "Minimal corrected code example", ""],
    ["codeExplanation", "code-explanation", "Why the corrected example works", ""],
    ["practiceTask", "practice-task", "Small practice task", ""],
  ];
}

async function readConcepts(
  reader: LessonFieldReader,
  context: LessonDraftContext,
): Promise<string[]> {
  const defaults = context.template?.defaults?.concepts ?? [];
  const concepts = combineConceptDefaults(defaults, context.autofill.concepts);
  return parseList(
    await reader.required("concepts", "Concepts (comma-separated)", concepts.join(", ")),
  );
}

function combineConceptDefaults(templateConcepts: string[], inferredConcepts: string[]): string[] {
  const combined: string[] = [];
  for (const concept of [...templateConcepts, ...inferredConcepts]) {
    if (!combined.includes(concept)) combined.push(concept);
    if (combined.length >= 3) break;
  }
  return combined;
}

async function pickLessonTemplate(interactive: boolean): Promise<LessonTemplate | undefined> {
  if (!interactive) return undefined;

  const selected = unwrap(
    await select({
      message: "Start from a lesson template?",
      options: lessonTemplateOptions(),
      initialValue: "",
      ...common,
    }),
  );
  if (!selected) return undefined;
  return getLessonTemplate(selected);
}

export const saveCommand: CommandDefinition = {
  names: ["save", "save-manual"],
  usage: [
    "  fixmind save [--title ... --problem ... --mistake ... --root-cause ...]  (interactive template picker; Git autofill from the current diff)",
  ],
  kind: "store",
  run: ({ options, store }) => saveLesson(store, options),
};
