import type { Understanding } from "./types";

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function reviewAction(value: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(value); target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `Review now - ${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Review now";
  if (days === 1) return "Review tomorrow";
  return `Review ${formatDate(value)}`;
}

export function statusLabel(value: Understanding): string {
  if (value === "understood") return "Understood";
  if (value === "partial") return "Still learning";
  if (value === "copied_blindly") return "Needs practice";
  return "Not reviewed";
}
