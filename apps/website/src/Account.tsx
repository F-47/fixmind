import type { Session } from "@supabase/supabase-js";
import { CheckCircle2, CircleDashed, LogOut, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CopyButton } from "./components/CopyButton";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { Link, usePageMeta } from "./router";
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
      <p className="mt-1 text-sm text-muted">
        Use the same account when you want encrypted sync across machines.
      </p>
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
  const state =
    entitlement === undefined
      ? "loading"
      : entitlement === null
        ? "free"
        : entitlement.status === "active"
          ? "active"
          : "inactive";
  const planName =
    entitlement && entitlement.plan
      ? entitlement.plan[0].toUpperCase() + entitlement.plan.slice(1)
      : "Free";

  const statusBoxClass =
    state === "active" ? "border-good/30 bg-good/10" : "border-line bg-surface-2";
  const statusTitle =
    state === "loading"
      ? "Checking your plan..."
      : state === "active"
        ? `${planName} plan active`
        : state === "free"
          ? "Free plan active"
          : "No active paid plan";
  const statusBody =
    state === "loading"
      ? "Loading your subscription details."
      : state === "active"
        ? "Encrypted sync is enabled for this account."
        : state === "free"
          ? "You can use fixmind locally on this machine without a subscription."
          : "This account still works locally. Upgrade only if you want sync.";

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
            Account status
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-ink">
            Your account
          </h2>
        </div>
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

      <div className={`mt-5 flex items-start gap-2.5 rounded-md border px-3 py-2.5 ${statusBoxClass}`}>
        {state === "active" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good" />
        ) : (
          <CircleDashed
            size={16}
            className={`mt-0.5 shrink-0 ${state === "loading" ? "animate-spin text-muted" : "text-muted"}`}
          />
        )}
        <div className="min-w-0">
          <p className="text-sm text-ink">{statusTitle}</p>
          <p className="mt-0.5 text-sm text-muted">{statusBody}</p>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-line bg-surface-2 px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          Sync command
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] leading-relaxed text-muted">
            <span className="text-ink">$</span> fixmind login
          </p>
          <CopyButton text="fixmind login" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/pricing"
          className="rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          View pricing
        </Link>
        <Link
          to="/docs"
          className="rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Read docs
        </Link>
      </div>
    </div>
  );
}

function NextStepsCard() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
        What you can do now
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">
        Keep using fixmind locally
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Free users already have the full local loop. This page is just for
        identity and optional sync.
      </p>

      <div className="mt-5 space-y-3">
        <div className="rounded-md border border-line bg-surface-2 px-3 py-3">
          <p className="text-sm font-medium text-ink">Open the dashboard</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Review lessons, search your history, and check progress with{" "}
            <code className="text-ink">fixmind dashboard</code>.
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface-2 px-3 py-3">
          <p className="text-sm font-medium text-ink">Use sync only when you need it</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Run <code className="text-ink">fixmind login</code> on each machine
            if you want encrypted cross-device sync.
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface-2 px-3 py-3">
          <p className="text-sm font-medium text-ink">Upgrade later, if it matters</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Paid plans only add sync and team features. The local learning loop
            stays free.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/#install"
          className="rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Setup guide
        </Link>
        <Link
          to="/contact"
          className="rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}

export default function Account() {
  usePageMeta(
    "Account and sync - fixmind",
    "Manage your fixmind account, optional sync, and paid plan status.",
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
          <div className="relative mx-auto max-w-5xl px-6 py-24">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                Account and sync
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                Manage login and optional sync
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-muted">
                Fixmind stays local by default. Use this page to manage sign-in,
                see plan status, and enable encrypted sync only when you need it.
              </p>
            </div>

            <div className="mt-10">
              {!supabaseConfigured ? (
                <p className="mx-auto max-w-xl rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
                  Account sign-in is not configured on this deployment yet.
                </p>
              ) : session === undefined ? (
                <p className="text-sm text-muted">Loading...</p>
              ) : session ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <AccountStatus session={session} />
                  <NextStepsCard />
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
