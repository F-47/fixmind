"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { queryKeys } from "@/services/query-keys";

export interface Entitlement {
  plan: string;
  status: string;
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
  const { data } = await supabase.from("entitlements").select("plan, status").maybeSingle();
  return data ?? null;
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
