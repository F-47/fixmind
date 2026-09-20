import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { buildDashboardData } from "./dashboard-data.js";
import { lessonsToJson, lessonsToMarkdown } from "./export.js";
import { createLessonStore, type LessonStore } from "./storage.js";
import type { ReviewQuestion, Understanding } from "./types.js";
import { isRecord } from "./utils.js";

export interface DashboardOptions {
  port?: number;
  open?: boolean;
  store?: LessonStore;
  dashboardDirectory?: string;
  sessionToken?: string;
}

export interface DashboardHandle {
  url: string;
  close(): Promise<void>;
}

const HOST = "127.0.0.1";
const DEFAULT_DASHBOARD_DIRECTORY = path.resolve(
  path.dirname(process.argv[1] ?? process.execPath),
  "../dashboard",
);
const DASHBOARD_SYNC_TIMEOUT_MS = 12_000;

export async function startDashboard(options: DashboardOptions = {}): Promise<DashboardHandle> {
  const store = options.store ?? createLessonStore();
  const ownsStore = !options.store;
  const { autoPullOnStart, scheduleAutoPush } = await import("./sync.js");
  await autoPullOnStart(store);
  scheduleAutoPush(store);
  const server = http.createServer((request, response) => {
    void handleRequest(
      store,
      path.resolve(options.dashboardDirectory ?? DEFAULT_DASHBOARD_DIRECTORY),
      options.sessionToken ?? process.env.FIXMIND_SESSION_TOKEN,
      request,
      response,
    );
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 4317, HOST, resolve);
  });
  const address = server.address() as AddressInfo;
  const url = `http://${HOST}:${address.port}`;
  if (options.open !== false) openBrowser(url);

  return {
    url,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      if (ownsStore) store.close();
    },
  };
}

async function handleRequest(
  store: LessonStore,
  dashboardDirectory: string,
  sessionToken: string | undefined,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", `http://${HOST}`);
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { service: "fixmind-dashboard" });
      return;
    }
    if (url.pathname.startsWith("/api/") && !authorizeApiRequest(request, sessionToken)) {
      sendJson(response, 401, { error: "Unauthorized." });
      return;
    }
    if (url.pathname.startsWith("/api/") && !hasTrustedOrigin(request)) {
      sendJson(response, 403, { error: "Untrusted request origin." });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const limit = positiveIntParam(url.searchParams, "limit", 1);
      const offset = positiveIntParam(url.searchParams, "offset", 0);
      const paginated = limit !== undefined || offset !== undefined;
      const etag = dashboardEtag(store.contentVersion(new Date()));
      const requestTag = request.headers["if-none-match"];
      const incomingTag = Array.isArray(requestTag) ? requestTag[0] : requestTag;

      if (!paginated && incomingTag === etag) {
        response.writeHead(304, { ETag: etag, "Cache-Control": "no-cache" });
        response.end();
        return;
      }

      const all = store.list(Number.MAX_SAFE_INTEGER);
      const visible = paginated
        ? all.slice(offset ?? 0, limit !== undefined ? (offset ?? 0) + limit : undefined)
        : all;
      sendJson(
        response,
        200,
        buildDashboardData(all, visible, store.due(), store.conceptStats().slice(0, 10)),
        paginated ? undefined : { ETag: etag, "Cache-Control": "no-cache" },
      );
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/export") {
      const format = url.searchParams.get("format") === "md" ? "md" : "json";
      const lessons = store.list(Number.MAX_SAFE_INTEGER);
      const content = format === "md" ? lessonsToMarkdown(lessons) : lessonsToJson(lessons);
      const date = new Date().toISOString().slice(0, 10);
      sendDownload(
        response,
        content,
        `fixmind-lessons-${date}.${format}`,
        format === "md" ? "text/markdown; charset=utf-8" : "application/json; charset=utf-8",
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reset") {
      store.reset();
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/sync/pull") {
      const { createSyncEngine } = await import("./sync.js");
      try {
        const result = await withDashboardSyncTimeout(() => createSyncEngine(store).pull());
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/sync/run") {
      const { createSyncEngine } = await import("./sync.js");
      try {
        const result = await withDashboardSyncTimeout(() => createSyncEngine(store).run());
        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/sync/status") {
      const { createSyncEngine } = await import("./sync.js");
      sendJson(
        response,
        200,
        await withDashboardSyncTimeout(() => createSyncEngine(store).status()),
      );
      return;
    }

    const reviewMatch =
      request.method === "POST" && url.pathname.match(/^\/api\/lessons\/([^/]+)\/review$/);
    if (reviewMatch) {
      await saveReview(store, decodeURIComponent(reviewMatch[1]), request, response);
      return;
    }
    const deleteMatch =
      request.method === "DELETE" && url.pathname.match(/^\/api\/lessons\/([^/]+)$/);
    if (deleteMatch) {
      const existed = store.delete(decodeURIComponent(deleteMatch[1]));
      sendJson(
        response,
        existed ? 200 : 404,
        existed ? { ok: true } : { error: "Lesson not found." },
      );
      return;
    }
    if (request.method === "GET") {
      serveDashboardAsset(dashboardDirectory, url.pathname, response);
      return;
    }
    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function authorizeApiRequest(request: IncomingMessage, sessionToken: string | undefined): boolean {
  if (!sessionToken) return true;
  return request.headers.authorization === `Bearer ${sessionToken}`;
}

function hasTrustedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  const host = request.headers.host;
  return host !== undefined && origin === `http://${host}` && host.startsWith(`${HOST}:`);
}

async function saveReview(
  store: LessonStore,
  lessonId: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const lesson = store.get(lessonId);
  if (!lesson) {
    sendJson(response, 404, { error: "Lesson not found." });
    return;
  }

  const body = await readJson(request);
  const understanding = validateUnderstanding(body.understanding);
  const answers = isRecord(body.answers) ? body.answers : {};
  const questions: ReviewQuestion[] = lesson.reviewQuestions.map((question) => {
    const submittedAnswer = answers[question.id];
    const answer = typeof submittedAnswer === "string" ? submittedAnswer.trim() : "";
    return {
      ...question,
      userAnswer: answer || undefined,
      status: answer ? "answered" : "skipped",
    };
  });
  sendJson(response, 200, store.updateReview(lesson.id, questions, understanding));
}

function validateUnderstanding(value: unknown): Understanding {
  if (value === "understood" || value === "partial" || value === "copied_blindly") return value;
  throw new Error("Choose an understanding level.");
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk.toString();
    if (raw.length > 1_000_000) throw new Error("Request body is too large.");
  }
  const parsed: unknown = JSON.parse(raw || "{}");
  if (!isRecord(parsed)) throw new Error("Expected a JSON object.");
  return parsed;
}

function positiveIntParam(
  params: URLSearchParams,
  name: string,
  minimum: number,
): number | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`?${name} must be an integer >= ${minimum}.`);
  }
  return parsed;
}

