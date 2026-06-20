import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { configPath, dataDirectory, databasePath } from "./paths.js";
import { assertRealLineBreaks } from "./validation.js";
import type {
  Lesson,
  LessonInput,
  LessonStatus,
  ConceptStat,
  MistakeStat,
  ReviewQuestion,
  Tag,
  Understanding,
} from "./types.js";

export interface LessonStore {
  save(input: LessonInput): Lesson;
  get(id: string): Lesson | undefined;
  list(limit?: number): Lesson[];
  search(query: string, options?: { includeSuperseded?: boolean }): Lesson[];
  due(now?: Date): Lesson[];
  updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson;
  update(id: string, partial: Partial<LessonInput>): Lesson;
  delete(id: string): boolean;
  reset(): void;
  supersede(oldId: string, newId: string, reason?: string): { old: Lesson; new: Lesson };
  conceptStats(): ConceptStat[];
  mistakeStats(): MistakeStat[];
  close(): void;
}

interface RawRow {
  id: string;
  created_at: string;
  updated_at: string;
  tool: string;
  project_path: string;
  title: string;
  original_prompt: string;
  problem: string;
  mistake: string;
  root_cause: string;
  fix_summary: string;
  takeaway: string | null;
  mistake_pattern: string | null;
  when_not_applicable: string | null;
  concepts: string;
  files_changed: string;
  code_example: string | null;
  bad_code_example: string | null;
  good_code_example: string | null;
  code_explanation: string | null;
  practice_task: string | null;
  review_questions: string;
  understanding: string;
  next_review_at: string;
  review_count: number;
  source_diff: string | null;
  tags: string;
  status: string;
  superseded_by: string | null;
  supersedes: string | null;
  supersede_reason: string | null;
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
  const db = new DatabaseSync(filePath);

