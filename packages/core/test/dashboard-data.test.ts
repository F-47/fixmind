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
    reviewQuestions: [
      {
        id: "q1",
        question: "When should it be revoked?",
        expectedAnswer: "On replacement or cleanup.",
        status: "unanswered",
      },
    ],
    understanding: "unknown",
    nextReviewAt: "2026-06-02T00:00:00.000Z",
    reviewCount: 0,
    ease: 2.5,
    lastIntervalDays: null,
    tags: [],
    status: "active",
    ...overrides,
  };
}

test("uses deterministic presentation fallbacks for old lessons", () => {
  const view = toDashboardLesson(lesson());
  assert.equal(
    view.displayTakeaway,
    "Revoke each object URL when the preview changes or unmounts.",
  );
  assert.equal(view.displayPattern, "Resource cleanup");
});

test("groups patterns and keeps summary totals independent of search results", () => {
  const first = lesson();
  const second = lesson({
    id: "lesson-2",
    title: "Clean subscriptions",
    mistakePattern: "Resource cleanup",
    understanding: "understood",
    reviewCount: 1,
  });
  const data = buildDashboardData(
    [first, second],
    [first],
    [first],
    [{ name: "Resource cleanup", count: 2 }],
  );
  assert.equal(data.lessons.length, 1);
  assert.deepEqual(data.summary, { total: 2, due: 1, learning: 1, understood: 1, memoryReady: 1 });
  assert.deepEqual(data.patterns[0], {
    name: "Resource cleanup",
    count: 2,
    lessonIds: ["lesson-1", "lesson-2"],
  });
  assert.equal(data.progress.lessonsPerWeek.length, 12);
  assert.equal(data.progress.understandingByWeek.length, 12);
});

test("buildDashboardData includes monthly learning insights from recent lessons", () => {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const lessons = [
    lesson({
      id: "recent-1",
      createdAt: "2026-06-29T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z",
      mistakePattern: "Hydration timing",
      concepts: ["Hydration"],
      filesChanged: ["app/theme.tsx"],
      tool: "codex",
      understanding: "partial",
      reviewCount: 2,
    }),
    lesson({
      id: "recent-2",
      createdAt: "2026-06-20T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z",
      mistakePattern: "Hydration timing",
      concepts: ["Hydration"],
      filesChanged: ["app/theme.tsx"],
      tool: "claude",
      understanding: "copied_blindly",
      reviewCount: 1,
    }),
    lesson({
      id: "recent-3",
      createdAt: "2026-06-22T12:00:00.000Z",
      updatedAt: "2026-06-22T12:00:00.000Z",
      mistakePattern: "Async timing",
      concepts: ["Async control flow"],
      filesChanged: ["src/api.ts"],
      tool: "codex",
      understanding: "understood",
      reviewCount: 0,
    }),
    lesson({
      id: "old-1",
      createdAt: "2026-04-01T12:00:00.000Z",
      updatedAt: "2026-04-01T12:00:00.000Z",
      mistakePattern: "Stale closure",
      concepts: ["React hooks"],
      filesChanged: ["src/legacy.ts"],
      tool: "codex",
      understanding: "partial",
      reviewCount: 3,
    }),
  ];

  const data = buildDashboardData(
    lessons,
    lessons,
    lessons.slice(0, 2),
    [{ name: "Hydration timing", count: 2 }],
    now,
  );

  assert.equal(data.insights.periodDays, 30);
  assert.equal(data.insights.recentLessons, 3);
  assert.deepEqual(data.insights.topMistakePatterns.slice(0, 2), [
    { name: "Hydration timing", count: 2 },
    { name: "Async timing", count: 1 },
  ]);
  assert.deepEqual(data.insights.forgottenConcepts, [{ name: "Hydration", count: 2 }]);
  assert.deepEqual(data.insights.recurringFiles[0], { name: "app/theme.tsx", count: 2 });
  assert.deepEqual(data.insights.recurringTools[0], { name: "codex", count: 2 });
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