function dashboardEtag(contentVersion: string): string {
  return `"${createHash("sha256").update(contentVersion).digest("hex").slice(0, 32)}"`;
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(value), extraHeaders);
}

function send(
  response: ServerResponse,
  status: number,
  contentType: string,
  body: string,
  extraHeaders: Record<string, string> = {},
): void {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
    ...extraHeaders,
  });
  response.end(body);
}

function sendDownload(
  response: ServerResponse,
  body: string,
  filename: string,
  contentType: string,
): void {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  response.end(body);
}

function serveDashboardAsset(
  dashboardDirectory: string,
  requestPath: string,
  response: ServerResponse,
): void {
  const relativePath =
    requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const filePath = path.resolve(dashboardDirectory, relativePath);
  if (
    !filePath.startsWith(`${dashboardDirectory}${path.sep}`) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    if (requestPath !== "/" && !path.extname(requestPath)) {
      serveFile(path.join(dashboardDirectory, "index.html"), response);
      return;
    }
    sendJson(response, 404, { error: "Dashboard asset not found." });
    return;
  }
  serveFile(filePath, response);
}

function serveFile(filePath: string, response: ServerResponse): void {
  if (!fs.existsSync(filePath)) {
    send(
      response,
      500,
      "text/plain; charset=utf-8",
      "Dashboard assets are missing. Run npm run build.",
    );
    return;
  }
  const contentType =
    new Map([
      [".html", "text/html; charset=utf-8"],
      [".js", "text/javascript; charset=utf-8"],
      [".css", "text/css; charset=utf-8"],
      [".json", "application/json; charset=utf-8"],
      [".svg", "image/svg+xml"],
      [".png", "image/png"],
      [".ico", "image/x-icon"],
    ]).get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control":
      path.basename(filePath) === "index.html" ? "no-store" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy":
      "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  fs.createReadStream(filePath).pipe(response);
}

function openBrowser(url: string): void {
  const command =
    process.platform === "win32"
      ? { file: "cmd", args: ["/c", "start", "", url] }
      : process.platform === "darwin"
        ? { file: "open", args: [url] }
        : { file: "xdg-open", args: [url] };
  execFile(command.file, command.args, { windowsHide: true }, () => undefined);
}

async function withDashboardSyncTimeout<T>(operation: () => Promise<T>): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Sync timed out. Try again.")), DASHBOARD_SYNC_TIMEOUT_MS),
    ),
  ]);
}
