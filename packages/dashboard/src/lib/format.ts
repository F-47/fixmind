import type { Understanding } from "./types";

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function formatDateTime(value?: string): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const weekLabel = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatWeek(weekStart: string): string {
  return weekLabel.format(new Date(`${weekStart}T00:00:00Z`));
}

/** The Monday (UTC) that starts the week containing `value`, as an ISO date. */
export function weekStartOf(value: string): string {
  const date = new Date(value);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - daysSinceMonday);
  return utc.toISOString().slice(0, 10);
}

export function statusLabel(value: Understanding): string {
  return value === "understood" ? "Learned" : "Not learned";
}

export function statusColor(value: Understanding): string {
  if (value === "understood") return "text-positive";
  return "text-warn";
}

export function formatToolName(tool: string): string {
  return tool
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
