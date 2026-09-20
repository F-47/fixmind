"use client";

import { ArrowRight, Loader2, Mail, ShieldCheck, SquareTerminal } from "lucide-react";
import Image from "next/image";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { InfoPill } from "@/components/ui/InfoPill";
import { supabase } from "@/lib/supabase";

function emailFromQuery(): string {
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function accountUrl(): string {
  return `${window.location.origin}/account`;
}

const oauthButtonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-black/90 bg-[#0d1117] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#161b22] hover:text-white";

// ─── Animated feature item ────────────────────────────────────────────────

function FeatureItem({
  icon,
  title,
  description,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  index: number;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 transition-all duration-300 hover:border-accent/30"
      style={{
        animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 100}ms both`,
      }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-bg/40">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

export function AuthForm() {
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setPending(true);
    const { error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: accountUrl(),
            },
          });
    setPending(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (mode === "signUp") {
      toast.success("Check your email to confirm your account, then sign in.", {
        icon: <Mail size={16} />,
        duration: 8000,
      });
    }
  }

  async function handleGithub() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: accountUrl(),
      },
    });
    if (error) toast.error(error.message);
  }

  async function handleGoogle() {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: accountUrl(),
      },
    });
    if (error) toast.error(error.message);
  }

  return (
    <>
      {/* Inline keyframes for feature item animation */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .input-focus-ring:focus {
          outline: none;
          border-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 12%, transparent);
        }
      `}</style>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left panel */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-accent/15 blur-3xl"
          />
          <div className="relative">
            <InfoPill tone="accent">Account access</InfoPill>
            <h2 className="mt-4 max-w-md font-display text-3xl font-semibold tracking-tight text-ink">
              One login for optional sync.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Fixmind is still fully local without an account. Sign in only if you want encrypted
              sync across machines or need to manage a paid plan.
            </p>

            <div className="mt-7 space-y-3">
              <FeatureItem
                index={0}
                icon={<ShieldCheck size={16} className="text-good" />}
                title="Local-first by default"
                description="Nothing changes unless you opt into sync."
              />
              <FeatureItem
                index={1}
                icon={<SquareTerminal size={16} className="shrink-0 text-accent" />}
                title="Terminal sync on this device"
                description={
                  <>
                    Run <code className="text-ink">npx fixmind login</code> when you want encrypted
                    sync on this machine. The passphrase encrypts your lessons before they sync.
                  </>
                }
              />
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="rounded-2xl border border-line bg-surface p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Sign in
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-ink">
                {mode === "signIn" ? "Welcome back" : "Create access"}
              </h2>
            </div>
            <InfoPill>{mode === "signIn" ? "Returning user" : "New account"}</InfoPill>
          </div>

          <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-focus-ring w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink transition-all placeholder:text-muted"
              />
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-focus-ring w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink transition-all placeholder:text-muted"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-bg/40 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {mode === "signIn" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {mode === "signIn" ? "Sign in" : "Sign up"}
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>

          <div className="mt-3 grid gap-3">
            <button type="button" onClick={handleGoogle} className={oauthButtonClassName}>
              <Image
                src="/logos/google.svg"
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0"
              />
              Continue with Google
            </button>

            <button type="button" onClick={handleGithub} className={oauthButtonClassName}>
              <Image
                src="/logos/github.svg"
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0"
              />
              Continue with GitHub
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            className="mt-4 text-sm text-muted underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </>
  );
}
