import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { usePageMeta } from "./router";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { AuthForm } from "./account/AuthForm";
import { AccountStatus } from "./account/AccountStatus";
import { InfoPill } from "./account/InfoPill";

function getCliCallbackUrl(): URL | null {
  const value = new URLSearchParams(window.location.search).get("cli_callback");
  if (!value) return null;
  try {
    const url = new URL(value);
    const localHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    if (url.protocol !== "http:" || !localHost) return null;
    return url;
  } catch {
    return null;
  }
}

function createCliCallbackTarget(session: { access_token: string; refresh_token: string }, cliCallback: string): string {
  const url = new URL(cliCallback);
  url.searchParams.set("access_token", session.access_token);
  url.searchParams.set("refresh_token", session.refresh_token);
  url.searchParams.set("token_type", "bearer");
  return url.toString();
}

export default function Account() {
  usePageMeta(
    "Account and sync - fixmind",
    "Manage your fixmind account, optional sync, and paid plan status.",
  );

  const cliCallback = getCliCallbackUrl()?.toString() ?? null;

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSession(null);
      return;
    }
    const supabaseClient = client as NonNullable<typeof supabase>;

    let mounted = true;
    void (async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (mounted) setSession(data.session);
    })();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !cliCallback) return;
    window.location.replace(createCliCallbackTarget(session, cliCallback));
  }, [cliCallback, session]);

  return (
    <div>
      <Nav />

      <div className="relative overflow-hidden bg-grid">
        <section>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
              <InfoPill tone="accent">Account and sync</InfoPill>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                A clean control center for local-first users
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-muted">
                Fixmind stays on your machine by default. This page is for the
                small number of moments where you want to sign in, check plan
                status, or turn on encrypted sync.
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
                    {cliCallback ? "Signing you in, then returning you to the terminal..." : "Loading your account..."}
                  </p>
                </div>
              ) : session ? (
                <div className="grid gap-6 lg:grid-cols-1">
                  <AccountStatus session={session} />
                </div>
              ) : (
                <AuthForm />
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
