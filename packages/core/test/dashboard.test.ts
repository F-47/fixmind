import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboard } from "../src/dashboard.js";
import { createLessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

function saveHydrationLesson(store: ReturnType<typeof createLessonStore>) {
  return store.save(validateLessonInput({
    tool: "codex",
    title: "Hydration mismatch",
    problem: "Initial markup differed",
    mistake: "Read localStorage during render",
    rootCause: "Browser state was unavailable during SSR",
    fixSummary: "Load browser state after hydration",
    takeaway: "Keep server and browser output identical until hydration finishes.",
    mistakePattern: "Hydration timing",
    whenNotApplicable: "Does not apply to values that are identical on server and client, like static labels.",
    concepts: ["Next.js hydration"],
    badCodeExample: "const theme = localStorage.getItem('theme')",
    goodCodeExample: "useEffect(() => loadTheme(), [])",
    codeExplanation: "The fixed version reads browser-only state after hydration.",
    practiceTask: "Build a stable initial render.",
    reviewQuestions: [{
      question: "Why must initial renders match?",
      expectedAnswer: "Hydration reuses the server markup.",
    }],
    nextReviewAt: "2020-01-01T00:00:00.000Z",
  }));
}

async function withDashboard(
  run: (context: {
    directory: string;
    store: ReturnType<typeof createLessonStore>;
    dashboardUrl: string;
    savedId: string;
  }) => Promise<void>,
): Promise<void> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-dashboard-"));
  const previousDataDir = process.env.FIXMIND_DATA_DIR;
  process.env.FIXMIND_DATA_DIR = directory;
  const store = createLessonStore(path.join(directory, "test.db"));
  const dashboard = await startDashboard({ port: 0, open: false, store });

  try {
    const saved = saveHydrationLesson(store);
    await run({
      directory,
      store,
      dashboardUrl: dashboard.url,
      savedId: saved.id,
    });
  } finally {
    await dashboard.close();
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
    if (previousDataDir === undefined) delete process.env.FIXMIND_DATA_DIR;
    else process.env.FIXMIND_DATA_DIR = previousDataDir;
  }
}

test("dashboard serves the shell and static assets", async () => {
  await withDashboard(async ({ dashboardUrl }) => {
    const page = await fetch(dashboardUrl);
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /<div id="root"><\/div>/);
    const scriptPath = pageHtml.match(/<script[^>]+src="([^"]+)"/)?.[1];
    const stylePath = pageHtml.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];
    assert.ok(scriptPath);
    assert.ok(stylePath);

    const scriptResponse = await fetch(`${dashboardUrl}${scriptPath}`);
    const styleResponse = await fetch(`${dashboardUrl}${stylePath}`);
    assert.equal(scriptResponse.status, 200);
    assert.equal(styleResponse.status, 200);

    const scriptText = await scriptResponse.text();
    assert.match(scriptText, /Why it happened/);
    assert.match(scriptText, /Review inbox/);
    const stylesheet = await styleResponse.text();
    assert.match(stylesheet, /tailwindcss/);
    assert.match(stylesheet, /\.grid/);
  });
});

test("dashboard api returns lesson data and accepts review submissions", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    const dataResponse = await fetch(`${dashboardUrl}/api/dashboard?q=hydration`);
    const data = await dataResponse.json() as {
      lessons: Array<{ id: string; displayTakeaway: string }>;
      due: unknown[];
      patterns: Array<{ name: string; count: number }>;
      progress: {
        lessonsPerWeek: Array<{ weekStart: string; count: number }>;
        understandingByWeek: Array<{ weekStart: string; understood: number; partial: number; copied_blindly: number; unknown: number }>;
      };
      summary: { total: number; due: number; learning: number; understood: number; memoryReady: number };
    };
    assert.equal(data.lessons[0].id, savedId);
    assert.match(data.lessons[0].displayTakeaway, /server and browser output/);
    assert.equal(data.due.length, 1);
    assert.deepEqual(data.patterns[0], { name: "Hydration timing", count: 1, lessonIds: [savedId] });
    assert.deepEqual(data.summary, { total: 1, due: 1, learning: 1, understood: 0, memoryReady: 0 });
    assert.equal(data.progress.lessonsPerWeek.length, 12);
    assert.equal(data.progress.understandingByWeek.length, 12);

    const reviewResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { [store.get(savedId)!.reviewQuestions[0].id]: "The browser reuses server HTML" },
        understanding: "understood",
      }),
    });
    assert.equal(reviewResponse.status, 200);
    const updated = store.get(savedId);
    assert.equal(updated?.understanding, "understood");
    assert.equal(updated?.reviewCount, 1);
  });
});

test("dashboard export delete and reset endpoints work", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    const jsonExport = await fetch(`${dashboardUrl}/api/export?format=json`);
    assert.equal(jsonExport.status, 200);
    assert.match(jsonExport.headers.get("content-type") ?? "", /application\/json/);
    assert.match(jsonExport.headers.get("content-disposition") ?? "", /attachment; filename="fixmind-lessons-.*\.json"/);
    const exported = await jsonExport.json() as Array<{ id: string }>;
    assert.equal(exported[0].id, savedId);

    const mdExport = await fetch(`${dashboardUrl}/api/export?format=md`);
    assert.equal(mdExport.status, 200);
    assert.match(mdExport.headers.get("content-type") ?? "", /text\/markdown/);
    assert.match(mdExport.headers.get("content-disposition") ?? "", /attachment; filename="fixmind-lessons-.*\.md"/);
    assert.match(await mdExport.text(), /# Hydration mismatch/);

    const missingDelete = await fetch(`${dashboardUrl}/api/lessons/does-not-exist`, { method: "DELETE" });
    assert.equal(missingDelete.status, 404);

    const deleteResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}`, { method: "DELETE" });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { ok: true });
    assert.equal(store.get(savedId), undefined);

    store.save(validateLessonInput({
      tool: "codex",
      title: "Second lesson",
      problem: "Another problem",
      mistake: "Another mistake",
      rootCause: "Another root cause",
      fixSummary: "Another fix",
      takeaway: "Another takeaway.",
      whenNotApplicable: "Does not apply elsewhere.",
      concepts: ["Testing"],
      reviewQuestions: [{ question: "Why?", expectedAnswer: "Because." }],
    }));
    assert.equal(store.list().length, 1);

    const resetResponse = await fetch(`${dashboardUrl}/api/reset`, { method: "POST" });
    assert.equal(resetResponse.status, 200);
    assert.deepEqual(await resetResponse.json(), { ok: true });
    assert.equal(store.list().length, 0);
  });
});
