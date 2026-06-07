import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-sqlite";
import { eq, or, desc, asc, lte, sql } from "drizzle-orm";
import { configPath, dataDirectory, databasePath } from "./paths.js";
import { lessons as lessonsTable } from "./schema.js";
import type {
  Lesson,
  LessonInput,
  ConceptStat,
  MistakeStat,
  ReviewQuestion,
  Understanding,
} from "./types.js";

export interface LessonStore {
  save(input: LessonInput): Lesson;
  get(id: string): Lesson | undefined;
  list(limit?: number): Lesson[];
  search(query: string): Lesson[];
  due(now?: Date): Lesson[];
  updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson;
  conceptStats(): ConceptStat[];
  mistakeStats(): MistakeStat[];
  close(): void;
}

export function initializeDataDirectory(): { directory: string; database: string; config: string } {
  const directory = dataDirectory();
  fs.mkdirSync(directory, { recursive: true });
  const config = configPath();
  if (!fs.existsSync(config)) {
    fs.writeFileSync(
      config,
      `${JSON.stringify({ version: 1, reviewIntervalsDays: { understood: 7, partial: 3, copied_blindly: 1 } }, null, 2)}\n`,
      "utf8",
    );
  }
  return { directory, database: databasePath(), config };
}

export function createLessonStore(filePath = databasePath()): LessonStore {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = drizzle(filePath);

  db.$client.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      tool TEXT NOT NULL,
      project_path TEXT NOT NULL,
      title TEXT NOT NULL,
      original_prompt TEXT NOT NULL,
      problem TEXT NOT NULL,
      mistake TEXT NOT NULL,
      root_cause TEXT NOT NULL,
      fix_summary TEXT NOT NULL,
      takeaway TEXT,
      mistake_pattern TEXT,
      concepts TEXT NOT NULL,
      files_changed TEXT NOT NULL,
      code_example TEXT,
      bad_code_example TEXT,
      good_code_example TEXT,
      code_explanation TEXT,
      practice_task TEXT,
      review_questions TEXT NOT NULL,
      understanding TEXT NOT NULL,
      next_review_at TEXT NOT NULL,
      review_count INTEGER NOT NULL DEFAULT 0,
      source_diff TEXT,
      tags TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_lessons_next_review_at ON lessons(next_review_at);
  `);

  function ensureColumn(name: string, definition: string): void {
    const columns = db.$client.prepare("PRAGMA table_info(lessons)").all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === name)) {
      db.$client.exec(`ALTER TABLE lessons ADD COLUMN ${name} ${definition}`);
    }
  }

  ensureColumn("bad_code_example", "TEXT");
  ensureColumn("good_code_example", "TEXT");
  ensureColumn("takeaway", "TEXT");
  ensureColumn("mistake_pattern", "TEXT");
  ensureColumn("code_explanation", "TEXT");
  ensureColumn("practice_task", "TEXT");

  return {
    save(input: LessonInput): Lesson {
      const now = new Date();
      const lesson: Lesson = {
        id: randomUUID(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        tool: input.tool ?? "manual",
        projectPath: input.projectPath ?? process.cwd(),
        title: input.title,
        originalPrompt: input.originalPrompt ?? "",
        problem: input.problem,
        mistake: input.mistake,
        rootCause: input.rootCause,
        fixSummary: input.fixSummary,
        takeaway: input.takeaway,
        mistakePattern: input.mistakePattern,
        concepts: input.concepts,
        filesChanged: input.filesChanged ?? [],
        codeExample: input.codeExample,
        badCodeExample: input.badCodeExample,
        goodCodeExample: input.goodCodeExample,
        codeExplanation: input.codeExplanation,
        practiceTask: input.practiceTask,
        reviewQuestions: input.reviewQuestions.map((q) => ({
          id: randomUUID(),
          ...q,
          status: "unanswered",
        })),
        understanding: input.understanding ?? "unknown",
        nextReviewAt: input.nextReviewAt ?? addDays(now, 1).toISOString(),
        reviewCount: 0,
        sourceDiff: input.sourceDiff,
        tags: input.tags ?? [],
      };

      db.insert(lessonsTable).values({
        ...lesson,
        takeaway: lesson.takeaway ?? null,
        mistakePattern: lesson.mistakePattern ?? null,
        codeExample: lesson.codeExample ?? null,
        badCodeExample: lesson.badCodeExample ?? null,
        goodCodeExample: lesson.goodCodeExample ?? null,
        codeExplanation: lesson.codeExplanation ?? null,
        practiceTask: lesson.practiceTask ?? null,
        sourceDiff: lesson.sourceDiff ?? null,
      }).run();

      return lesson;
    },

    get(id: string): Lesson | undefined {
      const row = db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).get();
      return row ? fromDb(row) : undefined;
    },

    list(limit = 20): Lesson[] {
      return db.select().from(lessonsTable)
        .orderBy(desc(lessonsTable.createdAt))
        .limit(limit)
        .all()
        .map(fromDb);
    },

    search(query: string): Lesson[] {
      const pattern = `%${query.toLowerCase()}%`;
      return db.select().from(lessonsTable).where(
        or(
          sql`lower(${lessonsTable.title}) like ${pattern}`,
          sql`lower(${lessonsTable.problem}) like ${pattern}`,
          sql`lower(${lessonsTable.rootCause}) like ${pattern}`,
          sql`lower(${lessonsTable.fixSummary}) like ${pattern}`,
          sql`lower(${lessonsTable.takeaway}) like ${pattern}`,
          sql`lower(${lessonsTable.mistakePattern}) like ${pattern}`,
          sql`lower(${lessonsTable.concepts}) like ${pattern}`,
          sql`lower(${lessonsTable.tags}) like ${pattern}`,
        ),
      ).orderBy(desc(lessonsTable.createdAt)).all().map(fromDb);
    },

    due(now = new Date()): Lesson[] {
      return db.select().from(lessonsTable)
        .where(lte(lessonsTable.nextReviewAt, now.toISOString()))
        .orderBy(asc(lessonsTable.nextReviewAt))
        .all()
        .map(fromDb);
    },

    updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson {
      const current = db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).get();
      if (!current) throw new Error(`Lesson not found: ${id}`);

      const count = current.reviewCount + 1;
      const interval = reviewIntervalDays(understanding, count);
      const updatedAt = new Date();

      db.update(lessonsTable).set({
        reviewQuestions: questions,
        understanding,
        updatedAt: updatedAt.toISOString(),
        nextReviewAt: addDays(updatedAt, interval).toISOString(),
        reviewCount: count,
      }).where(eq(lessonsTable.id, id)).run();

      return fromDb(db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).get()!);
    },

    conceptStats(): ConceptStat[] {
      const counts = new Map<string, number>();
      for (const lesson of this.list(Number.MAX_SAFE_INTEGER)) {
        for (const concept of lesson.concepts) {
          counts.set(concept, (counts.get(concept) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },

    mistakeStats(): MistakeStat[] {
      const counts = new Map<string, number>();
      for (const lesson of this.list(Number.MAX_SAFE_INTEGER)) {
        counts.set(lesson.mistake, (counts.get(lesson.mistake) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([mistake, count]) => ({ mistake, count }))
        .sort((a, b) => b.count - a.count || a.mistake.localeCompare(b.mistake));
    },

    close(): void {
      db.$client.close();
    },
  };
}

type DbRow = typeof lessonsTable.$inferSelect;

function fromDb(row: DbRow): Lesson {
  return {
    ...row,
    takeaway: row.takeaway ?? undefined,
    mistakePattern: row.mistakePattern ?? undefined,
    codeExample: row.codeExample ?? undefined,
    badCodeExample: row.badCodeExample ?? undefined,
    goodCodeExample: row.goodCodeExample ?? undefined,
    codeExplanation: row.codeExplanation ?? undefined,
    practiceTask: row.practiceTask ?? undefined,
    sourceDiff: row.sourceDiff ?? undefined,
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function reviewIntervalDays(understanding: Understanding, reviewCount: number): number {
  if (understanding === "copied_blindly") return 1;
  if (understanding === "partial") return Math.min(3 * reviewCount, 14);
  if (understanding === "understood") return Math.min(7 * 2 ** (reviewCount - 1), 60);
  return 1;
}
