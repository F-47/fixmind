import type { LessonStore } from "./storage.js";
import type { Lesson, Tag } from "./types.js";

export interface MemoryOptions {
  query?: string;
  limit?: number;
}

interface ScoredLesson {
  lesson: Lesson;
  score: number;
}

const FIELD_WEIGHTS = {
  title: 6,
  pattern: 5,
  concept: 4,
  problem: 3,
  mistake: 3,
  rootCause: 2,
  fixSummary: 2,
  takeaway: 2,
  whenNotApplicable: 1,
  tags: 2,
} as const;

export function getMemoryLessons(store: LessonStore, options: MemoryOptions = {}): Lesson[] {
  const limit = Math.max(1, options.limit ?? 5);
  const query = normalizeQuery(options.query ?? "");
  const terms = tokenize(query);
  const scored = store
    .list(Number.MAX_SAFE_INTEGER)
    .filter((lesson) => lesson.status === "active" && lesson.reviewCount > 0)
    .map((lesson) => ({ lesson, score: scoreLesson(lesson, terms) }))
    .filter(({ score }) => terms.length === 0 ? true : score > 0);

  scored.sort((a, b) =>
    b.score - a.score ||
    b.lesson.reviewCount - a.lesson.reviewCount ||
    b.lesson.updatedAt.localeCompare(a.lesson.updatedAt),
  );

  return scored.slice(0, limit).map(({ lesson }) => lesson);
}

export function formatMemoryLessons(lessons: Lesson[]): string {
  if (lessons.length === 0) return "No memory lessons found.";
  return lessons.map((lesson, index) => {
    const concepts = lesson.concepts.length > 0 ? lesson.concepts.join(", ") : "none";
    const pattern = lesson.mistakePattern ? `Pattern: ${lesson.mistakePattern}` : null;
    const scope = lesson.whenNotApplicable ? `Scope: ${lesson.whenNotApplicable}` : null;
    const takeaway = lesson.takeaway ?? lesson.fixSummary;
    return [
      `${index + 1}. ${lesson.title} (${lesson.id.slice(0, 8)})`,
      `   Takeaway: ${takeaway}`,
      ...(pattern ? [`   ${pattern}`] : []),
      ...(scope ? [`   ${scope}`] : []),
      `   Concepts: ${concepts}`,
      `   Reviewed: ${lesson.reviewCount} time(s)`,
    ].join("\n");
  }).join("\n\n");
}

function scoreLesson(lesson: Lesson, terms: string[]): number {
  if (terms.length === 0) {
    return lesson.reviewCount * 10 + Date.parse(lesson.updatedAt) / 1_000_000_000;
  }

  const haystacks: Array<{ text: string; weight: number }> = [
    { text: lesson.title, weight: FIELD_WEIGHTS.title },
    { text: lesson.mistakePattern ?? "", weight: FIELD_WEIGHTS.pattern },
    { text: lesson.problem, weight: FIELD_WEIGHTS.problem },
    { text: lesson.mistake, weight: FIELD_WEIGHTS.mistake },
    { text: lesson.rootCause, weight: FIELD_WEIGHTS.rootCause },
    { text: lesson.fixSummary, weight: FIELD_WEIGHTS.fixSummary },
    { text: lesson.takeaway ?? "", weight: FIELD_WEIGHTS.takeaway },
    { text: lesson.whenNotApplicable ?? "", weight: FIELD_WEIGHTS.whenNotApplicable },
    { text: lesson.concepts.join(" "), weight: FIELD_WEIGHTS.concept },
    { text: lesson.tags.map((tag: Tag) => tag.name).join(" "), weight: FIELD_WEIGHTS.tags },
  ];

  let score = 0;
  for (const term of terms) {
    for (const field of haystacks) {
      if (field.text.toLowerCase().includes(term)) {
        score += field.weight;
      }
    }
  }
  if (score > 0) score += lesson.reviewCount;
  return score;
}

function tokenize(query: string): string[] {
  return normalizeQuery(query)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
