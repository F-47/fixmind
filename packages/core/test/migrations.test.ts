import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { getMemoryResults } from "../src/memory.js";
import { createLessonStore } from "../src/storage.js";
import type { Lesson } from "../src/types.js";
import { validateLessonInput } from "../src/validation.js";

function tempDatabasePath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-migrations-"));
  return path.join(directory, "test.db");
}

function lessonInput(overrides: Record<string, unknown> = {}) {
  return validateLessonInput({
    tool: "test",
    title: "Async timing lesson",
    problem: "State updated before the await resolved",
    mistake: "Assumed fetch resolved after body parsing",
    rootCause: "fetch resolves when headers arrive, not when the body is parsed",
    fixSummary: "Await response.json before touching the parsed state",
    takeaway: "fetch() resolves on headers, not on a parsed body.",
    mistakePattern: "Missing await",
    whenNotApplicable: "Does not apply to streams consumed incrementally.",
    concepts: ["async timing"],
    filesChanged: ["src/app.ts"],
    badCodeExample: "const data = await fetch(url);",
    goodCodeExample: "const res = await fetch(url); const data = await res.json();",
    codeExplanation: "The fixed version separates header arrival from body parsing.",
    practiceTask: "Audit one fetch call for missing await res.json().",
    reviewQuestions: [
      { question: "When does a fetch promise resolve?", expectedAnswer: "When headers arrive." },
    ],
    understanding: "understood",
    tags: [],
    ...overrides,
  });
}

function readUserVersion(filePath: string): number {
  const db = new DatabaseSync(filePath);
  try {
    const row = db.prepare("PRAGMA user_version").get() as unknown as { user_version: number };
    return row.user_version;
  } finally {
    db.close();
  }
}

function tableExists(filePath: string, name: string): boolean {
  const db = new DatabaseSync(filePath);
  try {
    return Boolean(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name),
    );
  } finally {
    db.close();
  }
}

function triggerExists(filePath: string, name: string): boolean {
  const db = new DatabaseSync(filePath);
  try {
    return Boolean(
      db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND name = ?").get(name),
    );
  } finally {
    db.close();
  }
}

function downgradeToPreVersioning(filePath: string): void {
  const legacy = new DatabaseSync(filePath);
  legacy.exec("DROP TRIGGER lessons_fts_au");
  legacy.exec("DROP TRIGGER lessons_fts_ad");
  legacy.exec("DROP TRIGGER lessons_fts_ai");
  legacy.exec("DROP TABLE lessons_fts");
  legacy.exec("ALTER TABLE lessons DROP COLUMN ease");
  legacy.exec("ALTER TABLE lessons DROP COLUMN last_interval_days");
  legacy.exec("PRAGMA user_version = 0");
  legacy.close();
}

test("a fresh store creates the schema, indexes, and fts index", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    store.save(lessonInput());
    assert.equal(store.search("async timing").length, 1);
  } finally {
    store.close();
  }

  assert.equal(readUserVersion(filePath), 3);
  assert.ok(tableExists(filePath, "lessons"));
  assert.ok(tableExists(filePath, "lessons_fts"));
  assert.ok(!fs.existsSync(`${filePath}.bak`));
});

test("a pre-versioning database is migrated, backed up, and rebuilt into fts", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  const saved = store.save(
    lessonInput({ title: "Legacy hydration lesson", concepts: ["hydration"] }),
  );
  store.close();

  downgradeToPreVersioning(filePath);

  assert.equal(readUserVersion(filePath), 0);
  assert.ok(!tableExists(filePath, "lessons_fts"));

  const migrated = createLessonStore(filePath);
  try {
    assert.ok(fs.existsSync(`${filePath}.bak`));
    assert.equal(readUserVersion(filePath), 3);
    assert.ok(tableExists(filePath, "lessons_fts"));
    const found = migrated.search("legacy hydration");
    assert.equal(found.length, 1);
    assert.equal(found[0].id, saved.id);
    assert.equal(found[0].ease, 2.5);
  } finally {
    migrated.close();
  }
});

test("reopening a migrated database is a no-op and does not rewrite the backup", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  store.save(lessonInput());
  store.close();

  downgradeToPreVersioning(filePath);

  const first = createLessonStore(filePath);
  first.close();
  const backupStat = fs.statSync(`${filePath}.bak`);

  const second = createLessonStore(filePath);
  try {
    assert.equal(readUserVersion(filePath), 3);
    assert.equal(second.search("async timing").length, 1);
  } finally {
    second.close();
  }
  const backupStatAfter = fs.statSync(`${filePath}.bak`);
  assert.equal(backupStatAfter.mtimeMs, backupStat.mtimeMs);
  assert.equal(backupStatAfter.size, backupStat.size);
});

test("reopening repairs an incomplete fts installation", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  const saved = store.save(lessonInput({ title: "Repairable search index" }));
  store.close();

  const damaged = new DatabaseSync(filePath);
  damaged.exec("DROP TRIGGER lessons_fts_ai");
  damaged.close();
  assert.equal(triggerExists(filePath, "lessons_fts_ai"), false);

  const repaired = createLessonStore(filePath);
  try {
    assert.equal(triggerExists(filePath, "lessons_fts_ai"), true);
    assert.equal(repaired.search("repairable search")[0]?.id, saved.id);
    const later = repaired.save(lessonInput({ title: "Indexed after repair" }));
    assert.equal(repaired.search("indexed after repair")[0]?.id, later.id);
  } finally {
    repaired.close();
  }
});

