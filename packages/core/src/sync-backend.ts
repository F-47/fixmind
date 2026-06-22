import { exec } from "node:child_process";
import dns from "node:dns";
import http from "node:http";
import { createClient } from "@supabase/supabase-js";
import { decrypt, deriveKey, encrypt, generateSalt } from "./crypto.js";
import type { Lesson } from "./types.js";

// Some networks resolve AAAA records that time out instead of failing fast,
// which undici's fetch surfaces as an opaque "TypeError: fetch failed".
// Resolving IPv4 first avoids that hang on Supabase's auth/token calls.
dns.setDefaultResultOrder("ipv4first");

const OAUTH_CALLBACK_PORT = 51763;
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;
const ACCOUNT_URL = "https://www.fixmind.dev/account";

export interface SyncRow {
  lessonId: string;
  ciphertext: string;
  iv: string;
  updatedAt: string;
}

export interface Entitlement {
  plan: string;
  status: string;
}

export interface SyncUserRecord {
  salt: string;
  verifierCiphertext: string;
  verifierIv: string;
}

export interface OAuthSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SyncBackend {
  signIn(email: string, password: string): Promise<{ userId: string; refreshToken: string; accessToken: string }>;
  signUp(email: string, password: string): Promise<{ userId: string; refreshToken: string; accessToken: string }>;
  signInWithGithub(onAuthUrl?: (url: string) => void): Promise<OAuthSession>;
  verifySession(session: SessionTokens): Promise<void>;
  getEntitlement(session: SessionTokens): Promise<Entitlement | undefined>;
  getUserRecord(userId: string, session: SessionTokens): Promise<SyncUserRecord | undefined>;
  createUserRecord(userId: string, session: SessionTokens, record: SyncUserRecord): Promise<void>;
  upsertLessons(userId: string, session: SessionTokens, rows: SyncRow[]): Promise<void>;
  fetchLessonsSince(userId: string, session: SessionTokens, since: string): Promise<SyncRow[]>;
}

class MemoryAuthStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function openInBrowser(url: string): void {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, () => {
    // Best-effort: if this fails, the printed URL below is the fallback.
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function oauthCallbackPage(options: { ok: boolean; message: string; redirectUrl?: string; redirectLabel?: string }): string {
  const tint = options.ok ? "124,92,255" : "255,92,114";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fixmind</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
    background-color: #08090d; color: #e9ecf4;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  }
  body::before {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(35,40,56,0.6) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(35,40,56,0.6) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(circle at 50% 35%, black, transparent 75%);
  }
  body::after {
    content: ""; position: absolute; left: 50%; top: 0; width: 760px; height: 420px;
    transform: translateX(-50%); pointer-events: none; border-radius: 9999px;
    background: rgba(${tint},0.15); filter: blur(130px);
  }
  .card {
    position: relative; z-index: 1; text-align: center; padding: 2.5rem 3rem; border-radius: 16px;
    border: 1px solid #232838; background: rgba(17,20,27,0.92);
  }
  .icon {
    width: 48px; height: 48px; margin: 0 auto 1.25rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    background: rgba(${tint},0.15);
    color: ${options.ok ? "#7c5cff" : "#ff5c72"};
  }
  h1 {
    font-family: "Space Grotesk", "Inter", sans-serif; font-size: 1.25rem; font-weight: 600;
    margin: 0 0 0.5rem;
  }
  p { margin: 0; color: #828a9c; font-size: 0.95rem; line-height: 1.5; }
  .redirect {
    display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.5rem; border-radius: 8px;
    background: #7c5cff; color: #08090d; font-weight: 600; font-size: 0.9rem;
    text-decoration: none;
  }
  .brand {
    margin-top: 2rem; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase;
    color: #4b3aae;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${options.ok ? "&#10003;" : "&#33;"}</div>
    <h1>${options.ok ? "You're signed in" : "Sign in failed"}</h1>
    <p>${escapeHtml(options.message)}</p>
    ${options.redirectUrl ? `<a class="redirect" href="${escapeHtml(options.redirectUrl)}">${escapeHtml(options.redirectLabel ?? "Try again")}</a>` : ""}
    <div class="brand">Fixmind</div>
  </div>
</body>
</html>`;
}

function waitForOAuthCode(port: number, authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description") ?? url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        errorDescription
          ? oauthCallbackPage({
              ok: false,
              message: `${errorDescription}. You can close this window and return to the terminal.`,
              redirectUrl: authUrl,
            })
          : oauthCallbackPage({
              ok: true,
              message: "CLI sign-in is complete. You can close this window and return to the terminal.",
              redirectUrl: ACCOUNT_URL,
              redirectLabel: "Open website account",
            }),
      );

      clearTimeout(timeout);
      server.close();
      if (errorDescription) reject(new Error(`GitHub sign in failed: ${errorDescription}`));
      else if (code) resolve(code);
      else reject(new Error("No authorization code received from Supabase."));
    });

    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for GitHub sign in."));
    }, OAUTH_TIMEOUT_MS);

    server.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    server.listen(port, "127.0.0.1");
  });
}

export function createSupabaseBackend(url: string, anonKey: string): SyncBackend {
  function client() {
    return createClient(url, anonKey);
  }

  async function withSession(session: SessionTokens) {
    const supabase = client();
    const { error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    if (error) throw new Error(`Sync auth error: ${error.message}`);
    return supabase;
  }

  return {
    async signIn(email, password) {
      const supabase = client();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error(`Sign in failed: ${error?.message ?? "no session"}`);
      return {
        userId: data.user.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    },

    async signUp(email, password) {
      const supabase = client();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(`Sign up failed: ${error.message}`);
      if (!data.session) {
        throw new Error(
          "Account created. Check your email to confirm it, then run `npx fixmind login` again.",
        );
      }
      return {
        userId: data.user!.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    },

    async signInWithGithub(onAuthUrl) {
      const supabase = createClient(url, anonKey, {
        auth: {
          flowType: "pkce",
          storage: new MemoryAuthStorage(),
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const redirectTo = `http://127.0.0.1:${OAUTH_CALLBACK_PORT}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data.url) throw new Error(`GitHub sign in failed: ${error?.message ?? "no auth URL"}`);

      onAuthUrl?.(data.url);
      openInBrowser(data.url);

      const code = await waitForOAuthCode(OAUTH_CALLBACK_PORT, data.url);
      const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !exchanged.session) {
        throw new Error(`GitHub sign in failed: ${exchangeError?.message ?? "no session"}`);
      }
      return {
        userId: exchanged.user.id,
        email: exchanged.user.email ?? "",
        accessToken: exchanged.session.access_token,
        refreshToken: exchanged.session.refresh_token,
      };
    },

    async verifySession(session) {
      await withSession(session);
    },

    async getEntitlement(session) {
      const supabase = await withSession(session);
      const { data, error } = await supabase
        .from("entitlements")
        .select("plan, status")
        .maybeSingle();
      if (error) throw new Error(`Entitlement check failed: ${error.message}`);
      if (!data) return undefined;
      return { plan: data.plan, status: data.status };
    },

    async getUserRecord(userId, session) {
      const supabase = await withSession(session);
      const { data, error } = await supabase
        .from("sync_users")
        .select("salt, verifier_ciphertext, verifier_iv")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(`Sync lookup failed: ${error.message}`);
      if (!data) return undefined;
      return { salt: data.salt, verifierCiphertext: data.verifier_ciphertext, verifierIv: data.verifier_iv };
    },

    async createUserRecord(userId, session, record) {
      const supabase = await withSession(session);
      const { error } = await supabase.from("sync_users").insert({
        user_id: userId,
        salt: record.salt,
        verifier_ciphertext: record.verifierCiphertext,
        verifier_iv: record.verifierIv,
      });
      if (error) throw new Error(`Sync setup failed: ${error.message}`);
    },

    async upsertLessons(userId, session, rows) {
      if (rows.length === 0) return;
      const supabase = await withSession(session);
      const { error } = await supabase.from("lessons_sync").upsert(
        rows.map((row) => ({
          user_id: userId,
          lesson_id: row.lessonId,
          ciphertext: row.ciphertext,
          iv: row.iv,
          updated_at: row.updatedAt,
        })),
      );
      if (error) throw new Error(`Push failed: ${error.message}`);
    },

    async fetchLessonsSince(userId, session, since) {
      const supabase = await withSession(session);
      const { data, error } = await supabase
        .from("lessons_sync")
        .select("lesson_id, ciphertext, iv, updated_at")
        .eq("user_id", userId)
        .gt("updated_at", since)
        .order("updated_at", { ascending: true });
      if (error) throw new Error(`Pull failed: ${error.message}`);
      return (data ?? []).map((row) => ({
        lessonId: row.lesson_id as string,
        ciphertext: row.ciphertext as string,
        iv: row.iv as string,
        updatedAt: row.updated_at as string,
      }));
    },
  };
}
