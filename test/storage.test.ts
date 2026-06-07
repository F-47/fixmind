import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLessonStore, type LessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

function input(overrides: Record<string, unknown> = {}) {
  return validateLessonInput({
    tool: "codex",
    title: "Hydration mismatch",
    originalPrompt: "Fix the theme toggle",
    problem: "Server and client markup differed",
    mistake: "Read localStorage during render",
    rootCause: "Browser APIs are unavailable during SSR",
    fixSummary: "Read localStorage after hydration",
    concepts: ["Next.js hydration", "SSR/browser APIs"],
    filesChanged: ["app/theme.tsx"],
    reviewQuestions: [{
      question: "Why did hydration fail?",
      expectedAnswer: "The initial renders differed",
    }],
    understanding: "unknown",
    tags: ["nextjs"],
    ...overrides,
  });
}

function withStore(run: (store: LessonStore) => void): void {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-"));
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    run(store);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("saves, lists, and searches lessons", () => {
  withStore((store) => {
    const saved = store.save(input());
    assert.equal(store.list()[0].id, saved.id);
    assert.equal(store.search("browser APIs")[0].title, "Hydration mismatch");
    assert.equal(store.search("nextjs")[0].id, saved.id);
    assert.deepEqual(store.search("missing"), []);
  });
});

test("returns due reviews and advances the schedule", () => {
  withStore((store) => {
    const saved = store.save(input({ nextReviewAt: "2020-01-01T00:00:00.000Z" }));
    const due = store.due(new Date("2020-01-02T00:00:00.000Z"));
    assert.equal(due.length, 1);

    const questions = saved.reviewQuestions.map((question) => ({
      ...question,
      userAnswer: "The initial markup differed",
      status: "answered" as const,
    }));
    const updated = store.updateReview(saved.id, questions, "understood");
    assert.equal(updated.reviewCount, 1);
    assert.equal(updated.understanding, "understood");
    assert.ok(Date.parse(updated.nextReviewAt) > Date.now());
  });
});

test("aggregates repeated concepts and mistakes", () => {
  withStore((store) => {
    store.save(input());
    store.save(input({ title: "Second occurrence" }));
    store.save(input({
      title: "Type narrowing",
      mistake: "Used an unchecked union value",
      concepts: ["TypeScript narrowing"],
    }));

    assert.deepEqual(store.conceptStats()[0], { name: "Next.js hydration", count: 2 });
    assert.deepEqual(store.mistakeStats()[0], {
      mistake: "Read localStorage during render",
      count: 2,
    });
  });
});

test("rejects incomplete lesson input", () => {
  assert.throws(
    () => validateLessonInput({ title: "Incomplete" }),
    /at least one review question is required/,
  );
  assert.throws(
    () => input({ concepts: [] }),
    /concepts must contain at least one value/,
  );
});
