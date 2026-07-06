import type { DashboardData, SyncMeta, Understanding } from "./types";

const SYNC_REQUEST_TIMEOUT_MS = 12_000;

async function requestOk(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback = "Request failed.",
  timeoutMs?: number,
): Promise<void> {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  if (!response.ok) {
    const result = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(result.error ?? fallback);
  }
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback = "Request failed.",
  timeoutMs?: number,
): Promise<T> {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  if (!response.ok) {
    const result = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(result.error ?? fallback);
  }
  return response.json() as Promise<T>;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs?: number): Promise<Response> {
  if (!timeoutMs) return fetch(input, init);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new Error("Sync timed out. Try again.");
    }
    throw caught;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadDashboard(): Promise<DashboardData> {
  return requestJson<DashboardData>("/api/dashboard", undefined, "Could not load lessons.");
}

export async function saveReview(lessonId: string, answers: Record<string, string>, understanding: Understanding): Promise<void> {
  await requestOk(`/api/lessons/${encodeURIComponent(lessonId)}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, understanding }),
  }, "Could not save review.");
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await requestOk(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: "DELETE" }, "Could not delete lesson.");
}

export function exportUrl(format: "json" | "md"): string {
  return `/api/export?format=${format}`;
}

export async function resetAllLessons(): Promise<void> {
  await requestOk("/api/reset", { method: "POST" }, "Could not reset lessons.");
}

export async function syncPull(): Promise<{ pulled: number; applied: number }> {
  return requestJson<{ pulled: number; applied: number }>(
    "/api/sync/pull",
    { method: "POST" },
    "Could not sync pull lessons.",
    SYNC_REQUEST_TIMEOUT_MS,
  );
}

export async function syncRun(): Promise<{ pushed: number; pulled: number; applied: number }> {
  return requestJson<{ pushed: number; pulled: number; applied: number }>(
    "/api/sync/run",
    { method: "POST" },
    "Could not run sync.",
    SYNC_REQUEST_TIMEOUT_MS,
  );
}

export async function syncStatus(): Promise<SyncMeta> {
  return requestJson<SyncMeta>(
    "/api/sync/status",
    undefined,
    "Could not load sync status.",
    SYNC_REQUEST_TIMEOUT_MS,
  );
}
