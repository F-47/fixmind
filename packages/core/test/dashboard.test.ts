import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { startDashboard } from "../src/dashboard.js";
import { createLessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

function saveHydrationLesson(
  store: ReturnType<typeof createLessonStore>,
  overrides: Record<string, unknown> = {},
) {
  return store.save(
    validateLessonInput({
      tool: "codex",
      title: "Hydration mismatch",
      problem: "Initial markup differed",
      mistake: "Read localStorage during render",
      rootCause: "Browser state was unavailable during SSR",
      fixSummary: "Load browser state after hydration",
      takeaway: "Keep server and browser output identical until hydration finishes.",
      mistakePattern: "Hydration timing",
      whenNotApplicable:
        "Does not apply to values that are identical on server and client, like static labels.",
      concepts: ["Next.js hydration"],
      badCodeExample: "const theme = localStorage.getItem('theme')",
      goodCodeExample: "useEffect(() => loadTheme(), [])",
      codeExplanation: "The fixed version reads browser-only state after hydration.",
      practiceTask: "Build a stable initial render.",
      reviewQuestions: [
        {
          question: "Why must initial renders match?",
          expectedAnswer: "Hydration reuses the server markup.",
        },
      ],
      nextReviewAt: "2020-01-01T00:00:00.000Z",
      ...overrides,
    }),
  );
}

async function withDashboard(
  run: (context: {
    directory: string;
    store: ReturnType<typeof createLessonStore>;
    dashboardUrl: string;
    savedId: string;
  }) => Promise<void>,
  sessionToken?: string,
): Promise<void> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-dashboard-"));
  const previousDataDir = process.env.FIXMIND_DATA_DIR;
  process.env.FIXMIND_DATA_DIR = directory;
  const store = createLessonStore(path.join(directory, "test.db"));
  const dashboard = await startDashboard({ port: 0, open: false, store, sessionToken });

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
    assert.match(scriptText, /Review inbox/);
    const assetDirectory = scriptPath.slice(0, scriptPath.lastIndexOf("/") + 1);
    const lessonChunk = scriptText.match(/LessonRoutePage-[\w-]+\.js/)?.[0];
    assert.ok(lessonChunk, "entry bundle should reference the lazy lesson page chunk");
    const lessonChunkResponse = await fetch(`${dashboardUrl}${assetDirectory}${lessonChunk}`);
    assert.equal(lessonChunkResponse.status, 200);
    assert.match(await lessonChunkResponse.text(), /Why it happened/);
    const stylesheet = await styleResponse.text();
    assert.match(stylesheet, /tailwindcss/);
    assert.match(stylesheet, /\.grid/);
  });
});

