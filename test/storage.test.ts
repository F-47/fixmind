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
    tags: [{ name: "nextjs" }],
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

test("updates a lesson, preserving untouched fields and bumping updatedAt", () => {
  withStore((store) => {
    const saved = store.save(input());
    const before = saved.updatedAt;

    const updated = store.update(saved.id, {
      title: "Updated title",
      concepts: ["New concept"],
    });

    assert.equal(updated.title, "Updated title");
    assert.deepEqual(updated.concepts, ["New concept"]);
    assert.equal(updated.problem, saved.problem);
    assert.equal(updated.mistake, saved.mistake);
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(before));
    assert.equal(store.get(saved.id)?.title, "Updated title");
  });
});

test("update rejects empty required fields and unknown ids", () => {
  withStore((store) => {
    const saved = store.save(input());
    assert.throws(() => store.update(saved.id, { title: "  " }), /title is required/);
    assert.throws(() => store.update("missing-id", { title: "New" }), /Lesson not found/);
  });
});

test("deletes a lesson", () => {
  withStore((store) => {
    const saved = store.save(input());
    assert.equal(store.delete(saved.id), true);
    assert.equal(store.get(saved.id), undefined);
    assert.deepEqual(store.list(), []);
    assert.equal(store.delete(saved.id), false);
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

test("new lessons default to active status", () => {
  withStore((store) => {
    const saved = store.save(input());
    assert.equal(saved.status, "active");
    assert.equal(saved.supersededBy, undefined);
    assert.equal(saved.supersedes, undefined);
    assert.equal(saved.supersedeReason, undefined);
  });
});

test("save with supersedesLessonId links and supersedes the old lesson", () => {
  withStore((store) => {
    const oldLesson = store.save(input({ title: "Wrong fix" }));
    const newLesson = store.save(input({
      title: "Correct fix",
      supersedesLessonId: oldLesson.id,
      supersedeReason: "The first fix did not actually resolve the bug.",
    }));

    const reloadedOld = store.get(oldLesson.id)!;
    assert.equal(reloadedOld.status, "superseded");
    assert.equal(reloadedOld.supersededBy, newLesson.id);
    assert.equal(reloadedOld.supersedeReason, "The first fix did not actually resolve the bug.");

    assert.equal(newLesson.status, "active");
    assert.equal(newLesson.supersedes, oldLesson.id);
    assert.equal(newLesson.supersedeReason, "The first fix did not actually resolve the bug.");
  });
});

test("search and due exclude superseded lessons by default", () => {
  withStore((store) => {
    const oldLesson = store.save(input({
      title: "Wrong fix",
      nextReviewAt: "2020-01-01T00:00:00.000Z",
    }));
    store.save(input({ title: "Correct fix", supersedesLessonId: oldLesson.id }));

    assert.deepEqual(store.search("Wrong fix"), []);
    assert.deepEqual(store.due(new Date("2020-01-02T00:00:00.000Z")), []);

    const withSuperseded = store.search("Wrong fix", { includeSuperseded: true });
    assert.equal(withSuperseded.length, 1);
    assert.equal(withSuperseded[0].id, oldLesson.id);
  });
});

test("save with an unresolvable supersedesLessonId does not throw", () => {
  withStore((store) => {
    const saved = store.save(input({ supersedesLessonId: "missing-id" }));
    assert.equal(saved.status, "active");
    assert.equal(saved.supersedes, undefined);
  });
});

test("supersede links lessons and rejects unknown ids", () => {
  withStore((store) => {
    const oldLesson = store.save(input({ title: "Wrong fix" }));
    const newLesson = store.save(input({ title: "Correct fix" }));

    const result = store.supersede(oldLesson.id, newLesson.id, "Replaced by a better fix");
    assert.equal(result.old.status, "superseded");
    assert.equal(result.old.supersededBy, newLesson.id);
    assert.equal(result.old.supersedeReason, "Replaced by a better fix");
    assert.equal(result.new.supersedes, oldLesson.id);
    assert.equal(result.new.supersedeReason, "Replaced by a better fix");

    assert.throws(() => store.supersede("missing-id", newLesson.id), /Lesson not found/);
    assert.throws(() => store.supersede(oldLesson.id, "missing-id"), /Lesson not found/);
  });
});

test("list and get still return superseded lessons", () => {
  withStore((store) => {
    const oldLesson = store.save(input({ title: "Wrong fix" }));
    store.save(input({ title: "Correct fix", supersedesLessonId: oldLesson.id }));

    assert.equal(store.get(oldLesson.id)?.status, "superseded");
    assert.ok(store.list().some((lesson) => lesson.id === oldLesson.id));
  });
});

test("conceptStats and mistakeStats exclude superseded lessons", () => {
  withStore((store) => {
    const oldLesson = store.save(input());
    store.save(input({
      title: "Correct fix",
      supersedesLessonId: oldLesson.id,
      concepts: ["Next.js hydration"],
    }));

    assert.deepEqual(store.conceptStats()[0], { name: "Next.js hydration", count: 1 });
    assert.deepEqual(store.mistakeStats()[0], {
      mistake: "Read localStorage during render",
      count: 1,
    });
  });
});
