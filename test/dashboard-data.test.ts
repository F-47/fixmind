import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardData, buildProgressData, toDashboardLesson } from "../src/dashboard-data.js";
import type { Lesson } from "../src/types.js";

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    tool: "codex",
    projectPath: "/project",
    title: "Release object URLs",
    originalPrompt: "Fix preview memory use",
    problem: "Preview data stayed in memory.",
    mistake: "Object URLs were never revoked.",
    rootCause: "The component owned a browser resource without cleanup.",
    fixSummary: "Revoke each object URL when the preview changes or unmounts.",
    concepts: ["Resource cleanup"],
    filesChanged: ["Upload.tsx"],
    reviewQuestions: [{ id: "q1", question: "When should it be revoked?", expectedAnswer: "On replacement or cleanup.", status: "unanswered" }],
    understanding: "unknown",
    nextReviewAt: "2026-06-02T00:00:00.000Z",
    reviewCount: 0,
    tags: [],
    ...overrides,
  };
}

test("uses deterministic presentation fallbacks for old lessons", () => {
  const view = toDashboardLesson(lesson());
  assert.equal(view.displayTakeaway, "Revoke each object URL when the preview changes or unmounts.");
  assert.equal(view.displayPattern, "Resource cleanup");
});

test("groups patterns and keeps summary totals independent of search results", () => {
  const first = lesson();
  const second = lesson({
    id: "lesson-2",
    title: "Clean subscriptions",
    mistakePattern: "Resource cleanup",
    understanding: "understood",
  });
  const data = buildDashboardData(
    [first, second],
    [first],
    [first],
    [{ name: "Resource cleanup", count: 2 }],
  );
  assert.equal(data.lessons.length, 1);
  assert.deepEqual(data.summary, { total: 2, due: 1, learning: 1, understood: 1 });
  assert.deepEqual(data.patterns[0], {
    name: "Resource cleanup",
    count: 2,
    lessonIds: ["lesson-1", "lesson-2"],
  });
  assert.equal(data.progress.lessonsPerWeek.length, 12);
  assert.equal(data.progress.understandingByWeek.length, 12);
});

test("buildProgressData buckets lessons into weeks and fills empty weeks with zero", () => {
  const now = new Date("2026-06-08T12:00:00.000Z"); // a Monday
  const lessons = [
    lesson({ id: "a", createdAt: "2026-06-08T03:00:00.000Z", understanding: "understood" }),
    lesson({ id: "b", createdAt: "2026-06-08T20:00:00.000Z", understanding: "partial" }),
    lesson({ id: "c", createdAt: "2026-06-01T10:00:00.000Z", understanding: "copied_blindly" }),
    lesson({ id: "d", createdAt: "2025-01-01T00:00:00.000Z", understanding: "unknown" }),
  ];

  const progress = buildProgressData(lessons, 4, now);

  assert.deepEqual(progress.lessonsPerWeek, [
    { weekStart: "2026-05-18", count: 0 },
    { weekStart: "2026-05-25", count: 0 },
    { weekStart: "2026-06-01", count: 1 },
    { weekStart: "2026-06-08", count: 2 },
  ]);
  assert.deepEqual(progress.understandingByWeek, [
    { weekStart: "2026-05-18", understood: 0, partial: 0, copied_blindly: 0, unknown: 0 },
    { weekStart: "2026-05-25", understood: 0, partial: 0, copied_blindly: 0, unknown: 0 },
    { weekStart: "2026-06-01", understood: 0, partial: 0, copied_blindly: 1, unknown: 0 },
    { weekStart: "2026-06-08", understood: 1, partial: 1, copied_blindly: 0, unknown: 0 },
  ]);
});
