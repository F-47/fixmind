import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startDashboard } from "../dist/src/dashboard.js";
import { createLessonStore } from "../dist/src/storage.js";
import { validateLessonInput } from "../dist/src/validation.js";

const TOPICS = [
  "async timing",
  "sqlite migration",
  "react hydration",
  "cache invalidation",
  "oauth refresh",
  "websocket cleanup",
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

async function time(fn, runs = 5) {
  await fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) await fn();
  return Number(process.hrtime.bigint() - start) / 1e6 / runs;
}

const count = Number(process.argv[2] ?? 2000);
const directory = fs.mkdtempSync(path.join(os.tmpdir(), `fixmind-bench-dash-${count}-`));
const store = createLessonStore(path.join(directory, "bench.db"));
for (let i = 0; i < count; i++) {
  store.upsertFromRemote({
    ...makeLesson(i),
    id: `bench-${i}`,
    projectPath: "/tmp/fixmind-bench",
    originalPrompt: "",
    nextReviewAt: new Date(2030, 0, 1 + (i % 300)).toISOString(),
    createdAt: new Date(2024, 0, 1 + (i % 300)).toISOString(),
    updatedAt: new Date(2024, 0, 1 + (i % 300)).toISOString(),
    reviewCount: (i % 9) + 1,
    status: "active",
  });
}

const handle = await startDashboard({ port: 0, open: false, store });
try {
  const first = await fetch(`${handle.url}/api/dashboard`);
  const etag = first.headers.get("etag");
  const bytes = (await first.arrayBuffer()).byteLength;

  const fullMs = await time(() => fetch(`${handle.url}/api/dashboard`));
  const revalidateMs = await time(() =>
    fetch(`${handle.url}/api/dashboard`, { headers: { "If-None-Match": etag ?? "" } }),
  );

  console.log(`\n=== /api/dashboard, ${count.toLocaleString()} lessons ===`);
  console.log(`  payload size            ${(bytes / 1024).toFixed(0)} KB`);
  console.log(`  full response (200)     ${fullMs.toFixed(1)} ms`);
  console.log(`  revalidation (304)      ${revalidateMs.toFixed(1)} ms`);
} finally {
  await handle.close();
  store.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
