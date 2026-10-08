"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { queryKeys } from "@/services/query-keys";

export interface Entitlement {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}

// Matches the server-side gate (`has_active_sync_entitlement`): a row must be
// `active` AND its period must not have ended. `status` alone can go stale if a
// webhook event is missed, so the account page must never trust it by itself.
export function isEntitlementActive(
  entitlement: Entitlement | null | undefined,
): entitlement is Entitlement {
  if (entitlement?.status !== "active") return false;
  if (!entitlement.currentPeriodEnd) return true;
  const expiresAt = Date.parse(entitlement.currentPeriodEnd);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: getSession,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: supabaseConfigured,
  });
}

export function useEntitlementQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.entitlement(userId) : ["entitlement", "none"],
    queryFn: () => getEntitlement(userId),
    enabled: Boolean(userId && supabaseConfigured),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useLessonCountQuery(userId: string | null | undefined) {
  return useQuery({
    queryKey: userId ? queryKeys.lessonCount(userId) : ["lesson-count", "none"],
    queryFn: () => getLessonCount(userId),
    enabled: Boolean(userId && supabaseConfigured),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function getEntitlement(userId: string | null | undefined) {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from("entitlements")
    .select("plan, status, current_period_end")
    .maybeSingle();
  return data
    ? {
        plan: data.plan,
        status: data.status,
        currentPeriodEnd: data.current_period_end ?? null,
      }
    : null;
}

async function getLessonCount(userId: string | null | undefined) {
  if (!supabase || !userId) return 0;
  const { count } = await supabase
    .from("lessons_sync")
    .select("lesson_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("deleted", false);
  return count ?? 0;
}
