import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, CircleDashed, LogOut, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CopyButton } from "./components/CopyButton";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { usePageMeta } from "./router";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";

interface Entitlement {
  plan: string;
  status: string;
}

function emailFromQuery(): string {
  return new URLSearchParams(window.location.search).get("email") ?? "";
}

function AuthForm() {
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
        : await supabase.auth.signUp({ email, password });
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
      options: { redirectTo: window.location.href },
    });
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-surface p-6">
      <h2 className="font-display text-xl font-semibold text-ink">
        {mode === "signIn" ? "Sign in" : "Create your account"}
      </h2>
      <p className="mt-1 text-sm text-muted">Same account fixmind&rsquo;s CLI uses for</p>
      <code className="mt-0.5 block text-sm text-ink">fixmind login</code>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="block w-full rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
        >
          {mode === "signIn" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGithub}
        className="mt-3 block w-full rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
      >
        Continue with GitHub
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        className="mt-4 text-sm text-muted underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

function AccountStatus({ session }: { session: Session }) {
  const [entitlement, setEntitlement] = useState<Entitlement | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("entitlements")
      .select("plan, status")
      .maybeSingle()
      .then(({ data }) => setEntitlement(data ?? null));
  }, []);

  const email = session.user.email ?? "";
  const isActive = entitlement?.status === "active";

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">Your account</h2>
        <button
          type="button"
          onClick={() => supabase?.auth.signOut()}
          className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">{email}</p>

      <div
        className={`mt-5 flex items-center gap-2.5 rounded-md border px-3 py-2.5 ${
          isActive ? "border-good/30 bg-good/10" : "border-line bg-surface-2"
        }`}
      >
        {entitlement === undefined ? (
          <p className="text-sm text-muted">Checking your plan&hellip;</p>
        ) : isActive ? (
          <>
            <CheckCircle2 size={16} className="shrink-0 text-good" />
            <p className="text-sm text-ink">
              <span className="font-medium capitalize">{entitlement.plan}</span> plan &middot; active
            </p>
          </>
        ) : (
          <>
            <CircleDashed size={16} className="shrink-0 text-muted" />
            <p className="text-sm text-muted">No active paid plan on this account yet.</p>
          </>
        )}
      </div>

      <p className="mt-5 text-sm text-muted">
        Run this on each machine you want to sync from:
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 py-2">
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          <span className="text-ink">$</span> fixmind login
        </p>
        <CopyButton text="fixmind login" />
      </div>
    </div>
  );
}

export default function Account() {
  usePageMeta(
    "Account — fixmind",
    "Manage your fixmind account and connect the CLI with fixmind login.",
  );

  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.subscription.unsubscribe();
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
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Account
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Connect fixmind to this account
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              One account ties your CLI to a paid plan. Sign in here, then run{" "}
              <code className="text-ink">fixmind login</code> on every
              machine you want to sync from.
            </p>

            <div className="mt-10">
              {!supabaseConfigured ? (
                <p className="mx-auto max-w-xl rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
                  Account sign-in isn&rsquo;t configured on this deployment yet.
                </p>
              ) : session === undefined ? (
                <p className="text-sm text-muted">Loading&hellip;</p>
              ) : session ? (
                <AccountStatus session={session} />
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
