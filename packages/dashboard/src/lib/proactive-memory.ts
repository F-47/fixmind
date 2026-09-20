import type { DashboardLesson } from "./types";

export interface ProactiveMemoryMatch {
  lesson: DashboardLesson;
  score: number;
  matchedFields: string[];
  matchedTerms: string[];
  summary: string;
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "another",
  "before",
  "being",
  "bug",
  "code",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "next",
  "only",
  "same",
  "some",
  "than",
  "that",
  "the",
  "this",
  "when",
  "with",
  "your",
]);

const FIELD_LABELS = {
  title: "title",
  pattern: "mistake pattern",
  files: "changed files",
  concepts: "concepts",
  tags: "tags",
  tool: "tool",
  text: "problem text",
} as const;

const FIELD_WEIGHTS = {
  title: 6,
  pattern: 8,
  files: 5,
  concepts: 4,
  tags: 3,
  tool: 2,
  text: 1,
} as const;

export function findProactiveMemoryMatches(
  currentLesson: DashboardLesson,
  lessons: DashboardLesson[],
  limit = 3,
): ProactiveMemoryMatch[] {
  const currentTokens = lessonTokens(currentLesson);
  return lessons
    .filter((lesson) => lesson.id !== currentLesson.id && lesson.status === "active")
    .map((lesson) => scoreMemoryMatch(currentLesson, lesson, currentTokens))
    .filter((match) => match.score >= 7)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.lesson.reviewCount - a.lesson.reviewCount ||
        b.lesson.updatedAt.localeCompare(a.lesson.updatedAt),
    )
    .slice(0, limit);
}

function scoreMemoryMatch(
  currentLesson: DashboardLesson,
  candidateLesson: DashboardLesson,
  currentTokens: string[],
): ProactiveMemoryMatch {
  const matchedFields = new Set<string>();
  const matchedTerms = new Set<string>();
  let score = 0;

  score += scoreExactMatch(
    currentLesson.mistakePattern ?? "",
    candidateLesson.mistakePattern ?? "",
    "pattern",
    matchedFields,
  );
  score += scoreSharedValues(
    currentLesson.filesChanged,
    candidateLesson.filesChanged,
    "files",
    matchedFields,
  );
  score += scoreSharedValues(
    currentLesson.concepts,
    candidateLesson.concepts,
    "concepts",
    matchedFields,
  );
  score += scoreSharedTags(currentLesson, candidateLesson, matchedFields);
  if (currentLesson.tool === candidateLesson.tool) {
    score += FIELD_WEIGHTS.tool;
    matchedFields.add("tool");
  }
  score += scoreSharedTerms(
    currentTokens,
    lessonTokens(candidateLesson),
    matchedTerms,
    matchedFields,
  );

  return {
    lesson: candidateLesson,
    score,
    matchedFields: [...matchedFields],
    matchedTerms: [...matchedTerms],
    summary: buildSummary(matchedFields, matchedTerms),
  };
}

function scoreExactMatch(
  currentValue: string,
  candidateValue: string,
  field: keyof typeof FIELD_LABELS,
  matchedFields: Set<string>,
): number {
  if (!currentValue || !candidateValue) return 0;
  if (normalize(currentValue) !== normalize(candidateValue)) return 0;
  matchedFields.add(field);
  return FIELD_WEIGHTS[field];
}

function scoreSharedValues(
  currentValues: string[],
  candidateValues: string[],
  field: keyof typeof FIELD_LABELS,
  matchedFields: Set<string>,
): number {
  const shared = sharedItems(currentValues, candidateValues);
  if (shared.length === 0) return 0;
  matchedFields.add(field);
  return Math.min(shared.length * FIELD_WEIGHTS[field], FIELD_WEIGHTS[field] * 2);
}

function scoreSharedTags(
  currentLesson: DashboardLesson,
  candidateLesson: DashboardLesson,
  matchedFields: Set<string>,
): number {
  const currentTags = currentLesson.tags.map((tag) => tag.name);
  const candidateTags = candidateLesson.tags.map((tag) => tag.name);
  const shared = sharedItems(currentTags, candidateTags);
  if (shared.length === 0) return 0;
  matchedFields.add("tags");
  return Math.min(shared.length * FIELD_WEIGHTS.tags, FIELD_WEIGHTS.tags * 2);
}

function scoreSharedTerms(
  currentTokens: string[],
  candidateTokens: string[],
  matchedTerms: Set<string>,
  matchedFields: Set<string>,
): number {
  const shared = sharedItems(currentTokens, candidateTokens).slice(0, 6);
  if (shared.length === 0) return 0;
  for (const term of shared) matchedTerms.add(term);
  matchedFields.add("text");
  return shared.length * FIELD_WEIGHTS.text;
}

function buildSummary(matchedFields: Set<string>, matchedTerms: Set<string>): string {
  const fieldNames = [...matchedFields]
    .slice(0, 2)
    .map((field) => FIELD_LABELS[field as keyof typeof FIELD_LABELS]);
  const reasons: string[] = [];
  if (fieldNames.length > 0) {
    reasons.push(`Shares ${joinList(fieldNames)}.`);
  }
  const terms = [...matchedTerms].slice(0, 4);
  if (terms.length > 0) {
    reasons.push(`Overlaps on ${joinList(terms.map((term) => `"${term}"`))}.`);
  }
  return reasons.length > 0 ? reasons.join(" ") : "Broad pattern match.";
}

function lessonTokens(lesson: DashboardLesson): string[] {
  return tokenize(
    [
      lesson.title,
      lesson.problem,
      lesson.mistake,
      lesson.rootCause,
      lesson.fixSummary,
      lesson.takeaway ?? "",
      lesson.mistakePattern ?? "",
      ...lesson.concepts,
      ...lesson.filesChanged,
      ...lesson.tags.map((tag) => tag.name),
    ].join(" "),
  );
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sharedItems(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map(normalize).filter(Boolean));
  const shared: string[] = [];
  for (const item of left) {
    const normalized = normalize(item);
    if (!normalized || !rightSet.has(normalized)) continue;
    if (!shared.includes(item)) shared.push(item);
  }
  return shared;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
