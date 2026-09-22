import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getMemoryResults } from "../dist/src/memory.js";
import { createLessonStore } from "../dist/src/storage.js";
import { validateLessonInput } from "../dist/src/validation.js";

const TOPICS = [
  "async timing",
  "sqlite migration",
  "react hydration",
  "cache invalidation",
  "oauth refresh",
  "websocket cleanup",
  "off by one",
  "stale closure",
];

function makeLesson(index) {
  const topic = TOPICS[index % TOPICS.length];
  return validateLessonInput({
    tool: "bench",
    title: `Lesson ${index}: ${topic} failure`,
    problem: `The ${topic} behavior broke in component ${index}`,
    mistake: `Assumed the ${topic} contract held without checking`,
    rootCause: `The ${topic} guarantee only applies after the related promise settles`,
    fixSummary: `Handle the ${topic} case explicitly before reading derived state`,
    takeaway: `Always await the ${topic} boundary before reading results.`,
    mistakePattern: "Wrong assumption",
    whenNotApplicable: "Does not apply when the value is already cached.",
    concepts: [topic],
    filesChanged: [`src/module-${index % 40}.ts`],
    badCodeExample: `const value = load${index}();`,
    goodCodeExample: `const value = await load${index}();`,
    codeExplanation: "The fixed version waits before reading.",
    practiceTask: "Check one similar call site.",
    reviewQuestions: [
      { question: `When is the ${topic} value safe to read?`, expectedAnswer: "After settle." },
    ],
    understanding: "understood",
    tags: [],
  });
}

function time(fn, runs = 5) {
  fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) fn();
  const total = Number(process.hrtime.bigint() - start) / 1e6;
  return total / runs;
}

function bench(count) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `fixmind-bench-${count}-`));
  const filePath = path.join(directory, "bench.db");
  const store = createLessonStore(filePath);
  const seedStart = process.hrtime.bigint();
  for (let i = 0; i < count; i++) {
    store.upsertFromRemote({
      ...makeLesson(i),
      id: `bench-${i}`,
      projectPath: "/tmp/fixmind-bench",
      originalPrompt: "",
      nextReviewAt: new Date(2024, 0, 1 + (i % 300)).toISOString(),
      createdAt: new Date(2024, 0, 1 + (i % 300)).toISOString(),
      updatedAt: new Date(2024, 0, 1 + (i % 300)).toISOString(),
      reviewCount: (i % 9) + 1,
      status: "active",
    });
  }
  const seedMs = Number(process.hrtime.bigint() - seedStart) / 1e6;

  const queries = {
    "specific  (1 topic)": "hydration",
    "realistic (2 topics)": "websocket stale",
    "degenerate (common terms)": "async cache invalidation",
  };
  const fullScanMs = time(() => store.list(Number.MAX_SAFE_INTEGER));
  const topMemoryMs = time(() => getMemoryResults(store, { limit: 5 }));
  const searchMs = time(() => store.search("async"));

  const db = new DatabaseSync(filePath);
  const legacyLikeMs = time(() => {
    const pattern = "%async%";
    db.prepare(
      "SELECT * FROM lessons WHERE (lower(title) LIKE ? OR lower(problem) LIKE ? OR lower(root_cause) LIKE ? OR lower(fix_summary) LIKE ? OR lower(takeaway) LIKE ? OR lower(mistake_pattern) LIKE ? OR lower(concepts) LIKE ? OR lower(tags) LIKE ?)",
    ).all(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
  });
  db.close();

  console.log(`\n=== ${count.toLocaleString()} lessons (seed ${seedMs.toFixed(0)} ms) ===`);
  console.log(`  full scan + parse (old memory path)   ${fullScanMs.toFixed(2)} ms`);
  console.log(`  memory top-reviewed (indexed)         ${topMemoryMs.toFixed(2)} ms`);
  console.log(`  search (fts + exact filter)           ${searchMs.toFixed(2)} ms`);
  console.log(`  search (old LIKE scan)                ${legacyLikeMs.toFixed(2)} ms`);
  for (const [label, query] of Object.entries(queries)) {
    const ms = time(() => getMemoryResults(store, { query, limit: 5 }));
    const hits = getMemoryResults(store, { query, limit: 5 }).length;
    console.log(`  memory query ${label.padEnd(24)} ${ms.toFixed(2)} ms  -> ${hits} hits`);
  }

  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
}

bench(1000);
bench(5000);
