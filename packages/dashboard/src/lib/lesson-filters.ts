import type { DashboardLesson, Understanding } from "./types";

export type DateFilter = "all" | "7d" | "30d" | "90d" | "older";
export type LessonStatusFilter = "all" | "active" | "superseded";
export type LearningStateFilter = "all" | "learning" | "understood";
export type UnderstandingFilter = "all" | Understanding;

export interface LessonFilterState {
  query: string;
  learningState: LearningStateFilter;
  understanding: UnderstandingFilter;
  status: LessonStatusFilter;
  client: string;
  concept: string;
  pattern: string;
  file: string;
  date: DateFilter;
}

export const DEFAULT_LESSON_FILTERS: LessonFilterState = {
  query: "",
  learningState: "all",
  understanding: "all",
  status: "all",
  client: "all",
  concept: "",
  pattern: "",
  file: "",
  date: "all",
};

export function filterLessons(
  lessons: DashboardLesson[],
  filters: LessonFilterState,
  now = new Date(),
): DashboardLesson[] {
  const query = normalize(filters.query);
  const queryTerms = tokenize(query);
  return lessons.filter(
    (lesson) =>
      matchesStatus(lesson, filters.status) &&
      matchesLearningState(lesson, filters.learningState) &&
      matchesUnderstanding(lesson, filters.understanding) &&
      matchesExactTool(lesson, filters.client) &&
      matchesDate(lesson.createdAt, filters.date, now) &&
      matchesText(lesson, query, queryTerms) &&
      matchesFieldText(lesson.concepts, filters.concept) &&
      matchesFieldText(lesson.filesChanged, filters.file) &&
      matchesPattern(lesson, filters.pattern),
  );
}

function matchesStatus(lesson: DashboardLesson, filter: LessonStatusFilter): boolean {
  return filter === "all" || lesson.status === filter;
}

function matchesLearningState(lesson: DashboardLesson, filter: LearningStateFilter): boolean {
  if (filter === "all") return true;
  if (filter === "learning") return lesson.understanding !== "understood";
  return lesson.understanding === "understood";
}

function matchesUnderstanding(lesson: DashboardLesson, filter: UnderstandingFilter): boolean {
  return filter === "all" || lesson.understanding === filter;
}

function matchesExactTool(lesson: DashboardLesson, filter: string): boolean {
  return filter === "all" || lesson.tool === filter;
}

function matchesDate(value: string, filter: DateFilter, now: Date): boolean {
  if (filter === "all") return true;
  const ageDays = Math.floor((now.getTime() - Date.parse(value)) / 86_400_000);
  if (filter === "7d") return ageDays <= 7;
  if (filter === "30d") return ageDays <= 30;
  if (filter === "90d") return ageDays <= 90;
  return ageDays > 90;
}

function matchesText(lesson: DashboardLesson, query: string, terms: string[]): boolean {
  if (!query) return true;
  const haystack = normalize(
    [
      lesson.title,
      lesson.problem,
      lesson.mistake,
      lesson.rootCause,
      lesson.fixSummary,
      lesson.takeaway ?? "",
      lesson.mistakePattern ?? "",
      lesson.tool,
      lesson.projectPath,
      lesson.concepts.join(" "),
      lesson.filesChanged.join(" "),
      lesson.tags.map((tag) => tag.name).join(" "),
    ].join(" "),
  );
  if (terms.length === 0) return haystack.includes(query);
  return terms.every((term) => haystack.includes(term));
}

function matchesFieldText(values: string[], filter: string): boolean {
  const trimmed = filter.trim();
  if (!trimmed) return true;
  const needle = normalize(trimmed);
  return values.some((value) => normalize(value).includes(needle));
}

function matchesPattern(lesson: DashboardLesson, filter: string): boolean {
  const trimmed = filter.trim();
  if (!trimmed) return true;
  const needle = normalize(trimmed);
  return normalize(
    [
      lesson.mistakePattern ?? "",
      lesson.displayPattern,
      lesson.mistake,
      lesson.rootCause,
      lesson.fixSummary,
    ].join(" "),
  ).includes(needle);
}

function tokenize(query: string): string[] {
  return query
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
