import fs from "node:fs";
import path from "node:path";
import { dataDirectory } from "./paths.js";
import { decrypt, deriveKey, encrypt, generateSalt } from "./crypto.js";
import type { LessonStore } from "./storage.js";
import type { Lesson } from "./types.js";
import { createSupabaseBackend, type Entitlement, type SessionTokens, type SyncBackend, type SyncRow, type SyncUserRecord } from "./sync-backend.js";
export type { Entitlement, SessionTokens, SyncBackend, SyncRow, SyncUserRecord } from "./sync-backend.js";

const VERIFIER_PLAINTEXT = "fixmind-sync-verify";
const EPOCH = "1970-01-01T00:00:00.000Z";
export const PRICING_URL = "https://fixmind.dev/pricing";

interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  salt: string;
  keyBase64: string;
  lastPushedAt?: string;
  lastPulledAt?: string;
}

function syncConfigPath(): string {
  return path.join(dataDirectory(), "sync.json");
}

function readSyncConfig(): SyncConfig | undefined {
  const file = syncConfigPath();
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as SyncConfig;
}

function writeSyncConfig(config: SyncConfig): void {
  fs.mkdirSync(path.dirname(syncConfigPath()), { recursive: true });
  fs.writeFileSync(syncConfigPath(), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export interface LoginResult {
  email: string;
  entitled: boolean;
}

export interface SyncEngine {
  login(params: { supabaseUrl: string; supabaseAnonKey: string; email: string; password: string; passphrase: string }): Promise<LoginResult>;
  loginWithGithub(params: { supabaseUrl: string; supabaseAnonKey: string; passphrase: string; onAuthUrl?: (url: string) => void }): Promise<LoginResult>;
  logout(): void;
  status(): Promise<{ loggedIn: boolean; needsReauth?: boolean; email?: string; lastPushedAt?: string; lastPulledAt?: string }>;
  push(): Promise<{ pushed: number }>;
  pull(): Promise<{ pulled: number; applied: number }>;
}

const AUTO_SYNC_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), AUTO_SYNC_TIMEOUT_MS),
    ),
  ]);
}

