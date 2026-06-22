import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Database, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { InfoPill } from "./InfoPill";

function emailFromQuery(): string {
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function accountCallbackUrl(): string {
  return `${window.location.origin}/account/callback`;
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
              emailRedirectTo: accountCallbackUrl(),
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
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: accountCallbackUrl(),
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
            Fixmind is still fully local without an account. Sign in only if you
            want encrypted sync across machines or need to manage a paid plan.
          </p>

          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bg/40 text-good">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Local-first by default</p>
                <p className="text-sm text-muted">
                  Nothing changes unless you opt into sync.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bg/40 text-accent">
                <Database size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Same account as the CLI</p>
                <p className="text-sm text-muted">
                  Used by <code className="text-ink">npx fixmind login</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
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
              className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-bg/40 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
          >
            {mode === "signIn" ? "Sign in" : "Sign up"}
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </form>

        <button
          type="button"
          onClick={handleGithub}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Continue with GitHub
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          className="mt-4 text-sm text-muted underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          {mode === "signIn"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
