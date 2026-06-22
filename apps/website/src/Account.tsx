import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { usePageMeta } from "./router";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { AuthForm } from "./account/AuthForm";
import { AccountStatus } from "./account/AccountStatus";
import { InfoPill } from "./account/InfoPill";

function readRedirectSession() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export default function Account() {
  usePageMeta(
    "Account and sync - fixmind",
    "Manage your fixmind account, optional sync, and paid plan status.",
  );

  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setSession(null);
      setAuthState("signed-out");
      return;
    }
    const supabaseClient = client as NonNullable<typeof supabase>;
    const redirectSession = readRedirectSession();

    let mounted = true;
    let initialCheckComplete = false;

    async function hydrateSessionFromRedirect() {
      if (!redirectSession) return false;

      setAuthState("loading");
      setRedirectError(null);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: redirectSession.accessToken,
          refresh_token: redirectSession.refreshToken,
        });

        if (!mounted) return true;
        if (!error && data.session) {
          setSession(data.session);
          setAuthState("signed-in");
          window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
          return true;
        }

        if (attempt < 2) {
          await wait(250 * (attempt + 1));
        }
      }

      return false;
    }

    void (async () => {
      if (redirectSession) {
        const hydrated = await hydrateSessionFromRedirect();
        if (!mounted) return;
        if (!hydrated) {
          const { data, error } = await supabaseClient.auth.getSession();
          if (!mounted) return;
          if (data.session) {
            setSession(data.session);
            setAuthState("signed-in");
          } else {
            setSession(null);
            setAuthState("signed-out");
            setRedirectError(error?.message ?? "The sign-in redirect could not be applied.");
          }
        }
        initialCheckComplete = true;
        return;
      }

      const { data } = await supabaseClient.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setAuthState(data.session ? "signed-in" : "signed-out");
      initialCheckComplete = true;
    })();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      if (!initialCheckComplete && !nextSession) return;
      setSession(nextSession);
      setAuthState(nextSession ? "signed-in" : "signed-out");
      if (!nextSession) {
        setRedirectError(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
              ) : authState === "loading" ? (
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
                    Finishing your sign-in from the CLI...
                  </p>
                </div>
              ) : session ? (
                <div className="grid gap-6 lg:grid-cols-1">
                  <AccountStatus session={session} />
                </div>
              ) : redirectError ? (
                <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-7 text-center">
                  <InfoPill tone="accent">Sign-in not ready</InfoPill>
                  <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
                    We could not finish the redirect sign-in.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    The CLI login completed, but this page could not apply the session
                    yet. Refresh the page once, or sign in again from the account form.
                  </p>
                  <p className="mt-4 font-mono text-xs text-muted">{redirectError}</p>
                  <div className="mt-6">
                    <AuthForm />
                  </div>
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
