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
    takeaway:
      typeof input.takeaway === "string" ? input.takeaway.trim() : undefined,
    mistakePattern:
      typeof input.mistakePattern === "string"
        ? input.mistakePattern.trim()
        : undefined,
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
