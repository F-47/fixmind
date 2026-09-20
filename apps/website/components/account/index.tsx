"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AccountStatus } from "@/components/account/AccountStatus";
import { AuthForm } from "@/components/account/AuthForm";
import { supabaseConfigured } from "@/lib/supabase";
import { useSessionQuery } from "@/services/queries";

const POST_LOGIN_PATH_KEY = "fixmind:post-login-path";

function safeNextPath(searchParams: URLSearchParams): string | null {
  const next = searchParams.get("next");
  if (!next?.startsWith("/") || next.startsWith("//")) return null;
  if (next === "/account" || next.startsWith("/account?")) return null;
  return next;
}

export default function Account() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isLoading } = useSessionQuery();

  useEffect(() => {
    const next = safeNextPath(new URLSearchParams(searchParams?.toString() ?? ""));
    if (next) sessionStorage.setItem(POST_LOGIN_PATH_KEY, next);
  }, [searchParams]);

  useEffect(() => {
    if (!session) return;

    const next =
      safeNextPath(new URLSearchParams(searchParams?.toString() ?? "")) ??
      sessionStorage.getItem(POST_LOGIN_PATH_KEY);
    if (!next) return;

    sessionStorage.removeItem(POST_LOGIN_PATH_KEY);
    router.replace(next);
  }, [router, searchParams, session]);

  return (
    <div className="relative overflow-hidden bg-grid">
      <section>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Account</p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Sign in
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              Use this page for optional encrypted sync or plan management.
            </p>
          </div>

          <div className="mt-12">
            {!supabaseConfigured ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Not configured
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Account sign-in is unavailable on this deployment.
                </p>
              </div>
            ) : isLoading ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 w-32 rounded bg-surface-2" />
                  <div className="h-9 w-2/3 rounded bg-surface-2" />
                  <div className="h-4 w-full rounded bg-surface-2" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-20 rounded-xl bg-surface-2" />
                    <div className="h-20 rounded-xl bg-surface-2" />
                  </div>
                </div>
                <p className="mt-5 text-center text-sm text-muted">Loading your account...</p>
              </div>
            ) : session ? (
              <div className="mx-auto max-w-5xl">
                <AccountStatus session={session} />
              </div>
            ) : (
              <div className="mx-auto max-w-5xl">
                <AuthForm />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
