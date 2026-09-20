import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getMemoryLessons, getMemoryResults } from "../src/memory.js";
import { createLessonStore } from "../src/storage.js";

function lessonInput(
  title: string,
  takeaway: string,
  problem: string,
  extra: Record<string, unknown> = {},
) {
  return {
    title,
    problem,
    mistake: `Mistake for ${title}`,
    rootCause: `Root cause for ${title}`,
    fixSummary: `Fix summary for ${title}`,
    takeaway,
    whenNotApplicable: `Does not apply to ${title.toLowerCase()}`,
    concepts: [title.toLowerCase()],
    reviewQuestions: [{ question: `How does ${title} transfer?`, expectedAnswer: takeaway }],
    ...extra,
  };
}

test("memory only includes active reviewed lessons and skips superseded ones", () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-memory-"));
  const dbPath = path.join(dataDirectory, "learning.db");
  const store = createLessonStore(dbPath);
  try {
    const oldLesson = store.save(
      lessonInput(
        "Hydration mismatch",
        "Keep the first server and browser render identical.",
        "Initial renders differed",
      ),
    );
    store.updateReview(oldLesson.id, oldLesson.reviewQuestions, "understood");

    const newLesson = store.save(
      lessonInput(
        "Hydration fix",
        "Read browser-only state after mount.",
        "Initial renders differed",
      ),
    );
    store.updateReview(newLesson.id, newLesson.reviewQuestions, "understood");

    const unreviewed = store.save(
      lessonInput(
        "Preview cleanup",
        "Remove listeners on cleanup.",
        "Preview data stayed in memory",
      ),
    );

    store.supersede(oldLesson.id, newLesson.id, "The first lesson used the wrong fix.");

    const memory = getMemoryLessons(store, { query: "hydration", limit: 5 });
    assert.equal(memory.length, 1);
    assert.equal(memory[0].id, newLesson.id);
    assert.notEqual(memory[0].id, oldLesson.id);
    assert.notEqual(memory[0].id, unreviewed.id);
  } finally {
    store.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("memory command prints the retrieved lessons", () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-memory-cli-"));
  const dbPath = path.join(dataDirectory, "learning.db");
  const store = createLessonStore(dbPath);
  try {
    const lesson = store.save(
      lessonInput(
        "Stale closure",
        "Capture the latest value in the effect.",
        "The handler used an old value",
      ),
    );
    store.updateReview(lesson.id, lesson.reviewQuestions, "understood");

    const output = execFileSync(
      process.execPath,
      [path.resolve("dist/src/cli.js"), "memory", "closure", "--limit", "5"],
      {
        env: { ...process.env, FIXMIND_DATA_DIR: dataDirectory } as Record<string, string>,
        encoding: "utf8",
      },
    );

    assert.match(output, /Stale closure/);
    assert.match(output, /Capture the latest value/);
    assert.match(output, /Why matched:/);
  } finally {
    store.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

test("memory prefers a title match over a weaker concept match and explains why", () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-memory-rank-"));
  const dbPath = path.join(dataDirectory, "learning.db");
  const store = createLessonStore(dbPath);
  try {
    const titleMatch = store.save(
      lessonInput(
        "Stale closure",
        "Capture the latest value in the effect.",
        "The handler used an old value",
        { concepts: ["react-hooks"] },
      ),
    );
    store.updateReview(titleMatch.id, titleMatch.reviewQuestions, "understood");

    const conceptMatch = store.save(
      lessonInput(
        "Effect timing",
        "Use the latest value after commit.",
        "The handler used an old value",
        { concepts: ["closure"] },
      ),
    );
    store.updateReview(conceptMatch.id, conceptMatch.reviewQuestions, "understood");

    const ranked = getMemoryResults(store, { query: "closure", limit: 5 });
    assert.equal(ranked[0].lesson.id, titleMatch.id);
    assert.match(ranked[0].match.summary, /title/i);
    assert.match(ranked[0].match.summary, /"closure"/i);
    assert.equal(ranked[0].match.matchedFields.includes("title"), true);
    assert.equal(ranked[0].match.matchedTerms.includes("closure"), true);
  } finally {
    store.close();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});
