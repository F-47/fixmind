import type { DashboardData, Understanding } from "./types";

export async function loadDashboard(query = ""): Promise<DashboardData> {
  const response = await fetch(`/api/dashboard?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Could not load lessons.");
  return response.json() as Promise<DashboardData>;
}

export async function saveReview(lessonId: string, answers: Record<string, string>, understanding: Understanding): Promise<void> {
  const response = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, understanding }),
  });
  if (!response.ok) {
    const result = await response.json() as { error?: string };
    throw new Error(result.error ?? "Could not save review.");
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const response = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { method: "DELETE" });
  if (!response.ok) {
    const result = await response.json() as { error?: string };
    throw new Error(result.error ?? "Could not delete lesson.");
  }
}