test("dashboard health identifies the Fixmind service", async () => {
  await withDashboard(async ({ dashboardUrl }) => {
    const response = await fetch(`${dashboardUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { service: "fixmind-dashboard" });
  });
});

test("authenticated dashboard rejects missing credentials and foreign origins", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    assert.equal((await fetch(`${dashboardUrl}/api/dashboard`)).status, 401);
    assert.equal(
      (
        await fetch(`${dashboardUrl}/api/reset`, {
          method: "POST",
          headers: { Authorization: "Bearer desktop-secret", Origin: "https://attacker.test" },
        })
      ).status,
      403,
    );
    assert.ok(store.get(savedId), "an untrusted origin must not mutate stored lessons");
    assert.equal(
      (
        await fetch(`${dashboardUrl}/api/dashboard`, {
          headers: { Authorization: "Bearer desktop-secret" },
        })
      ).status,
      200,
    );
  }, "desktop-secret");
});

test("authenticated dashboard rejects oversized request bodies", async () => {
  await withDashboard(async ({ dashboardUrl, savedId }) => {
    const response = await fetch(`${dashboardUrl}/api/lessons/${savedId}/review`, {
      method: "POST",
      headers: {
        Authorization: "Bearer desktop-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ understanding: "understood", padding: "x".repeat(1_000_000) }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Request body is too large." });
  }, "desktop-secret");
});

test("dashboard api returns lesson data and accepts review submissions", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    const dataResponse = await fetch(`${dashboardUrl}/api/dashboard?q=hydration`);
    const data = (await dataResponse.json()) as {
      lessons: Array<{ id: string; displayTakeaway: string }>;
      due: unknown[];
      patterns: Array<{ name: string; count: number }>;
      progress: {
        lessonsPerWeek: Array<{ weekStart: string; count: number }>;
        understandingByWeek: Array<{
          weekStart: string;
          understood: number;
          partial: number;
          copied_blindly: number;
          unknown: number;
        }>;
      };
      summary: {
        total: number;
        due: number;
        learning: number;
        understood: number;
        memoryReady: number;
      };
    };
    assert.equal(data.lessons[0].id, savedId);
    assert.match(data.lessons[0].displayTakeaway, /server and browser output/);
    assert.equal(data.due.length, 1);
    assert.deepEqual(data.patterns[0], {
      name: "Hydration timing",
      count: 1,
      lessonIds: [savedId],
    });
    assert.deepEqual(data.summary, {
      total: 1,
      due: 1,
      learning: 1,
      understood: 0,
      memoryReady: 0,
    });
    assert.equal(data.progress.lessonsPerWeek.length, 12);
    assert.equal(data.progress.understandingByWeek.length, 12);

    const savedLesson = store.get(savedId);
    assert.ok(savedLesson);
    const [reviewQuestion] = savedLesson.reviewQuestions;
    assert.ok(reviewQuestion);

    const reviewResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: { [reviewQuestion.id]: "The browser reuses server HTML" },
        understanding: "understood",
      }),
    });
    assert.equal(reviewResponse.status, 200);
    const updated = store.get(savedId);
    assert.equal(updated?.understanding, "understood");
    assert.equal(updated?.reviewCount, 1);
  });
});

test("dashboard sync status returns the richer local sync metadata", async () => {
  await withDashboard(async ({ dashboardUrl }) => {
    const statusResponse = await fetch(`${dashboardUrl}/api/sync/status`);
    assert.equal(statusResponse.status, 200);
    const status = (await statusResponse.json()) as {
      loggedIn: boolean;
      syncEnabled: boolean;
      pendingPushCount: number;
      conflictCount: number;
      lastSuccessfulSyncAt?: string;
    };

    assert.equal(status.loggedIn, false);
    assert.equal(status.syncEnabled, false);
    assert.equal(status.pendingPushCount, 0);
    assert.equal(status.conflictCount, 0);
    assert.equal(status.lastSuccessfulSyncAt, undefined);
  });
});

test("dashboard export delete and reset endpoints work", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    const jsonExport = await fetch(`${dashboardUrl}/api/export?format=json`);
    assert.equal(jsonExport.status, 200);
    assert.match(jsonExport.headers.get("content-type") ?? "", /application\/json/);
    assert.match(
      jsonExport.headers.get("content-disposition") ?? "",
      /attachment; filename="fixmind-lessons-.*\.json"/,
    );
    const exported = (await jsonExport.json()) as Array<{ id: string }>;
    assert.equal(exported[0].id, savedId);

    const mdExport = await fetch(`${dashboardUrl}/api/export?format=md`);
    assert.equal(mdExport.status, 200);
    assert.match(mdExport.headers.get("content-type") ?? "", /text\/markdown/);
    assert.match(
      mdExport.headers.get("content-disposition") ?? "",
      /attachment; filename="fixmind-lessons-.*\.md"/,
    );
    assert.match(await mdExport.text(), /# Hydration mismatch/);

    const missingDelete = await fetch(`${dashboardUrl}/api/lessons/does-not-exist`, {
      method: "DELETE",
    });
    assert.equal(missingDelete.status, 404);

    const deleteResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { ok: true });
    assert.equal(store.get(savedId), undefined);

    store.save(
      validateLessonInput({
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
      }),
    );
    assert.equal(store.list().length, 1);

    const resetResponse = await fetch(`${dashboardUrl}/api/reset`, { method: "POST" });
    assert.equal(resetResponse.status, 200);
    assert.deepEqual(await resetResponse.json(), { ok: true });
    assert.equal(store.list().length, 0);
  });
});

test("dashboard api serves 304 for unchanged lesson data", async () => {
  await withDashboard(async ({ dashboardUrl }) => {
    const first = await fetch(`${dashboardUrl}/api/dashboard`);
    assert.equal(first.status, 200);
    const etag = first.headers.get("etag");
    assert.ok(etag, "expected an etag on the dashboard payload");

    const second = await fetch(`${dashboardUrl}/api/dashboard`, {
      headers: { "If-None-Match": etag as string },
    });
    assert.equal(second.status, 304);
    assert.equal(await second.text(), "");

    const unknownTag = await fetch(`${dashboardUrl}/api/dashboard`, {
      headers: { "If-None-Match": '"deadbeef"' },
    });
    assert.equal(unknownTag.status, 200);
  });
});

test("reviewing or deleting a lesson changes the dashboard etag", async () => {
  await withDashboard(async ({ dashboardUrl, savedId }) => {
    const first = await fetch(`${dashboardUrl}/api/dashboard`);
    const originalEtag = first.headers.get("etag");

    const reviewResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {}, understanding: "understood" }),
    });
    assert.equal(reviewResponse.status, 200);

    const afterReview = await fetch(`${dashboardUrl}/api/dashboard`, {
      headers: { "If-None-Match": originalEtag as string },
    });
    assert.equal(afterReview.status, 200);
    const reviewEtag = afterReview.headers.get("etag");
    assert.notEqual(reviewEtag, originalEtag);

    const cachedAfterReview = await fetch(`${dashboardUrl}/api/dashboard`, {
      headers: { "If-None-Match": reviewEtag as string },
    });
    assert.equal(cachedAfterReview.status, 304);

    const deleteResponse = await fetch(`${dashboardUrl}/api/lessons/${savedId}`, {
      method: "DELETE",
    });
    assert.equal(deleteResponse.status, 200);

    const afterDelete = await fetch(`${dashboardUrl}/api/dashboard`, {
      headers: { "If-None-Match": reviewEtag as string },
    });
    assert.equal(afterDelete.status, 200);
  });
});

test("the content version tracks the next due boundary", async () => {
  await withDashboard(async ({ store }) => {
    saveHydrationLesson(store, { nextReviewAt: "2030-06-01T00:00:00.000Z" });

    const beforeBoundary = store.contentVersion(new Date("2030-01-01T00:00:00.000Z"));
    const alsoBeforeBoundary = store.contentVersion(new Date("2030-05-31T23:59:59.999Z"));
    assert.equal(beforeBoundary, alsoBeforeBoundary);

    const afterBoundary = store.contentVersion(new Date("2030-06-02T00:00:00.000Z"));
    assert.notEqual(beforeBoundary, afterBoundary);

    const fixedNow = new Date("2026-01-01T00:00:00.000Z");
    const beforeSave = store.contentVersion(fixedNow);
    saveHydrationLesson(store);
    assert.notEqual(beforeSave, store.contentVersion(fixedNow));
  });
});

test("the content version tracks rolling insight boundaries", async () => {
  await withDashboard(async ({ store }) => {
    const saved = saveHydrationLesson(store);
    store.upsertFromRemote({
      ...saved,
      createdAt: "2030-01-01T12:00:00.000Z",
      updatedAt: "2030-01-01T12:00:00.000Z",
      nextReviewAt: "2040-01-01T00:00:00.000Z",
    });

    const beforeWeeklyExpiry = store.contentVersion(new Date("2030-01-08T11:59:59.999Z"));
    const afterWeeklyExpiry = store.contentVersion(new Date("2030-01-08T12:00:00.001Z"));
    assert.notEqual(beforeWeeklyExpiry, afterWeeklyExpiry);

    const beforeMonthlyExpiry = store.contentVersion(new Date("2030-01-31T11:59:59.999Z"));
    const afterMonthlyExpiry = store.contentVersion(new Date("2030-01-31T12:00:00.001Z"));
    assert.notEqual(beforeMonthlyExpiry, afterMonthlyExpiry);
  });
});

test("the dashboard api supports limit and offset pagination", async () => {
  await withDashboard(async ({ dashboardUrl, store, savedId }) => {
    const second = saveHydrationLesson(store, { title: "Second lesson" });
    const third = saveHydrationLesson(store, { title: "Third lesson" });

    const page = await fetch(`${dashboardUrl}/api/dashboard?limit=1&offset=1`);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("etag"), null);

    const data = (await page.json()) as {
      lessons: Array<{ id: string }>;
      summary: { total: number };
    };
    assert.equal(data.lessons.length, 1);
    assert.equal(data.summary.total, 3);
    const allIds = new Set([savedId, second.id, third.id]);
    assert.ok(allIds.has(data.lessons[0].id));

    const fullPage = await fetch(`${dashboardUrl}/api/dashboard?offset=1`);
    const fullData = (await fullPage.json()) as { lessons: Array<{ id: string }> };
    assert.equal(fullData.lessons.length, 2);

    const badLimit = await fetch(`${dashboardUrl}/api/dashboard?limit=0`);
    assert.equal(badLimit.status, 400);
    const badBody = (await badLimit.json()) as { error?: string };
    assert.match(badBody.error ?? "", /limit must be an integer >= 1/);
  });
});