  db.exec(`
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
      when_not_applicable TEXT,
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
      tags TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      superseded_by TEXT,
      supersedes TEXT,
      supersede_reason TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_lessons_next_review_at ON lessons(next_review_at);
  `);

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
        whenNotApplicable: input.whenNotApplicable,
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
        status: "active",
      };

      db.prepare(`
        INSERT INTO lessons (
          id, created_at, updated_at, tool, project_path, title, original_prompt,
          problem, mistake, root_cause, fix_summary, takeaway, mistake_pattern,
          when_not_applicable, concepts, files_changed, code_example, bad_code_example,
          good_code_example, code_explanation, practice_task, review_questions,
          understanding, next_review_at, review_count, source_diff, tags,
          status, superseded_by, supersedes, supersede_reason
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL
        )
      `).run(
        lesson.id, lesson.createdAt, lesson.updatedAt, lesson.tool, lesson.projectPath,
        lesson.title, lesson.originalPrompt, lesson.problem, lesson.mistake,
        lesson.rootCause, lesson.fixSummary,
        lesson.takeaway ?? null, lesson.mistakePattern ?? null, lesson.whenNotApplicable ?? null,
        JSON.stringify(lesson.concepts), JSON.stringify(lesson.filesChanged),
        lesson.codeExample ?? null, lesson.badCodeExample ?? null, lesson.goodCodeExample ?? null,
        lesson.codeExplanation ?? null, lesson.practiceTask ?? null,
        JSON.stringify(lesson.reviewQuestions),
        lesson.understanding, lesson.nextReviewAt, lesson.reviewCount,
        lesson.sourceDiff ?? null, JSON.stringify(lesson.tags), lesson.status,
      );

      if (input.supersedesLessonId && this.get(input.supersedesLessonId)) {
        this.supersede(input.supersedesLessonId, lesson.id, input.supersedeReason);
        lesson.supersedes = input.supersedesLessonId;
        lesson.supersedeReason = input.supersedeReason;
      }

      return lesson;
    },

    get(id: string): Lesson | undefined {
      const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as RawRow | undefined;
      return row ? fromDb(row) : undefined;
    },

    list(limit = 20): Lesson[] {
      return (db.prepare("SELECT * FROM lessons ORDER BY created_at DESC LIMIT ?").all(limit) as unknown as RawRow[]).map(fromDb);
    },

    search(query: string, options: { includeSuperseded?: boolean } = {}): Lesson[] {
      const pattern = `%${query.toLowerCase()}%`;
      const cols = ["title", "problem", "root_cause", "fix_summary", "takeaway", "mistake_pattern", "concepts", "tags"];
      const textWhere = cols.map((c) => `lower(${c}) LIKE ?`).join(" OR ");
      const sql = options.includeSuperseded
        ? `SELECT * FROM lessons WHERE (${textWhere}) ORDER BY created_at DESC`
        : `SELECT * FROM lessons WHERE (${textWhere}) AND status != 'superseded' ORDER BY created_at DESC`;
      return (db.prepare(sql).all(...Array<string>(cols.length).fill(pattern)) as unknown as RawRow[]).map(fromDb);
    },

    due(now = new Date()): Lesson[] {
      return (db.prepare(
        "SELECT * FROM lessons WHERE next_review_at <= ? AND status != 'superseded' ORDER BY next_review_at ASC",
      ).all(now.toISOString()) as unknown as RawRow[]).map(fromDb);
    },

    updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson {
      const current = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as RawRow | undefined;
      if (!current) throw new Error(`Lesson not found: ${id}`);

      const count = current.review_count + 1;
      const updatedAt = new Date();
      const nextReviewAt = addDays(updatedAt, reviewIntervalDays(understanding, count));

      db.prepare(
        "UPDATE lessons SET review_questions=?, understanding=?, updated_at=?, next_review_at=?, review_count=? WHERE id=?",
      ).run(JSON.stringify(questions), understanding, updatedAt.toISOString(), nextReviewAt.toISOString(), count, id);

      return fromDb(db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as RawRow);
    },

    update(id: string, partial: Partial<LessonInput>): Lesson {
      if (!(db.prepare("SELECT id FROM lessons WHERE id = ?").get(id))) {
        throw new Error(`Lesson not found: ${id}`);
      }

      const sets: string[] = ["updated_at = ?"];
      const params: (string | number | null)[] = [new Date().toISOString()];

      const reqFields = ["title", "problem", "mistake", "rootCause", "fixSummary"] as const;
      const reqCols: Record<typeof reqFields[number], string> = {
        title: "title", problem: "problem", mistake: "mistake",
        rootCause: "root_cause", fixSummary: "fix_summary",
      };
      for (const f of reqFields) {
        const v = partial[f];
        if (v === undefined) continue;
        if (v.trim() === "") throw new Error(`Invalid lesson: ${f} is required.`);
        params.push(v.trim()); sets.push(`${reqCols[f]} = ?`);
      }

      const optFields = [
        "takeaway", "mistakePattern", "whenNotApplicable",
        "codeExample", "badCodeExample", "goodCodeExample",
        "codeExplanation", "practiceTask",
      ] as const;
      const optCols: Record<typeof optFields[number], string> = {
        takeaway: "takeaway", mistakePattern: "mistake_pattern",
        whenNotApplicable: "when_not_applicable", codeExample: "code_example",
        badCodeExample: "bad_code_example", goodCodeExample: "good_code_example",
        codeExplanation: "code_explanation", practiceTask: "practice_task",
      };
      const codeFs = new Set<string>(["codeExample", "badCodeExample", "goodCodeExample"]);
      for (const f of optFields) {
        const v = partial[f];
        if (v === undefined) continue;
        const trimmed = v.trim();
        if (trimmed && codeFs.has(f)) assertRealLineBreaks(trimmed, f);
        params.push(trimmed || null); sets.push(`${optCols[f]} = ?`);
      }

      if (partial.concepts !== undefined) { params.push(JSON.stringify(partial.concepts)); sets.push("concepts = ?"); }
      if (partial.filesChanged !== undefined) { params.push(JSON.stringify(partial.filesChanged)); sets.push("files_changed = ?"); }
      if (partial.tags !== undefined) { params.push(JSON.stringify(partial.tags)); sets.push("tags = ?"); }
      if (partial.understanding !== undefined) { params.push(partial.understanding); sets.push("understanding = ?"); }

      db.prepare(`UPDATE lessons SET ${sets.join(", ")} WHERE id = ?`).run(...params, id);
      return fromDb(db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as RawRow);
    },

    delete(id: string): boolean {
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(id)) return false;
      db.prepare("DELETE FROM lessons WHERE id = ?").run(id);
      return true;
    },

    reset(): void {
      db.exec("DELETE FROM lessons");
    },

    supersede(oldId: string, newId: string, reason?: string): { old: Lesson; new: Lesson } {
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(oldId)) throw new Error(`Lesson not found: ${oldId}`);
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(newId)) throw new Error(`Lesson not found: ${newId}`);

      const updatedAt = new Date().toISOString();
      db.prepare("UPDATE lessons SET status='superseded', superseded_by=?, supersede_reason=?, updated_at=? WHERE id=?").run(newId, reason ?? null, updatedAt, oldId);
      db.prepare("UPDATE lessons SET supersedes=?, supersede_reason=?, updated_at=? WHERE id=?").run(oldId, reason ?? null, updatedAt, newId);

      return {
        old: fromDb(db.prepare("SELECT * FROM lessons WHERE id = ?").get(oldId) as unknown as RawRow),
        new: fromDb(db.prepare("SELECT * FROM lessons WHERE id = ?").get(newId) as unknown as RawRow),
      };
    },

    conceptStats(): ConceptStat[] {
      const counts = new Map<string, number>();
      for (const lesson of this.list(Number.MAX_SAFE_INTEGER)) {
        if (lesson.status === "superseded") continue;
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
        if (lesson.status === "superseded") continue;
        counts.set(lesson.mistake, (counts.get(lesson.mistake) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([mistake, count]) => ({ mistake, count }))
        .sort((a, b) => b.count - a.count || a.mistake.localeCompare(b.mistake));
    },

    close(): void {
      db.close();
    },
  };
}

