import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_CONFIG } from "./config.js";
import { applyMigrations, hasFtsIndex } from "./migrations.js";
import { configPath, databasePath, dataDirectory } from "./paths.js";
import { DEFAULT_EASE, nextReviewSchedule } from "./review-schedule.js";
import type {
  ConceptStat,
  Lesson,
  LessonInput,
  LessonStatus,
  MistakeStat,
  ReviewQuestion,
  Tag,
  Understanding,
} from "./types.js";
import { assertRealLineBreaks } from "./validation.js";

export interface LessonStore {
  save(input: LessonInput): Lesson;
  get(id: string): Lesson | undefined;
  list(limit?: number): Lesson[];
  topReviewed(limit: number): Lesson[];
  textCandidates(terms: string[]): Lesson[];
  contentVersion(now: Date): string;
  updatedSince(timestamp: string): Lesson[];
  upsertFromRemote(lesson: Lesson): void;
  search(query: string, options?: { includeSuperseded?: boolean }): Lesson[];
  due(now?: Date): Lesson[];
  updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson;
  update(id: string, partial: Partial<LessonInput>): Lesson;
  delete(id: string): boolean;
  reset(): void;
  supersede(oldId: string, newId: string, reason?: string): { old: Lesson; new: Lesson };
  conceptStats(exclude?: (lesson: Lesson) => boolean): ConceptStat[];
  mistakeStats(exclude?: (lesson: Lesson) => boolean): MistakeStat[];
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
  ease: number;
  last_interval_days: number | null;
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
    fs.writeFileSync(config, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, "utf8");
  }
  return { directory, database: databasePath(), config };
}

