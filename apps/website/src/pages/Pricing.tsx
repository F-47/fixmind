import type { Session } from "@supabase/supabase-js";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { Check, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { PlanCard, type Plan } from "@/components/pricing/PlanCard";
import { WaitlistModal } from "@/components/pricing/WaitlistModal";
import { supabase } from "@/lib/supabase";
import { usePageMeta } from "@/router";

const PRO_CHECKOUT_URL = import.meta.env.VITE_PRO_CHECKOUT_URL;
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
  usePageMeta(
    "Fixmind — Pricing",
    "Fixmind is free and local-first forever. Pro adds encrypted sync across devices.",
  );
  const [activePlan, setActivePlan] = useState<string | null | undefined>(
    undefined,
  );
  const [waitlistPlan, setWaitlistPlan] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
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
    if (!supabase || !session) {
      setActivePlan(null);
      return;
    }
    let mounted = true;
    void supabase
      .from("entitlements")
      .select("plan, status")
      .maybeSingle()
      .then(({ data }) => {
        if (mounted)
          setActivePlan(
            data?.status === "active"
              ? (data.plan?.toLowerCase() ?? null)
              : null,
          );
      });
    return () => {
      mounted = false;
    };
  }, [session]);
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
