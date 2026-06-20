import type { LessonInput, Tag, Understanding } from "./types.js";

const UNDERSTANDING = new Set<Understanding>([
  "understood",
  "partial",
  "copied_blindly",
  "unknown",
]);

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid lesson: ${field} is required.`);
  }
  return value.trim();
}

const REFACTOR_PATTERN = /\b(mov(e|ing|ed)|extract(ed|ing)?|split(ting)?|rename(d|ing)?|refactor(ed|ing)?|reorganiz(e|ed|ing)|relocat(e|ed|ing))\b/i;

// Visual/styling vocabulary with no behavior implication on its own.
const UI_ONLY_PATTERN = /\b(css|class ?name|styles?|styling|padding|margins?|colou?rs?|fonts?|spacing|alignment|border-radius|background|hover state|theme colou?r|pixels?|px)\b/i;

// Words that indicate a real behavior/runtime symptom was involved, even if
// styling vocabulary also appears (e.g. "the overflow caused a crash").
const BEHAVIOR_SIGNAL_PATTERN = /\b(crash(es|ed|ing)?|error|exception|throws?|thrown|undefined|null|nan|infinite|leak(s|ed|ing)?|race condition|stale|wrong|incorrect|fail(s|ed|ure|ing)?|broke|broken|bug|freeze[sd]?|hangs?|timeout|data loss|security|injection|overflow|deadlock|duplicate|missing|404|500|memory|unresponsive|crashes|unclickable|inaccessible|non-interactive)\b/i;

// Boilerplate that describes "a fix happened" without saying anything
// specific about what was wrong or why.
const GENERIC_PHRASE_PATTERN = /\b(the code was wrong|there was a bug|fixed (?:the|a|an) (?:bug|issue|problem)|something was (?:wrong|broken)|made it work|resolved the issue|improved the code|cleaned up the code|general improvement|did ?n't work(?: correctly| properly)?|wasn'?t working|not working (?:correctly|properly)?)\b/i;

// Review questions that only ask the reader to recall/describe the diff,
// with no transfer to a different situation.
const RECALL_ONLY_QUESTION_PATTERN = /\b(what did you change|what (?:was|did) the (?:fix|change)|summari[sz]e (?:the|your) fix|describe (?:the|your) (?:fix|change)|what changed|how did you fix (?:it|this|the bug|the issue|the problem)|what was the fix)\b/i;

// fixSummary that starts by describing the edit itself ("Added a null
// check...") rather than why that edit fixes the root cause.
const PATCH_VERB_PATTERN = /^(added|removed|changed|replaced|updated|renamed|set|used|called|wrapped|switched|introduced|deleted|inserted|moved|extracted)\b/i;
const WHY_INDICATOR_PATTERN = /\b(because|since|so that|which means|this ensures|no longer|instead of|rather than|avoids?|prevents?|ensures?|so it|so the|guarantees?|means that|to avoid|to prevent)\b/i;

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Words longer than 3 characters carry most of the meaning of a sentence;
// short connectors (the, and, was, for...) inflate overlap artificially.
function significantWords(value: string): Set<string> {
  return new Set(normalizeForComparison(value).split(" ").filter((word) => word.length > 3));
}

// Fraction of `a`'s significant words that also appear in `b` - high values
// mean `a` is mostly a reshuffling of `b`'s vocabulary rather than new content.
function overlapRatio(a: string, b: string): number {
  const wordsA = significantWords(a);
  if (wordsA.size === 0) return 0;
  const wordsB = significantWords(b);
  let shared = 0;
  for (const word of wordsA) if (wordsB.has(word)) shared++;
  return shared / wordsA.size;
}

// A field only counts as a generic placeholder if, once the matched
// boilerplate phrase is removed, nothing specific is left - i.e. the field
// IS basically the boilerplate, not a real sentence that happens to start
// with it (e.g. "Fixed the bug by changing X because Y" is specific even
// though it starts with "fixed the bug").
function isGenericPlaceholder(value: string): boolean {
  const match = GENERIC_PHRASE_PATTERN.exec(value);
  if (!match) return false;
  const remainder = value.slice(0, match.index) + value.slice(match.index + match[0].length);
  return significantWords(remainder).size < 3;
}

export interface LessonQualityResult {
  /** Hard failures - the lesson should not be saved until these are fixed. */
  errors: string[];
  /** Soft issues - the lesson is saved, but the caller is told how to improve it. */
  warnings: string[];
}

/**
 * Decides whether a lesson is a "real" learning-worthy fix versus a mechanical
 * change or a shallow restatement of the same sentence across fields. This is
 * the enforcement side of the MCP_INSTRUCTIONS checklist: the AI is told what
 * a good lesson looks like, and this function rejects lessons that ignore it.
 */
export function assessLessonQuality(input: LessonInput): LessonQualityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasBadExample = Boolean(input.badCodeExample);
  const hasGoodSide = Boolean(input.goodCodeExample || input.codeExample);
  const hasCodeExamples = hasBadExample && hasGoodSide;

  const narrative = `${input.problem} ${input.mistake} ${input.fixSummary}`;
  const hasBehaviorSignal = BEHAVIOR_SIGNAL_PATTERN.test(narrative);

  if (
    !hasCodeExamples &&
    !hasBehaviorSignal &&
    REFACTOR_PATTERN.test(input.mistake) &&
    REFACTOR_PATTERN.test(input.fixSummary)
  ) {
    errors.push(
      "This reads like a mechanical change (move/rename/extract/split/refactor) with no behavior change and no " +
        "broken-vs-corrected code. Mechanical changes should not be saved as lessons. If a real bug was fixed, " +
        "describe the behavior difference in mistake/fixSummary and include badCodeExample/goodCodeExample.",
    );
  }

  if (UI_ONLY_PATTERN.test(narrative) && !hasBehaviorSignal) {
    errors.push(
      "This reads like a UI-only or styling-only change (colors, spacing, className, fonts, etc.) with no " +
        "described user-facing bug or behavior change. Styling tweaks should not be saved as lessons. If this " +
        "actually fixed a behavior (an element became unclickable, content overflowed and broke layout, etc.), " +
        "describe that BEHAVIOR in problem/mistake/fixSummary, not just the visual change.",
    );
  }

  for (const [field, value] of [
    ["mistake", input.mistake],
    ["rootCause", input.rootCause],
    ["fixSummary", input.fixSummary],
  ] as const) {
    if (isGenericPlaceholder(value)) {
      errors.push(
        `${field} ("${value}") is a generic placeholder, not a specific description. State exactly what was ` +
          `wrong or what changed - name the function, condition, or value involved - instead of a generic ` +
          `phrase like "fixed the bug" or "the code was wrong".`,
      );
    }
  }

  if (normalizeForComparison(input.rootCause) === normalizeForComparison(input.mistake)) {
    errors.push(
      "rootCause just repeats mistake word-for-word. rootCause must explain WHY the mistake happened " +
        "(the underlying cause), not restate what went wrong.",
    );
  } else if (normalizeForComparison(input.rootCause) === normalizeForComparison(input.problem)) {
    errors.push(
      "rootCause just repeats problem word-for-word. rootCause must explain the underlying cause of the " +
        "symptom, not restate the symptom itself.",
    );
  } else if (overlapRatio(input.rootCause, input.mistake) >= 0.8) {
    warnings.push(
      "Quality notice: rootCause is almost entirely reworded from mistake. Make sure it explains the " +
        "MECHANISM behind the mistake (why it caused the symptom), not just a rephrasing of the same sentence.",
    );
  }

  if (normalizeForComparison(input.fixSummary) === normalizeForComparison(input.mistake)) {
    errors.push(
      "fixSummary just repeats mistake word-for-word. fixSummary must explain WHY the fix resolves the root " +
        "cause, not restate the mistake.",
    );
  } else if (PATCH_VERB_PATTERN.test(input.fixSummary.trim()) && !WHY_INDICATOR_PATTERN.test(input.fixSummary)) {
    warnings.push(
      "Quality notice: fixSummary reads like a description of the patch (\"Added/Changed/Replaced ...\") " +
        "without saying why that change fixes the root cause. Add the reason, e.g. \"... because ...\" or " +
        "\"... so that ...\".",
    );
  }

  if (
    input.reviewQuestions.length > 0 &&
    input.reviewQuestions.every((question) => RECALL_ONLY_QUESTION_PATTERN.test(question.question))
  ) {
    errors.push(
      "Every review question just asks the reader to recall or describe the fix (e.g. \"what did you change\"). " +
        "At least one review question must be a TRANSFER question: apply the lesson to a different situation, " +
        "spot the same mistake in different code, or predict an outcome under different conditions.",
    );
  }

  if (hasBadExample !== hasGoodSide) {
    warnings.push(
      `Quality notice: Only one side of the broken/corrected comparison was provided. Add ${
        hasBadExample ? "goodCodeExample" : "badCodeExample"
      } so the dashboard can show a meaningful broken-vs-corrected comparison.`,
    );
  } else if (!hasCodeExamples && (input.filesChanged ?? []).length > 0) {
    warnings.push(
      "Quality notice: No code examples were captured. Add badCodeExample and goodCodeExample to make this lesson useful for future review.",
    );
  }

  return { errors, warnings };
}

const LITERAL_ESCAPE_PATTERN = /\\[nrt]/g;

// Catches the case where a caller writes the two characters "\" + "n" (etc.)
// instead of an actual line break, flattening a multi-line snippet onto one
// line. Real newline/tab characters in the value mean it was escaped correctly.
export function assertRealLineBreaks(value: string, field: string): void {
  const literalEscapes = value.match(LITERAL_ESCAPE_PATTERN);
  if (!literalEscapes || literalEscapes.length < 2) return;
  if (/[\n\r\t]/.test(value)) return;
  throw new Error(
    `Invalid lesson: ${field} contains literal "\\n"/"\\t" characters instead of real line breaks. ` +
      `Write the snippet with actual newlines in the string value (not the two-character sequence backslash-n).`,
  );
}

function stringArray(
  value: unknown,
  field: string,
  required = false,
): string[] {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(
      `Invalid lesson: ${field} must be an array of strings.`,
    );
  }
  const result = value.map((item) => item.trim()).filter(Boolean);
  if (required && result.length === 0) {
    throw new Error(
      `Invalid lesson: ${field} must contain at least one value.`,
    );
  }
  return result;
}

function parseTags(value: unknown): Tag[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Invalid lesson: tags must be an array.");
  return value.map((item, index) => {
    if (typeof item === "string") return { name: item.trim() };
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const tag = item as Record<string, unknown>;
      if (typeof tag.name !== "string" || tag.name.trim() === "") {
        throw new Error(`Invalid lesson: tags[${index}].name is required.`);
      }
      return {
        name: tag.name.trim(),
        ...(typeof tag.url === "string" && tag.url.trim() ? { url: tag.url.trim() } : {}),
      };
    }
    throw new Error(`Invalid lesson: tags[${index}] must be a string or { name, url? } object.`);
  });
}

export function validateLessonInput(value: unknown): LessonInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid lesson: expected a JSON object.");
  }

  const input = value as Record<string, unknown>;
  const tool = input.tool ?? "manual";
  if (typeof tool !== "string" || tool.trim() === "") {
    throw new Error("Invalid lesson: tool must be a non-empty string.");
  }

  const understanding = input.understanding ?? "unknown";
  if (
    typeof understanding !== "string" ||
    !UNDERSTANDING.has(understanding as Understanding)
  ) {
    throw new Error(
      "Invalid lesson: understanding must be understood, partial, copied_blindly, or unknown.",
    );
  }

  if (
    !Array.isArray(input.reviewQuestions) ||
    input.reviewQuestions.length === 0
  ) {
    throw new Error(
      "Invalid lesson: at least one review question is required.",
    );
  }

  const reviewQuestions = input.reviewQuestions.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `Invalid lesson: reviewQuestions[${index}] must be an object.`,
      );
    }
    const question = item as Record<string, unknown>;
    return {
      question: requiredString(
        question.question,
        `reviewQuestions[${index}].question`,
      ),
      expectedAnswer: requiredString(
        question.expectedAnswer,
        `reviewQuestions[${index}].expectedAnswer`,
      ),
    };
  });

  const nextReviewAt = input.nextReviewAt;
  if (
    nextReviewAt !== undefined &&
    (typeof nextReviewAt !== "string" || Number.isNaN(Date.parse(nextReviewAt)))
  ) {
    throw new Error("Invalid lesson: nextReviewAt must be a valid date.");
  }

  const codeExample =
    typeof input.codeExample === "string" ? input.codeExample.trim() : undefined;
  const badCodeExample =
    typeof input.badCodeExample === "string" ? input.badCodeExample.trim() : undefined;
  const goodCodeExample =
    typeof input.goodCodeExample === "string" ? input.goodCodeExample.trim() : undefined;

  if (codeExample) assertRealLineBreaks(codeExample, "codeExample");
  if (badCodeExample) assertRealLineBreaks(badCodeExample, "badCodeExample");
  if (goodCodeExample) assertRealLineBreaks(goodCodeExample, "goodCodeExample");

  return {
    tool: tool.trim(),
    projectPath:
      typeof input.projectPath === "string" ? input.projectPath : undefined,
    title: requiredString(input.title, "title"),
    originalPrompt:
      typeof input.originalPrompt === "string"
        ? input.originalPrompt.trim()
        : "",
    problem: requiredString(input.problem, "problem"),
    mistake: requiredString(input.mistake, "mistake"),
    rootCause: requiredString(input.rootCause, "rootCause"),
    fixSummary: requiredString(input.fixSummary, "fixSummary"),
    takeaway: requiredString(input.takeaway, "takeaway"),
    mistakePattern:
      typeof input.mistakePattern === "string"
        ? input.mistakePattern.trim()
        : undefined,
    whenNotApplicable: requiredString(input.whenNotApplicable, "whenNotApplicable"),
    concepts: stringArray(input.concepts, "concepts", true),
    filesChanged: stringArray(input.filesChanged, "filesChanged"),
    codeExample,
    badCodeExample,
    goodCodeExample,
    codeExplanation:
      typeof input.codeExplanation === "string"
        ? input.codeExplanation.trim()
        : undefined,
    practiceTask:
      typeof input.practiceTask === "string"
        ? input.practiceTask.trim()
        : undefined,
    reviewQuestions,
    understanding: understanding as Understanding,
    nextReviewAt,
    sourceDiff:
      typeof input.sourceDiff === "string" ? input.sourceDiff : undefined,
    tags: parseTags(input.tags),
    supersedesLessonId:
      typeof input.supersedesLessonId === "string" && input.supersedesLessonId.trim()
        ? input.supersedesLessonId.trim()
        : undefined,
    supersedeReason:
      typeof input.supersedeReason === "string" ? input.supersedeReason.trim() : undefined,
  };
}
