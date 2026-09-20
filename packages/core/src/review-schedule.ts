import type { Understanding } from "./types.js";

export const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

const UNDERSTOOD_CAP_DAYS = 60;
const PARTIAL_CAP_DAYS = 14;
const UNDERSTOOD_ANCHOR_DAYS = 7;
const PARTIAL_ANCHOR_DAYS = 3;

export interface ReviewSchedule {
  intervalDays: number;
  ease: number;
  lastIntervalDays: number | null;
}

export function legacyIntervalDays(understanding: Understanding, reviewCount: number): number {
  if (understanding === "copied_blindly") return 1;
  if (understanding === "partial") return Math.min(3 * reviewCount, 14);
  if (understanding === "understood") return Math.min(7 * 2 ** (reviewCount - 1), 60);
  return 1;
}

function qualityFor(understanding: Understanding): number {
  if (understanding === "understood") return 5;
  if (understanding === "partial") return 3;
  return 1;
}

export function nextReviewSchedule(
  understanding: Understanding,
  ease: number = DEFAULT_EASE,
  lastIntervalDays: number | null = null,
): ReviewSchedule {
  const quality = qualityFor(understanding);
  const nextEase = Math.max(MIN_EASE, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  if (quality < 3) {
    return { intervalDays: 1, ease: nextEase, lastIntervalDays: null };
  }

  const capDays = understanding === "understood" ? UNDERSTOOD_CAP_DAYS : PARTIAL_CAP_DAYS;
  const anchorDays = understanding === "understood" ? UNDERSTOOD_ANCHOR_DAYS : PARTIAL_ANCHOR_DAYS;

  if (lastIntervalDays === null) {
    return { intervalDays: anchorDays, ease: nextEase, lastIntervalDays: anchorDays };
  }

  const intervalDays = Math.min(capDays, Math.max(2, Math.round(lastIntervalDays * nextEase)));
  return { intervalDays, ease: nextEase, lastIntervalDays: intervalDays };
}
