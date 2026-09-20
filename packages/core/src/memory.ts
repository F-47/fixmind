import type { LessonStore } from "./storage.js";
import type { Lesson, Tag } from "./types.js";

export interface MemoryOptions {
  query?: string;
  limit?: number;
}

export type MemoryMatchField =
  | "title"
  | "pattern"
  | "concepts"
  | "tags"
  | "files"
  | "problem"
  | "mistake"
  | "rootCause"
  | "fixSummary"
  | "takeaway"
  | "scope";

export interface MemoryMatchDetail {
  score: number;
  matchedFields: MemoryMatchField[];
  matchedTerms: string[];
  summary: string;
}

export interface MemoryResult {
  lesson: Lesson;
  match: MemoryMatchDetail;
}

interface ScoredLesson {
  lesson: Lesson;
  score: number;
  specificity: number;
  match: MemoryMatchDetail;
}

const MEMORY_MATCH_FIELD_LABELS: Record<MemoryMatchField, string> = {
  title: "title",
  pattern: "mistake pattern",
  concepts: "concepts",
  tags: "tags",
  files: "changed files",
  problem: "problem",
  mistake: "mistake",
  rootCause: "root cause",
  fixSummary: "fix summary",
  takeaway: "takeaway",
  scope: "scope",
};

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
  filesChanged: 2,
  tags: 2,
} as const;

export function getMemoryLessons(store: LessonStore, options: MemoryOptions = {}): Lesson[] {
  return getMemoryResults(store, options).map(({ lesson }) => lesson);
}

export function getMemoryResults(store: LessonStore, options: MemoryOptions = {}): MemoryResult[] {
  const limit = Math.max(1, options.limit ?? 5);
  const query = normalizeQuery(options.query ?? "");
  const terms = tokenize(query);

  if (terms.length === 0) {
    return store.topReviewed(limit).map((lesson) => ({ lesson, match: emptyMemoryMatch(lesson) }));
  }

  const scored = store
    .textCandidates(terms)
    .map((lesson) => scoreLesson(lesson, terms, query))
    .filter(({ score, match }) => score > 0 || match.matchedFields.length > 0);

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.specificity - a.specificity ||
      b.lesson.reviewCount - a.lesson.reviewCount ||
      b.lesson.updatedAt.localeCompare(a.lesson.updatedAt),
  );

  return scored.slice(0, limit).map(({ lesson, match }) => ({ lesson, match }));
}

export function formatMemoryLessons(lessons: Lesson[]): string {
  return formatMemoryResults(
    lessons.map((lesson) => ({ lesson, match: emptyMemoryMatch(lesson) })),
  );
}

export function formatMemoryResults(results: MemoryResult[]): string {
  if (results.length === 0) return "No memory lessons found.";
  return results
    .map(({ lesson, match }, index) => {
      const concepts = lesson.concepts.length > 0 ? lesson.concepts.join(", ") : "none";
      const pattern = lesson.mistakePattern ? `Pattern: ${lesson.mistakePattern}` : null;
      const scope = lesson.whenNotApplicable ? `Scope: ${lesson.whenNotApplicable}` : null;
      const takeaway = lesson.takeaway ?? lesson.fixSummary;
      const whyMatched = match.summary;
      return [
        `${index + 1}. ${lesson.title} (${lesson.id.slice(0, 8)})`,
        `   Takeaway: ${takeaway}`,
        `   Why matched: ${whyMatched}`,
        ...(pattern ? [`   ${pattern}`] : []),
        ...(scope ? [`   ${scope}`] : []),
        `   Concepts: ${concepts}`,
        `   Reviewed: ${lesson.reviewCount} time(s)`,
      ].join("\n");
    })
    .join("\n\n");
}

function scoreLesson(lesson: Lesson, terms: string[], query: string): ScoredLesson {
  const haystacks: Array<{
    label: MemoryMatchField;
    text: string;
    weight: number;
    specific: number;
  }> = [
    { label: "title", text: lesson.title, weight: FIELD_WEIGHTS.title, specific: 6 },
    {
      label: "pattern",
      text: lesson.mistakePattern ?? "",
      weight: FIELD_WEIGHTS.pattern,
      specific: 5,
    },
    {
      label: "concepts",
      text: lesson.concepts.join(" "),
      weight: FIELD_WEIGHTS.concept,
      specific: 4,
    },
    {
      label: "tags",
      text: lesson.tags.map((tag: Tag) => tag.name).join(" "),
      weight: FIELD_WEIGHTS.tags,
      specific: 4,
    },
    {
      label: "files",
      text: lesson.filesChanged.join(" "),
      weight: FIELD_WEIGHTS.filesChanged,
      specific: 3,
    },
    { label: "problem", text: lesson.problem, weight: FIELD_WEIGHTS.problem, specific: 2 },
    { label: "mistake", text: lesson.mistake, weight: FIELD_WEIGHTS.mistake, specific: 2 },
    { label: "rootCause", text: lesson.rootCause, weight: FIELD_WEIGHTS.rootCause, specific: 2 },
    { label: "fixSummary", text: lesson.fixSummary, weight: FIELD_WEIGHTS.fixSummary, specific: 1 },
    { label: "takeaway", text: lesson.takeaway ?? "", weight: FIELD_WEIGHTS.takeaway, specific: 1 },
    {
      label: "scope",
      text: lesson.whenNotApplicable ?? "",
      weight: FIELD_WEIGHTS.whenNotApplicable,
      specific: 1,
    },
  ];

  let score = 0;
  let specificity = 0;
  const matchedFields = new Set<MemoryMatchField>();
  const matchedTerms = new Set<string>();
  for (const term of terms) {
    for (const field of haystacks) {
      if (field.text.toLowerCase().includes(term)) {
        score += field.weight;
        specificity += field.specific;
        matchedFields.add(field.label);
        matchedTerms.add(term);
      }
    }
  }
  const normalizedQuery = query;
  const exactField = haystacks.find((field) => field.text.toLowerCase().includes(normalizedQuery));
  if (exactField) {
    score += exactField.weight * 2;
    specificity += exactField.specific;
    matchedFields.add(exactField.label);
  }
  if (matchedTerms.size === terms.length && terms.length > 0) {
    score += 3;
  }
  if (score > 0) score += lesson.reviewCount;

  return {
    lesson,
    score,
    specificity,
    match: {
      score,
      matchedFields: [...matchedFields],
      matchedTerms: [...matchedTerms],
      summary: summarizeMatch(lesson, [...matchedFields], [...matchedTerms], query),
    },
  };
}

function tokenize(query: string): string[] {
  return normalizeQuery(query)
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function summarizeMatch(
  _lesson: Lesson,
  matchedFields: MemoryMatchField[],
  matchedTerms: string[],
  query: string,
): string {
  if (matchedFields.length === 0) {
    return `Ranked as a broad match for "${query}".`;
  }

  const topFields = matchedFields.slice(0, 2).map((field) => MEMORY_MATCH_FIELD_LABELS[field]);
  const termText =
    matchedTerms.length > 0 ? ` for ${matchedTerms.map((term) => `"${term}"`).join(", ")}` : "";
  return `Matched ${topFields.join(" and ")}${termText}.`;
}

function emptyMemoryMatch(lesson: Lesson): MemoryMatchDetail {
  const fallbackScore = lesson.reviewCount * 10 + Date.parse(lesson.updatedAt) / 1_000_000_000;
  return {
    score: fallbackScore,
    matchedFields: [],
    matchedTerms: [],
    summary: "Ranked by review history and recent updates.",
  };
}
