import type { Session } from "@supabase/supabase-js";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { Check, Clock, Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PlanCard, type Plan } from "@/components/pricing/PlanCard";
import { WaitlistModal } from "@/components/pricing/WaitlistModal";
import { supabase } from "@/lib/supabase";
import { usePageMeta } from "@/router";

const PRO_CHECKOUT_URL = import.meta.env.VITE_PRO_CHECKOUT_URL;
const CHECKOUT_POLL_LIMIT = 10;
const CHECKOUT_POLL_INTERVAL_MS = 2000;
const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    status: "available",
    cta: "install",
    tagline: "The full learning loop. No account, nothing leaves your machine.",
    features: [
      "Local CLI + visual dashboard",
      "Works with Claude Code, Cursor, and Codex",
      "Spaced-repetition review, search, and stats",
      "Unlimited lessons, stored only on this device",
    ],
  },
  {
    name: "Pro",
    price: "$10",
    unit: "/mo per developer",
    status: "available",
    cta: "checkout",
    checkoutUrl: PRO_CHECKOUT_URL,
    tagline:
      "For developers who switch machines and want encrypted sync across every device.",
    features: [
      "Everything in Free",
      "Encrypted sync across your machines",
      "One login per device, then keep working",
      "Account status and sync controls on the website",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Team",
    price: "Custom",
    unit: "/seat",
    note: "Waitlist",
    status: "roadmap",
    cta: "contact",
    tagline:
      "For teams that want shared learning later, once the individual product is proven.",
    features: [
      "Everything in Pro",
      "Shared lesson library",
      "Team analytics and review visibility",
      "SSO / org admin",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "Waitlist",
    status: "roadmap",
    cta: "contact",
    tagline:
      "For orgs that need self-hosting, compliance, and deeper rollout support.",
    features: [
      "Everything in Team",
      "Self-hosted deployment",
      "On-premises storage options",
      "Dedicated onboarding and support",
    ],
  },
];

export default function Pricing() {
  const location = useLocation();
  usePageMeta(
    "Fixmind — Pricing",
    "Fixmind is free and local-first forever. Pro adds encrypted sync across devices.",
  );
  const checkoutId = new URLSearchParams(location.search).get("checkout_id");
  const [activePlan, setActivePlan] = useState<string | null | undefined>(
    undefined,
  );
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [waitlistPlan, setWaitlistPlan] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const refreshActivePlan = useCallback(async () => {
    if (!supabase || !session) {
      setActivePlan(null);
      return null;
    }

    const { data } = await supabase
      .from("entitlements")
      .select("plan, status")
      .maybeSingle();
    const nextPlan =
      data?.status === "active" ? (data.plan?.toLowerCase() ?? null) : null;
    setActivePlan(nextPlan);
    return nextPlan;
  }, [session]);

  useEffect(() => {
    PolarEmbedCheckout.init();
  }, [session]);
  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) =>
      setSession(nextSession),
    );
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    void refreshActivePlan().then((plan) => {
      if (mounted && plan === "pro") setCheckoutPending(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshActivePlan]);

  useEffect(() => {
    if (!checkoutId || !session || activePlan === "pro") {
      if (activePlan === "pro") setCheckoutPending(false);
      return;
    }

    let cancelled = false;
    setCheckoutPending(true);

    async function pollEntitlement(attempt = 1): Promise<void> {
      const plan = await refreshActivePlan();
      if (cancelled || plan === "pro") {
        if (!cancelled) setCheckoutPending(false);
        return;
      }
      if (attempt >= CHECKOUT_POLL_LIMIT) {
        setCheckoutPending(false);
        return;
      }
      window.setTimeout(() => {
        if (!cancelled) void pollEntitlement(attempt + 1);
      }, CHECKOUT_POLL_INTERVAL_MS);
    }

    void pollEntitlement();
    return () => {
      cancelled = true;
    };
  }, [activePlan, checkoutId, refreshActivePlan, session]);

  useEffect(() => {
    if (checkoutPending || !checkoutId || activePlan !== "pro") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout_id");
    window.history.replaceState(
      {},
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [activePlan, checkoutId, checkoutPending]);

  const checkoutStatus =
    checkoutId && activePlan === "pro"
      ? "active"
      : checkoutId && checkoutPending
        ? "pending"
        : checkoutId
          ? "delayed"
          : null;
  const selectedPlan = activePlan === "pro" ? "Pro" : null;

  return (
    <div>
      <div className="relative overflow-hidden bg-grid">
        <section>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
          />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Pricing
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Free forever for the learning loop. Pro for sync across devices.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              Capturing, reviewing, searching, and exporting lessons stays free.
              Pro adds encrypted sync so the same lessons follow you across
              machines.
            </p>
            <p className="mx-auto mt-4 max-w-2xl rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
              Free and Pro are available today. Team and Enterprise are waitlist
              tiers for later.
            </p>
            {checkoutStatus && <CheckoutStatus status={checkoutStatus} />}
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                active={selectedPlan === plan.name}
                session={session}
                onJoinWaitlist={setWaitlistPlan}
              />
            ))}
          </div>
        </section>
      </div>
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Pricing philosophy
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            You do not pay for the part that teaches you something.
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            <Philosophy
              icon={<Lock size={18} />}
              title="Free is the whole loop"
            >
              Capturing a lesson and reviewing it later is the entire point of
              fixmind. That never moves behind a paywall.
            </Philosophy>
            <Philosophy
              icon={<Check size={18} />}
              title="Pro pays for mobility"
            >
              The paid part is keeping the same lessons with you when you move
              between machines. The learning loop itself stays free.
            </Philosophy>
            <Philosophy
              icon={<Check size={18} />}
              title="Team and Enterprise are future lanes"
            >
              Shared libraries, SSO, self-hosting, and org rollout support
              belong in the roadmap, not the launch offer.
            </Philosophy>
          </div>
        </div>
      </section>
      {waitlistPlan && (
        <WaitlistModal
          plan={waitlistPlan}
          onClose={() => setWaitlistPlan(null)}
        />
      )}
    </div>
  );
}

function CheckoutStatus({
  status,
}: {
  status: "active" | "pending" | "delayed";
}) {
  const active = status === "active";
  return (
    <div
      className={`mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-[0_0_45px_-32px_var(--color-accent-dim)] ${
        active
          ? "border-good/45 bg-good/10"
          : "border-accent/25 bg-surface"
      }`}
    >
      <div className={`mt-0.5 ${active ? "text-good" : "text-accent"}`}>
        {active ? <Check size={17} /> : <Clock size={17} />}
      </div>
      <div>
        <p className="text-sm font-medium text-ink">
          {active
            ? "Pro is active on this account."
            : status === "pending"
              ? "Checkout complete. Activating Pro..."
              : "Checkout complete. Pro is still syncing."}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {active
            ? "You can use encrypted sync from the CLI now."
            : "Polar confirms the checkout before the webhook updates your plan. This page will refresh your status automatically for a few seconds."}
        </p>
      </div>
    </div>
  );
}

function Philosophy({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="text-accent">{icon}</div>
      <h3 className="mt-4 font-display text-base font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
