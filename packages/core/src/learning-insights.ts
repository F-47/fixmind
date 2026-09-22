import type { ConceptStat, Lesson } from "./types.js";

export interface LearningInsights {
  periodDays: number;
  recentLessons: number;
  topMistakePatterns: ConceptStat[];
  forgottenConcepts: ConceptStat[];
  recurringFiles: ConceptStat[];
  recurringTools: ConceptStat[];
}

export function buildLearningInsights(
  lessons: Lesson[],
  now = new Date(),
  periodDays = 30,
): LearningInsights {
  const recentLessons = selectRecentLessons(lessons, now, periodDays);
  const fragileLessons = recentLessons.filter(isStillLearning);
  return {
    periodDays,
    recentLessons: recentLessons.length,
    topMistakePatterns: rankStrings(recentLessons.map(selectMistakePattern)),
    forgottenConcepts: rankStrings(fragileLessons.flatMap((lesson) => lesson.concepts)),
    recurringFiles: rankStrings(recentLessons.flatMap((lesson) => lesson.filesChanged)),
    recurringTools: rankStrings(recentLessons.map((lesson) => lesson.tool)),
  };
}

export function formatLearningInsightsReport(insights: LearningInsights): string[] {
  const period = periodLabel(insights.periodDays);
  const lines = reportHeader(insights);
  lines.push(
    ...reportSection(
      `Top mistake patterns ${period}`,
      insights.topMistakePatterns,
      "No recent lessons were captured in this window.",
    ),
  );
  lines.push(
    ...reportSection(
      "Most forgotten concepts",
      insights.forgottenConcepts,
      "No recently reviewed lessons are still marked as learning.",
    ),
  );
  lines.push(
    ...reportSection(
      "Recurring files",
      insights.recurringFiles,
      `No repeated files yet in the last ${insights.periodDays} days.`,
    ),
  );
  lines.push(
    ...reportSection(
      "Recurring tools",
      insights.recurringTools,
      `No repeated tools yet in the last ${insights.periodDays} days.`,
    ),
  );
  const focus = insights.topMistakePatterns[0]?.name ?? insights.forgottenConcepts[0]?.name;
  if (focus) lines.push("", `Next step: focus on ${focus} first.`);
  return lines;
}

function periodLabel(periodDays: number): string {
  return periodDays <= 7 ? "this week" : "this month";
}

function selectRecentLessons(lessons: Lesson[], now: Date, periodDays: number): Lesson[] {
  const cutoff = now.getTime() - periodDays * 24 * 60 * 60 * 1_000;
  return lessons.filter(
    (lesson) =>
      lesson.status === "active" &&
      (isRecent(lesson.createdAt, cutoff) || isRecent(lesson.updatedAt, cutoff)),
  );
}

function isRecent(timestamp: string, cutoff: number): boolean {
  return Date.parse(timestamp) >= cutoff;
}

function isStillLearning(lesson: Lesson): boolean {
  return (
    lesson.status === "active" && lesson.reviewCount > 0 && lesson.understanding !== "understood"
  );
}

function selectMistakePattern(lesson: Lesson): string {
  return lesson.mistakePattern?.trim() || lesson.concepts[0]?.trim() || "General debugging";
}

function rankStrings(values: string[]): ConceptStat[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const name = value.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function formatRankedSection(items: ConceptStat[], emptyMessage: string): string[] {
  if (items.length === 0) return [`- ${emptyMessage}`];
  return items.slice(0, 3).map((item) => `- ${item.name}: ${item.count} time(s)`);
}

function reportHeader(insights: LearningInsights): string[] {
  return [
    `Learning insights (${insights.periodDays} days)`,
    `Recent lessons analyzed: ${insights.recentLessons}`,
  ];
}

function reportSection(title: string, items: ConceptStat[], emptyMessage: string): string[] {
  return ["", title, ...formatRankedSection(items, emptyMessage)];
}