test("the fts index follows every store write path", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    const saved = store.save(lessonInput({ title: "WebSocket cleanup lesson" }));
    assert.equal(store.search("websocket cleanup").length, 1);

    store.update(saved.id, { title: "Renamed event listener lesson" });
    assert.equal(store.search("websocket cleanup").length, 0);
    assert.equal(store.search("renamed event listener").length, 1);

    const remote: Lesson = {
      ...saved,
      id: "remote-lesson-id",
      title: "Upserted remote retry lesson",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    store.upsertFromRemote(remote);
    assert.equal(store.search("upserted remote retry").length, 1);

    store.delete(remote.id);
    assert.equal(store.search("upserted remote retry").length, 0);

    store.reset();
    assert.equal(store.search("renamed event listener").length, 0);
  } finally {
    store.close();
  }
});

test("topReviewed orders by the same score formula as the previous full scan", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    const seeds: Array<Partial<Lesson> & { id: string; title: string }> = [
      {
        id: "few-reviews-recent",
        title: "Few reviews, very recent",
        reviewCount: 2,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "more-reviews-old",
        title: "More reviews, long ago",
        reviewCount: 3,
        updatedAt: "2020-01-01T00:00:00.000Z",
      },
      {
        id: "top",
        title: "Heavy reviews, recent",
        reviewCount: 9,
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ];
    for (const seed of seeds) {
      store.upsertFromRemote({
        ...lessonInput(),
        id: seed.id,
        title: seed.title,
        projectPath: "/tmp/migrations-test",
        originalPrompt: "",
        nextReviewAt: "2026-01-01T00:00:00.000Z",
        reviewCount: seed.reviewCount,
        createdAt: seed.updatedAt,
        updatedAt: seed.updatedAt,
        status: "active",
      } as unknown as Lesson);
    }

    const expected = [...seeds]
      .map((seed) => ({
        id: seed.id,
        score: (seed.reviewCount ?? 0) * 10 + Date.parse(seed.updatedAt as string) / 1_000_000_000,
      }))
      .sort((a, b) => b.score - a.score)
      .map((seed) => seed.id);

    assert.deepEqual(
      store.topReviewed(3).map((lesson) => lesson.id),
      expected,
    );
  } finally {
    store.close();
  }
});

test("memory matches mid-word substrings exactly like the previous scorer", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    const saved = store.save(
      lessonInput({ title: "Streaming parser lesson", mistakePattern: "async assumption" }),
    );
    store.updateReview(saved.id, [], "understood");

    const results = getMemoryResults(store, { query: "sync assumption", limit: 5 });
    assert.equal(results.length, 1);
    assert.equal(results[0].lesson.id, saved.id);
    assert.ok(results[0].match.matchedTerms.includes("sync"));
  } finally {
    store.close();
  }
});

test("short search queries still work through the legacy path", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    store.save(lessonInput({ title: "Abstract boundary leak" }));
    assert.equal(store.search("ab").length, 1);
    assert.equal(store.search("abstract boundary").length, 1);
  } finally {
    store.close();
  }
});

function downgradeToPreV3(filePath: string): void {
  const legacy = new DatabaseSync(filePath);
  legacy.exec("ALTER TABLE lessons DROP COLUMN ease");
  legacy.exec("ALTER TABLE lessons DROP COLUMN last_interval_days");
  legacy.exec("PRAGMA user_version = 2");
  legacy.close();
}

test("migration v3 seeds existing schedules from the legacy formula", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  const understood = store.save(lessonInput({ title: "Understood streak lesson" }));
  const partial = store.save(lessonInput({ title: "Partial streak lesson" }));
  const fresh = store.save(lessonInput({ title: "Never reviewed lesson" }));
  store.close();

  const seed = new DatabaseSync(filePath);
  seed
    .prepare("UPDATE lessons SET review_count = 3, understanding = 'understood' WHERE id = ?")
    .run(understood.id);
  seed
    .prepare("UPDATE lessons SET review_count = 5, understanding = 'partial' WHERE id = ?")
    .run(partial.id);
  seed.close();
  downgradeToPreV3(filePath);

  const migrated = createLessonStore(filePath);
  try {
    assert.equal(readUserVersion(filePath), 3);

    const seededUnderstood = migrated.get(understood.id);
    assert.equal(seededUnderstood?.lastIntervalDays, 28);
    assert.equal(seededUnderstood?.ease, 2.5);

    const seededPartial = migrated.get(partial.id);
    assert.equal(seededPartial?.lastIntervalDays, 14);

    const neverReviewed = migrated.get(fresh.id);
    assert.equal(neverReviewed?.lastIntervalDays, null);
    assert.equal(neverReviewed?.ease, 2.5);

    const continued = migrated.updateReview(understood.id, [], "understood");
    assert.equal(continued.lastIntervalDays, 60);
    const daysOut = (Date.parse(continued.nextReviewAt) - Date.now()) / 86_400_000;
    assert.ok(daysOut > 59.9 && daysOut < 60.1, `next review was ${daysOut} days out`);
  } finally {
    migrated.close();
  }
});

test("lessons synced from older clients keep working without ease data", () => {
  const filePath = tempDatabasePath();
  const store = createLessonStore(filePath);
  try {
    const saved = store.save(lessonInput());
    const { ...remote } = saved;
    delete (remote as Partial<typeof remote>).ease;
    delete (remote as Partial<typeof remote>).lastIntervalDays;

    store.upsertFromRemote(remote);
    const restored = store.get(saved.id);
    assert.equal(restored?.ease, 2.5);
    assert.equal(restored?.lastIntervalDays, null);
  } finally {
    store.close();
  }
});
