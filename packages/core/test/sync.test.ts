import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLessonStore, type LessonStore } from "../src/storage.js";
import { createSyncEngine, type Entitlement, type SessionTokens, type SyncBackend, type SyncRow, type SyncUserRecord } from "../src/sync.js";
import { validateLessonInput } from "../src/validation.js";

function lessonInput(overrides: Record<string, unknown> = {}) {
  return validateLessonInput({
    tool: "codex",
    title: "Hydration mismatch",
    originalPrompt: "Fix the theme toggle",
    problem: "Server and client markup differed",
    mistake: "Read localStorage during render",
    rootCause: "Browser APIs are unavailable during SSR",
    fixSummary: "Read localStorage after hydration",
    takeaway: "Keep server and browser output identical until hydration finishes.",
    whenNotApplicable: "Does not apply to values identical on server and client.",
    concepts: ["Next.js hydration"],
    filesChanged: ["app/theme.tsx"],
    reviewQuestions: [{ question: "Why did hydration fail?", expectedAnswer: "Renders differed" }],
    understanding: "unknown",
    tags: [{ name: "nextjs" }],
    ...overrides,
  });
}

class FakeBackend implements SyncBackend {
  users = new Map<string, { userId: string; password: string }>();
  records = new Map<string, SyncUserRecord>();
  lessons = new Map<string, Map<string, SyncRow>>();
  entitlements = new Map<string, Entitlement>();
  sessionToEmail = new Map<string, string>();
  nextUserId = 1;
  nextSessionId = 1;

  grantEntitlement(email: string, entitlement: Entitlement = { plan: "pro", status: "active" }): void {
    this.entitlements.set(email, entitlement);
  }

  private issueSession(email: string, userId: string) {
    const accessToken = `access-${this.nextSessionId}`;
    const refreshToken = `refresh-${this.nextSessionId}`;
    this.nextSessionId += 1;
    this.sessionToEmail.set(accessToken, email);
    return { userId, accessToken, refreshToken };
  }

  async signIn(email: string, password: string) {
    const user = this.users.get(email);
    if (!user || user.password !== password) throw new Error("invalid credentials");
    return this.issueSession(email, user.userId);
  }

  async signUp(email: string, password: string) {
    const userId = `user-${this.nextUserId++}`;
    this.users.set(email, { userId, password });
    return this.issueSession(email, userId);
  }

  async signInWithGithub(): Promise<never> {
    throw new Error("GitHub OAuth is not exercised in tests; use signIn/signUp.");
  }

  async getEntitlement(session: SessionTokens) {
    const email = this.sessionToEmail.get(session.accessToken);
    return email ? this.entitlements.get(email) : undefined;
  }

  async getUserRecord(userId: string, _session: SessionTokens) {
    return this.records.get(userId);
  }

  async createUserRecord(userId: string, _session: SessionTokens, record: SyncUserRecord) {
    this.records.set(userId, record);
  }

  async upsertLessons(userId: string, _session: SessionTokens, rows: SyncRow[]) {
    const existing = this.lessons.get(userId) ?? new Map<string, SyncRow>();
    for (const row of rows) existing.set(row.lessonId, row);
    this.lessons.set(userId, existing);
  }

  async fetchLessonsSince(userId: string, _session: SessionTokens, since: string) {
    const existing = this.lessons.get(userId) ?? new Map<string, SyncRow>();
    return [...existing.values()].filter((row) => row.updatedAt > since);
  }
}

function withMachine<T>(run: (store: LessonStore) => Promise<T>): () => Promise<T> {
  return async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-sync-"));
    const previousDataDir = process.env.FIXMIND_DATA_DIR;
    process.env.FIXMIND_DATA_DIR = directory;
    const store = createLessonStore(path.join(directory, "test.db"));
    try {
      return await run(store);
    } finally {
      store.close();
      fs.rmSync(directory, { recursive: true, force: true });
      if (previousDataDir === undefined) delete process.env.FIXMIND_DATA_DIR;
      else process.env.FIXMIND_DATA_DIR = previousDataDir;
    }
  };
}

