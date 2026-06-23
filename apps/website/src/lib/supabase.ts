import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function initialAuthRedirectPathFromUrl(): "/account" | "/account/callback" | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const recovery =
    params.get("type") === "recovery" ||
    params.get("flow") === "recovery" ||
    hashParams.get("type") === "recovery" ||
    hashParams.get("flow") === "recovery";
  const hasPayload =
    params.has("code") ||
    params.has("error") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error") ||
    hashParams.has("error_code") ||
    recovery;

  if (!hasPayload) return null;
  return recovery ? "/account/callback" : "/account";
}

export const initialAuthRedirectPath = initialAuthRedirectPathFromUrl();

if (
  initialAuthRedirectPath &&
  typeof window !== "undefined" &&
  window.location.pathname === "/"
) {
  window.history.replaceState(
    window.history.state,
    "",
    `${initialAuthRedirectPath}${window.location.search}${window.location.hash}`,
  );
}

// Same Supabase project the CLI authenticates against in
// packages/core/src/sync.ts — a web account here is the same account
// `fixmind login` signs in to.
export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
