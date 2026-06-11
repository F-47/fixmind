import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboard } from "../src/dashboard.js";
import { createLessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

test("dashboard renders local data and saves reviews", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-dashboard-"));
  const store = createLessonStore(path.join(directory, "test.db"));
  const saved = store.save(validateLessonInput({
    tool: "codex",
    title: "Hydration mismatch",
    problem: "Initial markup differed",
    mistake: "Read localStorage during render",
    rootCause: "Browser state was unavailable during SSR",
    fixSummary: "Load browser state after hydration",
    takeaway: "Keep server and browser output identical until hydration finishes.",
    mistakePattern: "Hydration timing",
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
  const dashboard = await startDashboard({ port: 0, open: false, store });

  try {
    const page = await fetch(dashboard.url);
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /<div id="root"><\/div>/);
    const scriptPath = pageHtml.match(/<script[^>]+src="([^"]+)"/)?.[1];
    const stylePath = pageHtml.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];
    assert.ok(scriptPath);
    assert.ok(stylePath);
    const scriptResponse = await fetch(`${dashboard.url}${scriptPath}`);
    const styleResponse = await fetch(`${dashboard.url}${stylePath}`);
    assert.equal(scriptResponse.status, 200);
    assert.equal(styleResponse.status, 200);
    assert.match(await scriptResponse.text(), /What should you learn next/);
    const stylesheet = await styleResponse.text();
    assert.match(stylesheet, /tailwindcss/);
    assert.match(stylesheet, /\.grid/);

    const dataResponse = await fetch(`${dashboard.url}/api/dashboard?q=hydration`);
    const data = await dataResponse.json() as {
      lessons: Array<{ id: string; displayTakeaway: string }>;
      due: unknown[];
      patterns: Array<{ name: string; count: number }>;
      progress: {
        lessonsPerWeek: Array<{ weekStart: string; count: number }>;
        understandingByWeek: Array<{ weekStart: string; understood: number; partial: number; copied_blindly: number; unknown: number }>;
      };
      summary: { total: number; due: number; learning: number; understood: number };
    };
    assert.equal(data.lessons[0].id, saved.id);
    assert.match(data.lessons[0].displayTakeaway, /server and browser output/);
    assert.equal(data.due.length, 1);
    assert.deepEqual(data.patterns[0], { name: "Hydration timing", count: 1, lessonIds: [saved.id] });
    assert.deepEqual(data.summary, { total: 1, due: 1, learning: 1, understood: 0 });
    assert.equal(data.progress.lessonsPerWeek.length, 12);
    assert.equal(data.progress.understandingByWeek.length, 12);

    const reviewResponse = await fetch(`${dashboard.url}/api/lessons/${saved.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { [saved.reviewQuestions[0].id]: "The browser reuses server HTML" },
        understanding: "understood",
      }),
    });
    assert.equal(reviewResponse.status, 200);
    const updated = store.get(saved.id);
    assert.equal(updated?.understanding, "understood");
    assert.equal(updated?.reviewCount, 1);

    const missingDelete = await fetch(`${dashboard.url}/api/lessons/does-not-exist`, { method: "DELETE" });
    assert.equal(missingDelete.status, 404);

    const deleteResponse = await fetch(`${dashboard.url}/api/lessons/${saved.id}`, { method: "DELETE" });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { ok: true });
    assert.equal(store.get(saved.id), undefined);
  } finally {
    await dashboard.close();
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