export function createLessonStore(filePath = databasePath()): LessonStore {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  // Let a concurrent CLI/desktop writer finish before surfacing SQLITE_BUSY.
  db.exec("PRAGMA busy_timeout = 5000");
  applyMigrations(db, filePath);
  const ftsEnabled = hasFtsIndex(db);

  const SEARCH_COLUMNS = [
    "title",
    "problem",
    "root_cause",
    "fix_summary",
    "takeaway",
    "mistake_pattern",
    "concepts",
    "tags",
  ] as const;

  const MEMORY_TEXT_COLUMNS = [
    "title",
    "mistake_pattern",
    "problem",
    "mistake",
    "root_cause",
    "fix_summary",
    "takeaway",
    "when_not_applicable",
    "concepts",
    "files_changed",
    "tags",
  ] as const;

  const ftsPhrase = (text: string): string => `"${text.replace(/"/g, '""')}"`;

  const countOf = (sql: string, ...args: Array<string | number>): number => {
    const row = db.prepare(sql).get(...args) as unknown as { count: number };
    return row.count;
  };

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
        ease: DEFAULT_EASE,
        lastIntervalDays: null,
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
        lesson.id,
        lesson.createdAt,
        lesson.updatedAt,
        lesson.tool,
        lesson.projectPath,
        lesson.title,
        lesson.originalPrompt,
        lesson.problem,
        lesson.mistake,
        lesson.rootCause,
        lesson.fixSummary,
        lesson.takeaway ?? null,
        lesson.mistakePattern ?? null,
        lesson.whenNotApplicable ?? null,
        JSON.stringify(lesson.concepts),
        JSON.stringify(lesson.filesChanged),
        lesson.codeExample ?? null,
        lesson.badCodeExample ?? null,
        lesson.goodCodeExample ?? null,
        lesson.codeExplanation ?? null,
        lesson.practiceTask ?? null,
        JSON.stringify(lesson.reviewQuestions),
        lesson.understanding,
        lesson.nextReviewAt,
        lesson.reviewCount,
        lesson.sourceDiff ?? null,
        JSON.stringify(lesson.tags),
        lesson.status,
      );

      if (input.supersedesLessonId && this.get(input.supersedesLessonId)) {
        this.supersede(input.supersedesLessonId, lesson.id, input.supersedeReason);
        lesson.supersedes = input.supersedesLessonId;
        lesson.supersedeReason = input.supersedeReason;
      }

      return lesson;
    },

    get(id: string): Lesson | undefined {
      const row = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as
        | RawRow
        | undefined;
      return row ? fromDb(row) : undefined;
    },

    list(limit = 20): Lesson[] {
      return (
        db
          .prepare("SELECT * FROM lessons ORDER BY created_at DESC LIMIT ?")
          .all(limit) as unknown as RawRow[]
      ).map(fromDb);
    },

    topReviewed(limit: number): Lesson[] {
      return (
        db
          .prepare(
            `SELECT * FROM lessons WHERE status = 'active' AND review_count > 0
             ORDER BY (review_count * 10 + (julianday(updated_at) - 2440587.5) * 0.0864) DESC
             LIMIT ?`,
          )
          .all(limit) as unknown as RawRow[]
      ).map(fromDb);
    },

    textCandidates(terms: string[]): Lesson[] {
      if (!ftsEnabled || terms.length === 0 || terms.some((term) => term.length < 3)) {
        return this.list(Number.MAX_SAFE_INTEGER).filter(
          (lesson) => lesson.status === "active" && lesson.reviewCount > 0,
        );
      }
      const match = terms.map(ftsPhrase).join(" OR ");
      const total = countOf("SELECT count(*) AS count FROM lessons");
      const ftsCount = countOf(
        "SELECT count(*) AS count FROM lessons_fts WHERE lessons_fts MATCH ?",
        match,
      );
      if (ftsCount * 2 > total) {
        return this.list(Number.MAX_SAFE_INTEGER).filter(
          (lesson) => lesson.status === "active" && lesson.reviewCount > 0,
        );
      }
      const likes: string[] = [];
      const patterns: string[] = [];
      for (const term of terms) {
        for (const column of MEMORY_TEXT_COLUMNS) {
          likes.push(`lower(${column}) LIKE ?`);
          patterns.push(`%${term}%`);
        }
      }
      return (
        db
          .prepare(
            `SELECT * FROM lessons
             WHERE rowid IN (SELECT rowid FROM lessons_fts WHERE lessons_fts MATCH ?)
               AND status = 'active' AND review_count > 0
               AND (${likes.join(" OR ")})`,
          )
          .all(match, ...patterns) as unknown as RawRow[]
      ).map(fromDb);
    },

    contentVersion(now: Date): string {
      const row = db
        .prepare(
          `SELECT count(*) AS count,
                  coalesce(sum(CAST((julianday(updated_at) - 2440587.5) * 86400000 AS INTEGER)), 0) AS updatedSum,
                  (SELECT min(next_review_at) FROM lessons WHERE next_review_at > ?) AS nextDue,
                  (SELECT min(julianday(max(created_at, updated_at)) + 7)
                     FROM lessons
                    WHERE julianday(max(created_at, updated_at)) + 7 > julianday(?)) AS nextWeeklyExpiry,
                  (SELECT min(julianday(max(created_at, updated_at)) + 30)
                     FROM lessons
                    WHERE julianday(max(created_at, updated_at)) + 30 > julianday(?)) AS nextMonthlyExpiry
           FROM lessons`,
        )
        .get(now.toISOString(), now.toISOString(), now.toISOString()) as unknown as {
        count: number;
        updatedSum: number;
        nextDue: string | null;
        nextWeeklyExpiry: number | null;
        nextMonthlyExpiry: number | null;
      };
      return [
        row.count,
        row.updatedSum,
        row.nextDue ?? "none",
        row.nextWeeklyExpiry ?? "none",
        row.nextMonthlyExpiry ?? "none",
      ].join(":");
    },

    updatedSince(timestamp: string): Lesson[] {
      return (
        db
          .prepare("SELECT * FROM lessons WHERE updated_at > ? ORDER BY updated_at ASC")
          .all(timestamp) as unknown as RawRow[]
      ).map(fromDb);
    },

    upsertFromRemote(lesson: Lesson): void {
      db.prepare(`
        INSERT INTO lessons (
          id, created_at, updated_at, tool, project_path, title, original_prompt,
          problem, mistake, root_cause, fix_summary, takeaway, mistake_pattern,
          when_not_applicable, concepts, files_changed, code_example, bad_code_example,
          good_code_example, code_explanation, practice_task, review_questions,
          understanding, next_review_at, review_count, source_diff, tags,
          status, superseded_by, supersedes, supersede_reason, ease, last_interval_days
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          created_at=excluded.created_at, updated_at=excluded.updated_at, tool=excluded.tool,
          project_path=excluded.project_path, title=excluded.title, original_prompt=excluded.original_prompt,
          problem=excluded.problem, mistake=excluded.mistake, root_cause=excluded.root_cause,
          fix_summary=excluded.fix_summary, takeaway=excluded.takeaway, mistake_pattern=excluded.mistake_pattern,
          when_not_applicable=excluded.when_not_applicable, concepts=excluded.concepts,
          files_changed=excluded.files_changed, code_example=excluded.code_example,
          bad_code_example=excluded.bad_code_example, good_code_example=excluded.good_code_example,
          code_explanation=excluded.code_explanation, practice_task=excluded.practice_task,
          review_questions=excluded.review_questions, understanding=excluded.understanding,
          next_review_at=excluded.next_review_at, review_count=excluded.review_count,
          source_diff=excluded.source_diff, tags=excluded.tags, status=excluded.status,
          superseded_by=excluded.superseded_by, supersedes=excluded.supersedes,
          supersede_reason=excluded.supersede_reason,
          ease=excluded.ease, last_interval_days=excluded.last_interval_days
      `).run(
        lesson.id,
        lesson.createdAt,
        lesson.updatedAt,
        lesson.tool,
        lesson.projectPath,
        lesson.title,
        lesson.originalPrompt,
        lesson.problem,
        lesson.mistake,
        lesson.rootCause,
        lesson.fixSummary,
        lesson.takeaway ?? null,
        lesson.mistakePattern ?? null,
        lesson.whenNotApplicable ?? null,
        JSON.stringify(lesson.concepts),
        JSON.stringify(lesson.filesChanged),
        lesson.codeExample ?? null,
        lesson.badCodeExample ?? null,
        lesson.goodCodeExample ?? null,
        lesson.codeExplanation ?? null,
        lesson.practiceTask ?? null,
        JSON.stringify(lesson.reviewQuestions),
        lesson.understanding,
        lesson.nextReviewAt,
        lesson.reviewCount,
        lesson.sourceDiff ?? null,
        JSON.stringify(lesson.tags),
        lesson.status,
        lesson.supersededBy ?? null,
        lesson.supersedes ?? null,
        lesson.supersedeReason ?? null,
        lesson.ease ?? DEFAULT_EASE,
        lesson.lastIntervalDays ?? null,
      );
    },

    search(query: string, options: { includeSuperseded?: boolean } = {}): Lesson[] {
      const needle = query.toLowerCase();
      const pattern = `%${needle}%`;
      const patterns = Array<string>(SEARCH_COLUMNS.length).fill(pattern);
      const textWhere = SEARCH_COLUMNS.map((c) => `lower(${c}) LIKE ?`).join(" OR ");
      const statusFilter = options.includeSuperseded ? "" : " AND status != 'superseded'";

      if (ftsEnabled && needle.trim().length >= 3) {
        return (
          db
            .prepare(
              `SELECT * FROM lessons
               WHERE rowid IN (SELECT rowid FROM lessons_fts WHERE lessons_fts MATCH ?)
                 AND (${textWhere})${statusFilter}
               ORDER BY created_at DESC`,
            )
            .all(ftsPhrase(needle), ...patterns) as unknown as RawRow[]
        ).map(fromDb);
      }

      const sql = options.includeSuperseded
        ? `SELECT * FROM lessons WHERE (${textWhere}) ORDER BY created_at DESC`
        : `SELECT * FROM lessons WHERE (${textWhere}) AND status != 'superseded' ORDER BY created_at DESC`;
      return (db.prepare(sql).all(...patterns) as unknown as RawRow[]).map(fromDb);
    },

    due(now = new Date()): Lesson[] {
      return (
        db
          .prepare(
            "SELECT * FROM lessons WHERE next_review_at <= ? AND status != 'superseded' ORDER BY next_review_at ASC",
          )
          .all(now.toISOString()) as unknown as RawRow[]
      ).map(fromDb);
    },

    updateReview(id: string, questions: ReviewQuestion[], understanding: Understanding): Lesson {
      const current = db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as
        | RawRow
        | undefined;
      if (!current) throw new Error(`Lesson not found: ${id}`);

      const count = current.review_count + 1;
      const updatedAt = new Date();
      const schedule = nextReviewSchedule(
        understanding,
        current.ease,
        current.last_interval_days ?? null,
      );
      const nextReviewAt = addDays(updatedAt, schedule.intervalDays);

      db.prepare(
        "UPDATE lessons SET review_questions=?, understanding=?, updated_at=?, next_review_at=?, review_count=?, ease=?, last_interval_days=? WHERE id=?",
      ).run(
        JSON.stringify(questions),
        understanding,
        updatedAt.toISOString(),
        nextReviewAt.toISOString(),
        count,
        schedule.ease,
        schedule.lastIntervalDays,
        id,
      );

      return fromDb(db.prepare("SELECT * FROM lessons WHERE id = ?").get(id) as unknown as RawRow);
    },

    update(id: string, partial: Partial<LessonInput>): Lesson {
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(id)) {
        throw new Error(`Lesson not found: ${id}`);
      }

      const sets: string[] = ["updated_at = ?"];
      const params: (string | number | null)[] = [new Date().toISOString()];

      const reqFields = ["title", "problem", "mistake", "rootCause", "fixSummary"] as const;
      const reqCols: Record<(typeof reqFields)[number], string> = {
        title: "title",
        problem: "problem",
        mistake: "mistake",
        rootCause: "root_cause",
        fixSummary: "fix_summary",
      };
      for (const f of reqFields) {
        const v = partial[f];
        if (v === undefined) continue;
        if (v.trim() === "") throw new Error(`Invalid lesson: ${f} is required.`);
        params.push(v.trim());
        sets.push(`${reqCols[f]} = ?`);
      }

      const optFields = [
        "takeaway",
        "mistakePattern",
        "whenNotApplicable",
        "codeExample",
        "badCodeExample",
        "goodCodeExample",
        "codeExplanation",
        "practiceTask",
      ] as const;
      const optCols: Record<(typeof optFields)[number], string> = {
        takeaway: "takeaway",
        mistakePattern: "mistake_pattern",
        whenNotApplicable: "when_not_applicable",
        codeExample: "code_example",
        badCodeExample: "bad_code_example",
        goodCodeExample: "good_code_example",
        codeExplanation: "code_explanation",
        practiceTask: "practice_task",
      };
      const codeFs = new Set<string>(["codeExample", "badCodeExample", "goodCodeExample"]);
      for (const f of optFields) {
        const v = partial[f];
        if (v === undefined) continue;
        const trimmed = v.trim();
        if (trimmed && codeFs.has(f)) assertRealLineBreaks(trimmed, f);
        params.push(trimmed || null);
        sets.push(`${optCols[f]} = ?`);
      }

      if (partial.concepts !== undefined) {
        params.push(JSON.stringify(partial.concepts));
        sets.push("concepts = ?");
      }
      if (partial.filesChanged !== undefined) {
        params.push(JSON.stringify(partial.filesChanged));
        sets.push("files_changed = ?");
      }
      if (partial.tags !== undefined) {
        params.push(JSON.stringify(partial.tags));
        sets.push("tags = ?");
      }
      if (partial.understanding !== undefined) {
        params.push(partial.understanding);
        sets.push("understanding = ?");
      }

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
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(oldId))
        throw new Error(`Lesson not found: ${oldId}`);
      if (!db.prepare("SELECT id FROM lessons WHERE id = ?").get(newId))
        throw new Error(`Lesson not found: ${newId}`);

      const updatedAt = new Date().toISOString();
      db.prepare(
        "UPDATE lessons SET status='superseded', superseded_by=?, supersede_reason=?, updated_at=? WHERE id=?",
      ).run(newId, reason ?? null, updatedAt, oldId);
      db.prepare(
        "UPDATE lessons SET supersedes=?, supersede_reason=?, updated_at=? WHERE id=?",
      ).run(oldId, reason ?? null, updatedAt, newId);

      return {
        old: fromDb(
          db.prepare("SELECT * FROM lessons WHERE id = ?").get(oldId) as unknown as RawRow,
        ),
        new: fromDb(
          db.prepare("SELECT * FROM lessons WHERE id = ?").get(newId) as unknown as RawRow,
        ),
      };
    },

    conceptStats(exclude?: (lesson: Lesson) => boolean): ConceptStat[] {
      const counts = new Map<string, number>();
      for (const lesson of this.list(Number.MAX_SAFE_INTEGER)) {
        if (lesson.status === "superseded" || exclude?.(lesson)) continue;
        for (const concept of lesson.concepts) {
          counts.set(concept, (counts.get(concept) ?? 0) + 1);
        }
      }
      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },

    mistakeStats(exclude?: (lesson: Lesson) => boolean): MistakeStat[] {
      const counts = new Map<string, number>();
      for (const lesson of this.list(Number.MAX_SAFE_INTEGER)) {
        if (lesson.status === "superseded" || exclude?.(lesson)) continue;
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
    ease: row.ease,
    lastIntervalDays: row.last_interval_days ?? null,
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
