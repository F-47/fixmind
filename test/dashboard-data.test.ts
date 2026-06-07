import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardData, toDashboardLesson } from "../src/dashboard-data.js";
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
});