export async function autoPushAfterSave(store: LessonStore): Promise<void> {
  const engine = createSyncEngine(store);
  if (!(await engine.status()).loggedIn) return;
  try {
    await withTimeout(engine.push());
  } catch (error) {
    console.error(
      `fixmind: auto-sync push failed (will retry on the next save or \`fixmind sync push\`): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function autoPullOnStart(store: LessonStore): Promise<void> {
  const engine = createSyncEngine(store);
  if (!(await engine.status()).loggedIn) return;
  try {
    await withTimeout(engine.pull());
  } catch (error) {
    console.error(
      `fixmind: auto-sync pull failed (run \`fixmind sync pull\` manually): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function createSyncEngine(store: LessonStore, backend?: SyncBackend): SyncEngine {
  function requireConfig(): SyncConfig {
    const config = readSyncConfig();
    if (!config) throw new Error("Not logged in to sync. Run `fixmind login` first.");
    return config;
  }

  function isAuthError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /invalid refresh token|refresh token not found|jwt expired|session not found/i.test(message);
  }

  function backendFor(config: SyncConfig): SyncBackend {
    return backend ?? createSupabaseBackend(config.supabaseUrl, config.supabaseAnonKey);
  }

  async function pushPendingLessons(
    config: SyncConfig,
    activeBackend: SyncBackend,
    session: SessionTokens,
    key: Buffer,
  ): Promise<number> {
    const lessons = store.updatedSince(config.lastPushedAt ?? EPOCH);
    if (lessons.length === 0) return 0;

    const rows: SyncRow[] = lessons.map((lesson) => {
      const { ciphertext, iv } = encrypt(JSON.stringify(lesson), key);
      return { lessonId: lesson.id, ciphertext, iv, updatedAt: lesson.updatedAt };
    });
    await activeBackend.upsertLessons(config.userId, session, rows);

    const newest = lessons.reduce((max, lesson) => (lesson.updatedAt > max ? lesson.updatedAt : max), config.lastPushedAt ?? EPOCH);
    writeSyncConfig({ ...config, lastPushedAt: newest });
    return lessons.length;
  }

  async function establishKey(
    activeBackend: SyncBackend,
    userId: string,
    sessionTokens: SessionTokens,
    passphrase: string,
  ): Promise<{ key: Buffer; salt: string }> {
    const record = await activeBackend.getUserRecord(userId, sessionTokens);
    if (record) {
      const key = deriveKey(passphrase, record.salt);
      let verified: string;
      try {
        verified = decrypt({ iv: record.verifierIv, ciphertext: record.verifierCiphertext }, key);
      } catch {
        throw new Error("Incorrect passphrase for this sync account.");
      }
      if (verified !== VERIFIER_PLAINTEXT) throw new Error("Incorrect passphrase for this sync account.");
      return { key, salt: record.salt };
    }

    const salt = generateSalt();
    const key = deriveKey(passphrase, salt);
    const verifier = encrypt(VERIFIER_PLAINTEXT, key);
    await activeBackend.createUserRecord(userId, sessionTokens, {
      salt,
      verifierCiphertext: verifier.ciphertext,
      verifierIv: verifier.iv,
    });
    return { key, salt };
  }

  async function isEntitled(activeBackend: SyncBackend, sessionTokens: SessionTokens): Promise<boolean> {
    const entitlement = await activeBackend.getEntitlement(sessionTokens);
    return Boolean(entitlement && entitlement.status === "active");
  }

  async function requireEntitlement(activeBackend: SyncBackend, sessionTokens: SessionTokens): Promise<void> {
    if (!(await isEntitled(activeBackend, sessionTokens))) {
      throw new Error(
        `Fixmind sync requires an active Pro or Team plan. Subscribe at ${PRICING_URL}, then run \`fixmind sync push\` (or \`pull\`) again.`,
      );
    }
  }

  return {
    async login({ supabaseUrl, supabaseAnonKey, email, password, passphrase }) {
      const activeBackend = backend ?? createSupabaseBackend(supabaseUrl, supabaseAnonKey);

      let session: { userId: string; accessToken: string; refreshToken: string };
      try {
        session = await activeBackend.signIn(email, password);
      } catch {
        session = await activeBackend.signUp(email, password);
      }
      const sessionTokens: SessionTokens = { accessToken: session.accessToken, refreshToken: session.refreshToken };
      const entitled = await isEntitled(activeBackend, sessionTokens);
      const { key, salt } = await establishKey(activeBackend, session.userId, sessionTokens, passphrase);

      writeSyncConfig({
        supabaseUrl,
        supabaseAnonKey,
        email,
        userId: session.userId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        salt,
        keyBase64: key.toString("base64"),
      });
      if (entitled) {
        try {
          const config = readSyncConfig();
          if (config) await withTimeout(pushPendingLessons(config, activeBackend, sessionTokens, key));
        } catch (error) {
          console.error(
            `fixmind: initial sync push after login failed (run \`fixmind sync push\` manually): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      return { email, entitled };
    },

    async loginWithGithub({ supabaseUrl, supabaseAnonKey, passphrase, onAuthUrl }) {
      const activeBackend = backend ?? createSupabaseBackend(supabaseUrl, supabaseAnonKey);
      const session = await activeBackend.signInWithGithub(onAuthUrl);
      const sessionTokens: SessionTokens = { accessToken: session.accessToken, refreshToken: session.refreshToken };
      const entitled = await isEntitled(activeBackend, sessionTokens);
      const { key, salt } = await establishKey(activeBackend, session.userId, sessionTokens, passphrase);

      writeSyncConfig({
        supabaseUrl,
        supabaseAnonKey,
        email: session.email,
        userId: session.userId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        salt,
        keyBase64: key.toString("base64"),
      });
      if (entitled) {
        try {
          const config = readSyncConfig();
          if (config) await withTimeout(pushPendingLessons(config, activeBackend, sessionTokens, key));
        } catch (error) {
          console.error(
            `fixmind: initial sync push after login failed (run \`fixmind sync push\` manually): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      return { email: session.email, entitled };
    },

    logout() {
      const file = syncConfigPath();
      if (fs.existsSync(file)) fs.rmSync(file);
    },

    async status() {
      const config = readSyncConfig();
      if (!config) return { loggedIn: false };
      const activeBackend = backendFor(config);
      const session: SessionTokens = { accessToken: config.accessToken, refreshToken: config.refreshToken };
      try {
        await activeBackend.verifySession(session);
        return {
          loggedIn: true,
          email: config.email,
          lastPushedAt: config.lastPushedAt,
          lastPulledAt: config.lastPulledAt,
        };
      } catch (error) {
        if (!isAuthError(error)) {
          return {
            loggedIn: true,
            email: config.email,
            lastPushedAt: config.lastPushedAt,
            lastPulledAt: config.lastPulledAt,
          };
        }
        return {
          loggedIn: false,
          needsReauth: true,
          email: config.email,
          lastPushedAt: config.lastPushedAt,
          lastPulledAt: config.lastPulledAt,
        };
      }
    },

    async push() {
      const config = requireConfig();
      const activeBackend = backendFor(config);
      const key = Buffer.from(config.keyBase64, "base64");
      const session: SessionTokens = { accessToken: config.accessToken, refreshToken: config.refreshToken };
      await requireEntitlement(activeBackend, session);
      const pushed = await pushPendingLessons(config, activeBackend, session, key);
      return { pushed };
    },

    async pull() {
      const config = requireConfig();
      const activeBackend = backendFor(config);
      const key = Buffer.from(config.keyBase64, "base64");
      const session: SessionTokens = { accessToken: config.accessToken, refreshToken: config.refreshToken };
      await requireEntitlement(activeBackend, session);

      const rows = await activeBackend.fetchLessonsSince(config.userId, session, config.lastPulledAt ?? EPOCH);
      if (rows.length === 0) return { pulled: 0, applied: 0 };

      let applied = 0;
      let newest = config.lastPulledAt ?? EPOCH;
      for (const row of rows) {
        const lesson = JSON.parse(decrypt({ iv: row.iv, ciphertext: row.ciphertext }, key)) as Lesson;
        const local = store.get(lesson.id);
        if (!local || lesson.updatedAt > local.updatedAt) {
          store.upsertFromRemote(lesson);
          applied += 1;
        }
        if (row.updatedAt > newest) newest = row.updatedAt;
      }
      writeSyncConfig({ ...config, lastPulledAt: newest });
      return { pulled: rows.length, applied };
    },
  };
}
