import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import fs from "node:fs";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboardData } from "./dashboard-data.js";
import { lessonsToJson, lessonsToMarkdown } from "./export.js";
import { createLessonStore, type LessonStore } from "./storage.js";
import type { ReviewQuestion, Understanding } from "./types.js";

export interface DashboardOptions {
  port?: number;
  open?: boolean;
  store?: LessonStore;
}

export interface DashboardHandle {
  url: string;
  close(): Promise<void>;
}

const HOST = "127.0.0.1";
const DASHBOARD_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dashboard");

export async function startDashboard(options: DashboardOptions = {}): Promise<DashboardHandle> {
  const store = options.store ?? createLessonStore();
  const ownsStore = !options.store;
  const { autoPullOnStart } = await import("./sync.js");
  await autoPullOnStart(store);
  const server = http.createServer((request, response) => {
    void handleRequest(store, request, response);
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
        server.close((error) => error ? reject(error) : resolve());
      });
      if (ownsStore) store.close();
    },
  };
}

async function handleRequest(
  store: LessonStore,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", `http://${HOST}`);
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      const all = store.list(Number.MAX_SAFE_INTEGER);
      const visible = query ? store.search(query) : all.slice(0, 100);
      sendJson(response, 200, buildDashboardData(
        all,
        visible,
        store.due(),
        store.conceptStats().slice(0, 10),
      ));
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

    const reviewMatch = request.method === "POST"
      && url.pathname.match(/^\/api\/lessons\/([^/]+)\/review$/);
    if (reviewMatch) {
      await saveReview(store, decodeURIComponent(reviewMatch[1]), request, response);
      return;
    }
    const deleteMatch = request.method === "DELETE"
      && url.pathname.match(/^\/api\/lessons\/([^/]+)$/);
    if (deleteMatch) {
      const existed = store.delete(decodeURIComponent(deleteMatch[1]));
      sendJson(response, existed ? 200 : 404, existed ? { ok: true } : { error: "Lesson not found." });
      return;
    }
    if (request.method === "GET") {
      serveDashboardAsset(url.pathname, response);
      return;
    }
    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
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

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(value));
}

function send(response: ServerResponse, status: number, contentType: string, body: string): void {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  response.end(body);
}

function sendDownload(response: ServerResponse, body: string, filename: string, contentType: string): void {
  response.writeHead(200, {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  response.end(body);
}

function serveDashboardAsset(requestPath: string, response: ServerResponse): void {
  const relativePath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
  const filePath = path.resolve(DASHBOARD_DIRECTORY, relativePath);
  if (!filePath.startsWith(`${DASHBOARD_DIRECTORY}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (requestPath !== "/" && !path.extname(requestPath)) {
      serveFile(path.join(DASHBOARD_DIRECTORY, "index.html"), response);
      return;
    }
    sendJson(response, 404, { error: "Dashboard asset not found." });
    return;
  }
  serveFile(filePath, response);
}

function serveFile(filePath: string, response: ServerResponse): void {
  if (!fs.existsSync(filePath)) {
    send(response, 500, "text/plain; charset=utf-8", "Dashboard assets are missing. Run npm run build.");
    return;
  }
  const contentType = new Map([
    [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
    [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"], [".png", "image/png"], [".ico", "image/x-icon"],
  ]).get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": path.basename(filePath) === "index.html" ? "no-store" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  });
  fs.createReadStream(filePath).pipe(response);
}

function openBrowser(url: string): void {
  const command = process.platform === "win32"
    ? { file: "cmd", args: ["/c", "start", "", url] }
    : process.platform === "darwin"
      ? { file: "open", args: [url] }
      : { file: "xdg-open", args: [url] };
  execFile(command.file, command.args, { windowsHide: true }, () => undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
