import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  installStarterLessons,
  isStarterLesson,
  STARTER_TAG,
  starterLessonCount,
  starterLessonInputs,
} from "../src/starter-lessons.js";
import type { LessonStore } from "../src/storage.js";
import { createLessonStore } from "../src/storage.js";
import { assessLessonQuality } from "../src/validation.js";

function withStore(run: (store: LessonStore) => void): () => void {
  return () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-starter-"));
    const store = createLessonStore(path.join(directory, "test.db"));
    try {
      run(store);
    } finally {
      store.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  };
}

test("every starter lesson passes the quality gate", () => {
  const inputs = starterLessonInputs();
  assert.equal(inputs.length, starterLessonCount());
  for (const input of inputs) {
    const quality = assessLessonQuality(input);
    assert.deepEqual(
      quality.errors,
      [],
      `starter lesson "${input.title}" failed the quality gate: ${quality.errors.join("; ")}`,
    );
  }
});

test("starter lessons are tagged and due over the first day", () => {
  const inputs = starterLessonInputs();
  const now = Date.now();
  for (const input of inputs) {
    assert.ok(input.tags?.some((tag) => tag.name === STARTER_TAG));
    assert.equal(input.projectPath, "fixmind://starter");
    const dueIn = Date.parse(input.nextReviewAt ?? "") - now;
    assert.ok(dueIn > 0 && dueIn <= 24 * 60 * 60 * 1_000, `${input.title} due ${dueIn}ms out`);
  }
});

test("installing the starter pack is idempotent", () => {
  withStore((store) => {
    const first = installStarterLessons(store);
    assert.equal(first.skipped, false);
    assert.equal(first.installed, starterLessonCount());
    assert.equal(store.list(Number.MAX_SAFE_INTEGER).length, starterLessonCount());

    const second = installStarterLessons(store);
    assert.equal(second.skipped, true);
    assert.equal(second.installed, 0);
    assert.equal(store.list(Number.MAX_SAFE_INTEGER).length, starterLessonCount());
  })();
});

test("starter lessons are excluded from stats but stay reviewable", () => {
  withStore((store) => {
    installStarterLessons(store);
    assert.ok(store.conceptStats(isStarterLesson).length === 0);
    assert.ok(store.mistakeStats(isStarterLesson).length === 0);
    assert.ok(store.conceptStats().length > 0);

    const starters = store.list(Number.MAX_SAFE_INTEGER).filter(isStarterLesson);
    assert.equal(starters.length, starterLessonCount());
    assert.equal(store.due().length, 0);

    const reviewed = store.updateReview(starters[0].id, [], "understood");
    assert.equal(reviewed.reviewCount, 1);
    assert.ok(reviewed.ease > 2.5);
  })();
});
