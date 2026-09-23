import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { legacyIntervalDays, nextReviewSchedule } from "../src/review-schedule.js";
import { createLessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

function assertClose(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to be close to ${expected}`);
}

function lessonInput() {
  return validateLessonInput({
    tool: "test",
    title: "Async boundary lesson",
    problem: "State was read before the promise settled",
    mistake: "Assumed the promise resolved with parsed data",
    rootCause: "The promise resolves before the body is decoded",
    fixSummary: "Await the body decoding before reading state",
    takeaway: "Resolve-then-decode is two steps, not one.",
    mistakePattern: "Missing await",
    whenNotApplicable: "Does not apply to already-buffered responses.",
    concepts: ["async timing"],
    filesChanged: ["src/load.ts"],
    badCodeExample: "const data = await fetch(url);",
    goodCodeExample: "const res = await fetch(url); const data = await res.json();",
    codeExplanation: "The fixed version separates arrival from decoding.",
    practiceTask: "Check one fetch call for a missing body await.",
    reviewQuestions: [
      { question: "When is the body safe to read?", expectedAnswer: "After decoding resolves." },
    ],
    understanding: "understood",
    tags: [],
  });
}

test("the legacy schedule formula is preserved for migrations", () => {
  assert.equal(legacyIntervalDays("understood", 1), 7);
  assert.equal(legacyIntervalDays("understood", 2), 14);
  assert.equal(legacyIntervalDays("understood", 3), 28);
  assert.equal(legacyIntervalDays("understood", 5), 60);
  assert.equal(legacyIntervalDays("partial", 1), 3);
  assert.equal(legacyIntervalDays("partial", 5), 14);
  assert.equal(legacyIntervalDays("copied_blindly", 4), 1);
  assert.equal(legacyIntervalDays("unknown", 3), 1);
});

test("understood reviews grow adaptively and cap at 60 days", () => {
  let ease = 2.5;
  let last: number | null = null;

  const first = nextReviewSchedule("understood", ease, last);
  assert.equal(first.intervalDays, 7);
  assertClose(first.ease, 2.6);
  ease = first.ease;
  last = first.lastIntervalDays;

  const second = nextReviewSchedule("understood", ease, last);
  assert.equal(second.intervalDays, 19);
  assertClose(second.ease, 2.7);
  ease = second.ease;
  last = second.lastIntervalDays;

  const third = nextReviewSchedule("understood", ease, last);
  assert.equal(third.intervalDays, 53);
  assertClose(third.ease, 2.8);
  ease = third.ease;
  last = third.lastIntervalDays;

  const fourth = nextReviewSchedule("understood", ease, last);
  assert.equal(fourth.intervalDays, 60);
  assertClose(fourth.ease, 2.9);
  assert.equal(fourth.lastIntervalDays, 60);
});

test("partial reviews keep the 14-day ceiling", () => {
  let ease = 2.5;
  let last: number | null = null;

  const first = nextReviewSchedule("partial", ease, last);
  assert.equal(first.intervalDays, 3);
  assertClose(first.ease, 2.36);
  ease = first.ease;
  last = first.lastIntervalDays;

  const second = nextReviewSchedule("partial", ease, last);
  assert.equal(second.intervalDays, 7);
  ease = second.ease;
  last = second.lastIntervalDays;

  const third = nextReviewSchedule("partial", ease, last);
  assert.equal(third.intervalDays, 14);
  ease = third.ease;
  last = third.lastIntervalDays;

  const fourth = nextReviewSchedule("partial", ease, last);
  assert.equal(fourth.intervalDays, 14);
});

test("a lapse resets the interval ladder and penalizes ease", () => {
  const clean = nextReviewSchedule("understood", 2.7, 19);
  const lapse = nextReviewSchedule("copied_blindly", 2.7, 19);

  assert.equal(lapse.intervalDays, 1);
  assert.equal(lapse.lastIntervalDays, null);
  assertClose(lapse.ease, 2.16);
  assert.ok(lapse.ease < clean.ease);
});

test("recovery after a lapse climbs more slowly than a clean history", () => {
  const lapse = nextReviewSchedule("copied_blindly", 2.5, 7);
  const recovery = nextReviewSchedule("understood", lapse.ease, lapse.lastIntervalDays);
  assert.equal(recovery.intervalDays, 7);

  const nextStep = nextReviewSchedule("understood", recovery.ease, recovery.lastIntervalDays);
  const cleanFirst = nextReviewSchedule("understood", 2.5, null);
  const cleanSecond = nextReviewSchedule(
    "understood",
    cleanFirst.ease,
    cleanFirst.lastIntervalDays,
  );

  assert.ok(nextStep.intervalDays < cleanSecond.intervalDays);
  assert.ok(recovery.ease < cleanFirst.ease);
});

test("ease never drops below 1.3", () => {
  let ease = 2.5;
  for (let i = 0; i < 5; i++) {
    ease = nextReviewSchedule("copied_blindly", ease, 19).ease;
  }
  assertClose(ease, 1.3);
});

test("unknown understanding is treated as a lapse", () => {
  const schedule = nextReviewSchedule("unknown", 2.5, 19);
  assert.equal(schedule.intervalDays, 1);
  assert.equal(schedule.lastIntervalDays, null);
});

test("a partial grade after an understood streak drops back to the partial ceiling", () => {
  const schedule = nextReviewSchedule("partial", 2.7, 19);
  assert.equal(schedule.intervalDays, 14);
});

test("the store persists the adaptive schedule on review", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-schedule-"));
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    const saved = store.save(lessonInput());
    assert.equal(saved.ease, 2.5);
    assert.equal(saved.lastIntervalDays, null);

    const updated = store.updateReview(saved.id, [], "understood");
    assert.equal(updated.reviewCount, 1);
    assert.equal(updated.lastIntervalDays, 7);
    assertClose(updated.ease, 2.6);

    const daysOut = (Date.parse(updated.nextReviewAt) - Date.now()) / 86_400_000;
    assert.ok(daysOut > 6.9 && daysOut < 7.1, `next review was ${daysOut} days out`);

    const again = store.updateReview(saved.id, [], "understood");
    assert.equal(again.reviewCount, 2);
    assert.equal(again.lastIntervalDays, 19);
    assertClose(again.ease, 2.7);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
