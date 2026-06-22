import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Check, KeyRound, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { Footer } from "../shared/Footer";
import { Nav } from "../shared/Nav";
import { usePageMeta } from "../router";
import { InfoPill } from "./InfoPill";

function isRecoveryUrl(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("type") === "recovery" || params.get("flow") === "recovery";
}

export default function AccountCallback() {
  usePageMeta(
    "Finishing sign-in - fixmind",
    "Complete your Fixmind sign-in, magic-link login, or password reset.",
  );

  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recoveryMode, setRecoveryMode] = useState(isRecoveryUrl());
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || recoveryMode) return;
    window.location.replace("/account");
  }, [recoveryMode, session]);

  async function handlePasswordUpdate(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !session) return;

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password updated. Taking you back to your account.");
    window.location.replace("/account");
  }

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
              <InfoPill tone="accent">
                {recoveryMode ? "Password reset" : "Account callback"}
              </InfoPill>
              <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                {recoveryMode ? "Choose a new password" : "Finishing your sign-in"}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-muted">
                {recoveryMode
                  ? "Supabase confirmed your recovery link. Set a new password below to restore access."
                  : "Fixmind is completing the session from your email link and will send you back to the account page."}
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
                <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-8 text-center">
                  <LoaderCircle className="mx-auto animate-spin text-accent" size={24} />
                  <p className="mt-4 text-sm text-muted">
                    Completing the link and loading your account...
                  </p>
                </div>
              ) : session === null ? (
                <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-7 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    No session found
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    The link did not create a session in this browser. If you were
                    trying to sign in, open your account page and try again.
                  </p>
                  <a
                    href="/account"
                    className="mt-5 inline-flex items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    Open account
                  </a>
                </div>
              ) : recoveryMode ? (
                <form
                  onSubmit={handlePasswordUpdate}
                  className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-7"
                >
                  <div className="flex items-center gap-3 text-good">
                    <Check size={16} />
                    <p className="text-sm font-medium">Recovery link confirmed</p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Set a new password for <span className="text-ink">{session.user.email}</span>.
                  </p>
                  <label className="mt-5 block">
                    <span className="sr-only">New password</span>
                    <input
                      type="password"
                      minLength={6}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="New password"
                      className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-bg/40 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
                  >
                    <KeyRound size={14} />
                    Update password
                  </button>
                </form>
              ) : (
                <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-7 text-center">
                  <Check className="mx-auto text-good" size={24} />
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    Signed in as <span className="text-ink">{session?.user.email}</span>.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Redirecting you to the account page now.
                  </p>
                  <a
                    href="/account"
                    className="mt-5 inline-flex items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    Open account
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
