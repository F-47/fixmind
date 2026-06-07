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

export interface DashboardData {
  lessons: DashboardLesson[];
  due: DashboardLesson[];
  topics: ConceptStat[];
  patterns: PatternStat[];
  summary: {
    total: number;
    due: number;
    learning: number;
    understood: number;
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
    topics,
    patterns: groupPatterns(all),
    summary: {
      total: all.length,
      due: dueIds.size,
      learning: all.filter((lesson) => isLearning(lesson.understanding)).length,
      understood: all.filter((lesson) => lesson.understanding === "understood").length,
    },
  };
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

function isLearning(understanding: Understanding): boolean {
  return understanding !== "understood";
}

function concise(value: string, maximum = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}...`;
}
