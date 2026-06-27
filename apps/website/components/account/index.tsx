"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AuthForm } from "@/components/account/AuthForm";
import { AccountStatus } from "@/components/account/AccountStatus";

const POST_LOGIN_PATH_KEY = "fixmind:post-login-path";

function safeNextPath(searchParams: URLSearchParams): string | null {
  const next = searchParams.get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next === "/account" || next.startsWith("/account?")) return null;
  return next;
}

export default function Account() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSession(null);
      return;
    }

    let mounted = true;
    void (async () => {
      const { data } = await client.auth.getSession();
      if (mounted) setSession(data.session);
    })();

    const { data: subscription } = client.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

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
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Account
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Sign in for optional sync.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              Fixmind is local-first by default. Sign in only if you want
              encrypted sync or need to manage your plan.
            </p>
          </div>

          <div className="mt-12">
            {!supabaseConfigured ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Not configured
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Account sign-in is not configured on this deployment yet.
                </p>
              </div>
            ) : session === undefined ? (
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
                <p className="mt-5 text-center text-sm text-muted">
                  Loading your account...
                </p>
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