function normalizeTags(raw: unknown): Tag[] {
  return (raw as Array<Tag | string>).map((item) =>
    typeof item === "string" ? { name: item } : item,
  );
}

function fromDb(row: RawRow): Lesson {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tool: row.tool,
    projectPath: row.project_path,
    title: row.title,
    originalPrompt: row.original_prompt,
    problem: row.problem,
    mistake: row.mistake,
    rootCause: row.root_cause,
    fixSummary: row.fix_summary,
    takeaway: row.takeaway ?? undefined,
    mistakePattern: row.mistake_pattern ?? undefined,
    whenNotApplicable: row.when_not_applicable ?? undefined,
    concepts: JSON.parse(row.concepts) as string[],
    filesChanged: JSON.parse(row.files_changed) as string[],
    codeExample: row.code_example ?? undefined,
    badCodeExample: row.bad_code_example ?? undefined,
    goodCodeExample: row.good_code_example ?? undefined,
    codeExplanation: row.code_explanation ?? undefined,
    practiceTask: row.practice_task ?? undefined,
    reviewQuestions: JSON.parse(row.review_questions) as ReviewQuestion[],
    understanding: row.understanding as Understanding,
    nextReviewAt: row.next_review_at,
    reviewCount: row.review_count,
    sourceDiff: row.source_diff ?? undefined,
    tags: normalizeTags(JSON.parse(row.tags)),
    status: row.status as LessonStatus,
    supersededBy: row.superseded_by ?? undefined,
    supersedes: row.supersedes ?? undefined,
    supersedeReason: row.supersede_reason ?? undefined,
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
