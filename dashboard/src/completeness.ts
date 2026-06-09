import type { DashboardLesson } from "./types";

export interface CompletenessCheck {
  label: string;
  earned: number;
  max: number;
  passed: boolean;
}

export interface CompletenessResult {
  score: number;
  checks: CompletenessCheck[];
}

export function computeCompleteness(lesson: DashboardLesson): CompletenessResult {
  const checks: Omit<CompletenessCheck, "earned">[] = [
    { label: "Has takeaway",           max: 15, passed: Boolean(lesson.takeaway?.trim()) },
    { label: "Has code examples",      max: 20, passed: Boolean(lesson.badCodeExample && lesson.goodCodeExample) },
    { label: "Has practice task",      max: 15, passed: Boolean(lesson.practiceTask?.trim()) },
    { label: "Has code explanation",   max: 10, passed: Boolean(lesson.codeExplanation?.trim()) },
    { label: "Has doc link in tags",   max: 15, passed: Boolean(lesson.tags?.some((t) => t.url)) },
    { label: "Has mistake pattern",    max: 10, passed: Boolean(lesson.mistakePattern?.trim()) },
    { label: "Has 2+ review questions",max: 15, passed: lesson.reviewQuestions.length >= 2 },
  ];

  const full = checks.map((c) => ({ ...c, earned: c.passed ? c.max : 0 }));
  return { score: full.reduce((sum, c) => sum + c.earned, 0), checks: full };
}

export function completenessColor(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}
