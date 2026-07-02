import type { DashboardData, Understanding } from "./types";

async function requestOk(input: RequestInfo | URL, init?: RequestInit, fallback = "Request failed."): Promise<void> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const result = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(result.error ?? fallback);
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit, fallback = "Request failed."): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const result = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(result.error ?? fallback);
  }
  return response.json() as Promise<T>;
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
  return requestJson<{ pulled: number; applied: number }>("/api/sync/pull", { method: "POST" }, "Could not sync pull lessons.");
}

export async function syncStatus(): Promise<{ loggedIn: boolean; syncEnabled: boolean; needsReauth?: boolean; email?: string; lastPushedAt?: string; lastPulledAt?: string }> {
  return requestJson<{ loggedIn: boolean; syncEnabled: boolean; needsReauth?: boolean; email?: string; lastPushedAt?: string; lastPulledAt?: string }>("/api/sync/status", undefined, "Could not load sync status.");
}
