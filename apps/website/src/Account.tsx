import type { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Database,
  Globe,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
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

const LOCAL_DASHBOARD_URL = "http://127.0.0.1:4317";

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

function InfoPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "good" | "accent";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${
        tone === "good"
          ? "border-good/30 bg-good/10 text-good"
          : tone === "accent"
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-line bg-surface-2 text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function ActionTile({
  icon,
  title,
  description,
  href,
  external = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const className =
    "group flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface";

  const content = (
    <>
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-bg/40 text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-semibold text-ink">
            {title}
          </h3>
          <ArrowRight
            size={14}
            className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  );
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
                  Used by <code className="text-ink">fixmind login</code>.
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
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
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
          {mode === "signIn" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
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
  const planName = entitlement && entitlement.plan ? capitalize(entitlement.plan) : "Free";

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
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-40 w-[520px] -translate-x-1/2 rounded-full bg-accent/12 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <InfoPill tone={state === "active" ? "good" : "default"}>
              {state === "active"
                ? "Active"
                : state === "free"
                  ? "Free"
                  : state === "loading"
                    ? "Loading"
                    : "Inactive"}
            </InfoPill>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
              {statusTitle}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
              {statusBody}
            </p>
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

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              Signed in as
            </p>
            <p className="mt-2 break-all text-sm text-ink">{email}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              Plan
            </p>
            <p className="mt-2 text-sm text-ink">
              {state === "active"
                ? `${planName} plan`
                : state === "free"
                  ? "Free local-only use"
                  : "No paid plan"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <InfoPill tone="accent">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={10} />
              Local first
            </span>
          </InfoPill>
          <InfoPill>
            <span className="inline-flex items-center gap-1">
              <Globe size={10} />
              Sync optional
            </span>
          </InfoPill>
          <InfoPill>
            <span className="inline-flex items-center gap-1">
              <TerminalSquare size={10} />
              fixmind login
            </span>
          </InfoPill>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-bg/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Sync command
              </p>
              <p className="mt-1 font-mono text-[12px] text-ink">
                <span className="text-muted">$</span> fixmind login
              </p>
            </div>
            <CopyButton text="fixmind login" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Run this on every machine you want encrypted sync on. If you only use
            one device, you can ignore it.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/pricing"
            className="group flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <div>
              <p className="text-sm font-medium text-ink">View pricing</p>
              <p className="text-sm text-muted">See what sync adds.</p>
            </div>
            <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
          <Link
            to="/docs"
            className="group flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <div>
              <p className="text-sm font-medium text-ink">Read docs</p>
              <p className="text-sm text-muted">CLI, dashboard, and setup.</p>
            </div>
            <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function NextStepsCard() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <InfoPill tone="accent">Next steps</InfoPill>
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            Keep the momentum
          </h2>
        </div>
        <Sparkles size={16} className="text-accent" />
      </div>

      <div className="mt-6 space-y-3">
        <ActionTile
          href={LOCAL_DASHBOARD_URL}
          external
          icon={<TerminalSquare size={16} />}
          title="Open the dashboard"
          description="Open the local dashboard in your browser if it is already running."
        />
        <ActionTile
          href="/docs"
          icon={<Database size={16} />}
          title="Read the docs"
          description="See how lessons, reviews, and sync fit together."
        />
        <ActionTile
          href="/contact"
          icon={<ShieldCheck size={16} />}
          title="Contact support"
          description="Ask about sync, billing, or deployment questions."
        />
      </div>

      <div className="mt-6 rounded-xl border border-line bg-bg/40 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          Free user note
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The core learning loop stays free. Paid plans only add sync and team
          features on top. If the local dashboard is not open yet, run{" "}
          <code className="text-ink">fixmind dashboard</code> once, then use
          the button here.
        </p>
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
                </div>
              ) : session ? (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
