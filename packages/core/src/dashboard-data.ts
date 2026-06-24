import type { Lesson, ConceptStat, Understanding } from "./types.js";

export interface DashboardLesson extends Lesson {
  displayTakeaway: string;
  displayPattern: string;
}

export interface PatternStat {
  name: string;
  count: number;
  lessonIds: string[];
}

export interface WeeklyCount {
  weekStart: string;
  count: number;
}

export interface UnderstandingBreakdown {
  weekStart: string;
  understood: number;
  partial: number;
  copied_blindly: number;
  unknown: number;
}

export interface ProgressData {
  lessonsPerWeek: WeeklyCount[];
  understandingByWeek: UnderstandingBreakdown[];
}

export interface DashboardData {
  lessons: DashboardLesson[];
  due: DashboardLesson[];
  models: ConceptStat[];
  topics: ConceptStat[];
  patterns: PatternStat[];
  progress: ProgressData;
  summary: {
    total: number;
    due: number;
    learning: number;
    understood: number;
    memoryReady: number;
  };
}

export function buildDashboardData(
  allLessons: Lesson[],
  visibleLessons: Lesson[],
  dueLessons: Lesson[],
  topics: ConceptStat[],
): DashboardData {
  const all = allLessons.map(toDashboardLesson);
  const visibleIds = new Set(visibleLessons.map((lesson) => lesson.id));
  const dueIds = new Set(dueLessons.map((lesson) => lesson.id));
  return {
    lessons: all.filter((lesson) => visibleIds.has(lesson.id)),
    due: all.filter((lesson) => dueIds.has(lesson.id)),
    models: groupModels(all),
    topics,
    patterns: groupPatterns(all),
    progress: buildProgressData(allLessons),
    summary: {
      total: all.length,
      due: dueIds.size,
      learning: all.filter((lesson) => isLearning(lesson.understanding)).length,
      understood: all.filter((lesson) => lesson.understanding === "understood").length,
      memoryReady: all.filter((lesson) => lesson.status === "active" && lesson.reviewCount > 0).length,
    },
  };
}

export function buildProgressData(allLessons: Lesson[], weeks = 12, now = new Date()): ProgressData {
  const currentWeekStart = startOfWeek(now);
  const buckets: string[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    buckets.push(toIsoDate(addWeeks(currentWeekStart, -i)));
  }

  const counts = new Map<string, number>(buckets.map((week) => [week, 0]));
  const understandingCounts = new Map<string, UnderstandingBreakdown>(
    buckets.map((week) => [
      week,
      { weekStart: week, understood: 0, partial: 0, copied_blindly: 0, unknown: 0 },
    ]),
  );

  for (const lesson of allLessons) {
    const week = toIsoDate(startOfWeek(new Date(lesson.createdAt)));
    if (!counts.has(week)) continue;
    counts.set(week, (counts.get(week) ?? 0) + 1);
    understandingCounts.get(week)![lesson.understanding] += 1;
  }

  return {
    lessonsPerWeek: buckets.map((week) => ({ weekStart: week, count: counts.get(week) ?? 0 })),
    understandingByWeek: buckets.map((week) => understandingCounts.get(week)!),
  };
}

function startOfWeek(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (result.getUTCDay() + 6) % 7;
  result.setUTCDate(result.getUTCDate() - daysSinceMonday);
  return result;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDashboardLesson(lesson: Lesson): DashboardLesson {
  return {
    ...lesson,
    displayTakeaway: lesson.takeaway?.trim() || concise(lesson.fixSummary),
    displayPattern: lesson.mistakePattern?.trim()
      || lesson.concepts[0]?.trim()
      || "General debugging",
  };
}

function groupPatterns(lessons: DashboardLesson[]): PatternStat[] {
  const groups = new Map<string, PatternStat>();
  for (const lesson of lessons) {
    const key = lesson.displayPattern.toLocaleLowerCase();
    const current = groups.get(key) ?? {
      name: lesson.displayPattern,
      count: 0,
      lessonIds: [],
    };
    current.count += 1;
    current.lessonIds.push(lesson.id);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function groupModels(lessons: DashboardLesson[]): ConceptStat[] {
  const counts = new Map<string, number>();
  for (const lesson of lessons) {
    counts.set(lesson.tool, (counts.get(lesson.tool) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function isLearning(understanding: Understanding): boolean {
  return understanding !== "understood";
}

function concise(value: string, maximum = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}...`;
}
