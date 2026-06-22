import type { Session } from "@supabase/supabase-js";
import { ArrowRight, Globe, LogOut, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "../router";
import { CommandCard } from "./CommandCard";
import { InfoPill } from "./InfoPill";

interface Entitlement {
  plan: string;
  status: string;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}

export function AccountStatus({ session }: { session: Session }) {
  const [entitlement, setEntitlement] = useState<Entitlement | null | undefined>(undefined);
  const [lessonCount, setLessonCount] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("entitlements")
      .select("plan, status")
      .maybeSingle()
      .then(({ data }) => setEntitlement(data ?? null));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("lessons_sync")
      .select("lesson_id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("deleted", false)
      .then(({ count }) => setLessonCount(count ?? 0));
  }, [session.user.id]);

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
    entitlement && entitlement.plan ? capitalize(entitlement.plan) : "Free";
  const syncEnabled = state === "active";

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
  const lessonCountLabel =
    syncEnabled
      ? lessonCount === undefined
        ? "Loading lessons..."
        : lessonCount === null
          ? "Lessons unavailable"
          : `${lessonCount} synced lesson${lessonCount === 1 ? "" : "s"}`
      : "Lessons stay on this device.";

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

        <div className={`mt-6 grid gap-3 ${syncEnabled ? "sm:grid-cols-2 md:grid-cols-4" : "sm:grid-cols-2 md:grid-cols-3"}`}>
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
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              {syncEnabled ? "Lessons" : "Local only"}
            </p>
            <p className="mt-2 text-sm text-ink">{lessonCountLabel}</p>
          </div>
          {syncEnabled && (
            <div className="rounded-xl border border-line bg-surface-2 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Sync status
              </p>
              <p className="mt-2 text-sm text-ink">Encrypted sync is on.</p>
            </div>
          )}
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
              Encrypted sync
            </span>
          </InfoPill>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-bg/35 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            CLI access
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Use <code className="text-ink">npx fixmind setup</code> to register
            the MCP server on a new machine. The Login card below turns on
            encrypted sync when you want it.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CommandCard
              label="Setup"
              command="npx fixmind setup"
              description="Register Claude Code, Cursor, and Codex without a global install."
            />
            <CommandCard
              label="Login"
              command="npx fixmind login"
              description="Turn on encrypted sync for this machine when you're ready."
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Install globally only if you want a persistent{" "}
            <code className="text-ink">fixmind</code> command on your PATH.
          </p>
        </div>

        {syncEnabled ? (
          <>
            <div className="mt-4 rounded-xl border border-line bg-bg/35 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Best practice
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sign in once on each device. After that, opening the dashboard
                usually refreshes lessons for you, and these commands cover the
                manual cases:
              </p>
              <div className="mt-3 grid gap-3">
                <CommandCard
                  label="Push"
                  command="npx fixmind sync push"
                  description="Send local lessons from this device up to sync storage."
                />
                <CommandCard
                  label="Status"
                  command="npx fixmind sync status"
                  description="Check whether this device is logged in and when it last synced."
                />
                <CommandCard
                  label="Pull"
                  command="npx fixmind sync pull"
                  description="Fetch the latest lessons from sync storage."
                />
                <CommandCard
                  label="Open"
                  command="npx fixmind dashboard"
                  description="Open the dashboard. It pulls the latest lessons when it starts, so it is the easiest refresh."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface/80 to-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <InfoPill tone="accent">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={10} />
                    Upgrade to Pro
                  </span>
                </InfoPill>
                <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                  Keep your lessons in sync on every machine.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                  Fixmind stays local on this device for free. Pro adds encrypted sync,
                  so the same lessons follow you from laptop to desktop without extra setup.
                </p>
              </div>
              <div className="hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent sm:block">
                Pro
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-bg/35 px-3 py-2">
                Encrypted sync
              </div>
              <div className="rounded-lg border border-line bg-bg/35 px-3 py-2">
                Lessons on every device
              </div>
              <div className="rounded-lg border border-line bg-bg/35 px-3 py-2">
                One login, then keep working
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/15"
              >
                View Pro pricing
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            to="/docs/commands"
            className="group flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <div>
              <p className="text-sm font-medium text-ink">How sync works</p>
              <p className="text-sm text-muted">See the login and sync commands.</p>
            </div>
            <span className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
              &rarr;
            </span>
          </Link>
          <Link
            to="/docs"
            className="group flex items-center justify-between rounded-xl border border-line bg-surface-2 px-4 py-3 transition-colors hover:border-accent/40 hover:bg-surface"
          >
            <div>
              <p className="text-sm font-medium text-ink">Read docs</p>
              <p className="text-sm text-muted">CLI, dashboard, and setup.</p>
            </div>
            <span className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