test("login is rejected without an active Pro/Team entitlement", async () => {
  const backend = new FakeBackend();
  const credentials = {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    email: "dev@example.com",
    password: "hunter2",
    passphrase: "shared passphrase",
  };

  await assert.rejects(
    withMachine(async (store) => {
      const engine = createSyncEngine(store, backend);
      await engine.login(credentials);
    })(),
    /requires an active Pro or Team plan/,
  );

  backend.grantEntitlement(credentials.email, { plan: "pro", status: "canceled" });
  await assert.rejects(
    withMachine(async (store) => {
      const engine = createSyncEngine(store, backend);
      await engine.login(credentials);
    })(),
    /requires an active Pro or Team plan/,
  );
});

test("login rejects the wrong passphrase on a second machine", async () => {
  const backend = new FakeBackend();
  backend.grantEntitlement("dev@example.com");
  const credentials = {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    email: "dev@example.com",
    password: "hunter2",
  };

  await withMachine(async (storeA) => {
    const engineA = createSyncEngine(storeA, backend);
    await engineA.login({ ...credentials, passphrase: "right passphrase" });
  })();

  await assert.rejects(
    withMachine(async (storeB) => {
      const engineB = createSyncEngine(storeB, backend);
      await engineB.login({ ...credentials, passphrase: "wrong passphrase" });
    })(),
    /Incorrect passphrase/,
  );
});

test("push from one machine and pull on another applies the lesson", async () => {
  const backend = new FakeBackend();
  backend.grantEntitlement("dev@example.com");
  const credentials = {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    email: "dev@example.com",
    password: "hunter2",
    passphrase: "shared passphrase",
  };

  let lessonId = "";
  await withMachine(async (storeA) => {
    const engineA = createSyncEngine(storeA, backend);
    await engineA.login(credentials);
    const saved = storeA.save(lessonInput());
    lessonId = saved.id;
    const result = await engineA.push();
    assert.equal(result.pushed, 1);
  })();

  await withMachine(async (storeB) => {
    const engineB = createSyncEngine(storeB, backend);
    await engineB.login(credentials);
    const result = await engineB.pull();
    assert.equal(result.applied, 1);
    const synced = storeB.get(lessonId);
    assert.ok(synced);
    assert.equal(synced?.title, "Hydration mismatch");
  })();
});

function machine(): { directory: string; store: LessonStore; use: () => void; cleanup: () => void } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-sync-"));
  const store = createLessonStore(path.join(directory, "test.db"));
  const previousDataDir = process.env.FIXMIND_DATA_DIR;
  return {
    directory,
    store,
    use: () => { process.env.FIXMIND_DATA_DIR = directory; },
    cleanup: () => {
      store.close();
      fs.rmSync(directory, { recursive: true, force: true });
      if (previousDataDir === undefined) delete process.env.FIXMIND_DATA_DIR;
      else process.env.FIXMIND_DATA_DIR = previousDataDir;
    },
  };
}

test("pull does not overwrite a locally newer conflicting edit", async () => {
  const backend = new FakeBackend();
  backend.grantEntitlement("dev@example.com");
  const credentials = {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    email: "dev@example.com",
    password: "hunter2",
    passphrase: "shared passphrase",
  };

  const a = machine();
  const b = machine();
  try {
    a.use();
    const engineA = createSyncEngine(a.store, backend);
    await engineA.login(credentials);
    const saved = a.store.save(lessonInput());
    const lessonId = saved.id;
    await engineA.push();

    b.use();
    const engineB = createSyncEngine(b.store, backend);
    await engineB.login(credentials);
    await engineB.pull();
    assert.equal(b.store.get(lessonId)?.title, "Hydration mismatch");

    a.use();
    a.store.update(lessonId, { title: "Remote edit from A" });
    await engineA.push();

    b.use();
    b.store.update(lessonId, { title: "Local edit from B" });
    await engineB.pull();

    assert.equal(b.store.get(lessonId)?.title, "Local edit from B");
  } finally {
    a.cleanup();
    b.cleanup();
  }
});
