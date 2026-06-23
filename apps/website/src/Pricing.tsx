import type { Session } from "@supabase/supabase-js";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { Check, Lock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "./lib/supabase";
import { Link, usePageMeta } from "./router";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";

const WEB3FORMS_ACCESS_KEY = "9ea2eed4-81f4-4dc3-b5d8-feac9d67b566";
const WAITLIST_FRAME_NAME = "waitlist-form-frame";

interface Plan {
  name: string;
  price: string;
  unit?: string;
  note?: string;
  status: "available" | "roadmap";
  cta: "install" | "checkout" | "contact";
  tagline: string;
  features: string[];
  highlight?: boolean;
}

interface Entitlement {
  plan: string;
  status: string;
}

interface CheckoutFunctionError {
  code?: string;
  error?: string;
  detail?: string | null;
  message?: string;
}

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

function PlanCard({
  plan,
  active,
  session,
  checkoutPending,
  onCheckout,
  onJoinWaitlist,
}: {
  plan: Plan;
  active: boolean;
  session: Session | null | undefined;
  checkoutPending: boolean;
  onCheckout: () => void;
  onJoinWaitlist: (plan: string) => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        active
          ? "border-accent/45 bg-surface shadow-[0_0_40px_-28px_var(--color-accent-dim)]"
          : plan.highlight
            ? "border-accent/50 bg-surface shadow-[0_0_60px_-25px_var(--color-accent-dim)]"
          : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">
          {plan.name}
        </h3>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.15em] ${
            plan.status === "available" ? "text-good" : "text-muted"
          }`}
        >
          {plan.status === "available" ? "Available now" : "Roadmap"}
        </span>
      </div>

      {active && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
          Current plan
        </p>
      )}

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-ink">
          {plan.price}
        </span>
        {plan.unit && <span className="text-xs text-muted">{plan.unit}</span>}
      </div>

      {plan.note && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {plan.note}
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-muted">{plan.tagline}</p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-ink">
            <Check size={15} className="mt-0.5 shrink-0 text-accent" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {active ? (
          <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-center text-sm text-accent">
            Already active
          </div>
        ) : plan.cta === "install" ? (
          <Link
            to="/#install"
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Get started - it's free
          </Link>
        ) : plan.cta === "checkout" && session === undefined ? (
          <div className="rounded-md border border-line px-3 py-2 text-center text-sm text-muted">
            Checking account...
          </div>
        ) : plan.cta === "checkout" && !session ? (
          <Link
            to="/account?next=/pricing"
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Sign in to subscribe
          </Link>
        ) : plan.cta === "checkout" ? (
          <button
            type="button"
            onClick={onCheckout}
            disabled={checkoutPending}
            className="block w-full rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkoutPending ? "Opening checkout..." : "Subscribe"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onJoinWaitlist(plan.name)}
            className="block w-full rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Join waitlist
          </button>
        )}
      </div>
    </div>
  );
}

function WaitlistModal({
  plan,
  onClose,
}: {
  plan: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const submittedRef = useRef(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (sent) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good/10 text-good">
            <Check size={18} />
          </div>
          <h3 className="mt-4 text-center font-display text-lg font-semibold text-ink">
            You’re on the waitlist
          </h3>
          <p className="mt-2 text-center text-sm text-muted">
            We’ll reach out at <span className="text-ink">{email}</span> when {plan} is ready.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-md border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
              Waitlist
            </p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">
              Join the {plan} waitlist
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent/60 hover:text-accent"
            aria-label="Close waitlist modal"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Leave your email and I’ll only use it for the {plan.toLowerCase()} waitlist.
        </p>

        <form
          className="mt-5 space-y-3"
          action="https://api.web3forms.com/submit"
          method="POST"
          target={WAITLIST_FRAME_NAME}
          onSubmit={() => {
            submittedRef.current = true;
          }}
        >
          <iframe
            name={WAITLIST_FRAME_NAME}
            className="hidden"
            title="Waitlist submission"
            onLoad={() => {
              if (submittedRef.current) setSent(true);
            }}
          />
          <input type="hidden" name="access_key" value={WEB3FORMS_ACCESS_KEY} />
          <input
            type="hidden"
            name="subject"
            value={`New ${plan} waitlist request from fixmind.dev`}
          />
          <input
            type="hidden"
            name="plan"
            value={plan}
          />
          <label className="block">
            <span className="sr-only">Email</span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
            />
          </label>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-bg/40 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Join waitlist
          </button>
        </form>
      </div>
    </div>
  );
}

async function checkoutErrorMessage(response: Response | undefined, error: unknown): Promise<string> {
  if (!response) {
    console.error("Checkout function invocation failed", error);
    return "Checkout backend could not be reached.";
  }

  const body = await response.clone().json().catch(() => null) as CheckoutFunctionError | null;
  console.error("Checkout function returned an error", {
    status: response.status,
    body,
    error,
  });

  if (response.status === 404 || body?.code === "NOT_FOUND") {
    return "Checkout backend is not deployed yet.";
  }
  if (body?.code === "config_missing") {
    return "Checkout backend is missing Polar configuration.";
  }
  if (body?.code === "not_authenticated") {
    return "Please sign in again before subscribing.";
  }
  if (body?.detail) {
    return `Polar rejected checkout: ${body.detail}`;
  }
  if (body?.error) {
    return body.error;
  }
  if (body?.message) {
    return body.message;
  }

  return "Could not open checkout. Please try again.";
}

export default function Pricing() {
  usePageMeta(
    "Pricing - fixmind",
    "Fixmind is free and local-first forever. Pro adds encrypted sync across devices.",
  );

  const [activePlan, setActivePlan] = useState<string | null | undefined>(undefined);
  const [waitlistPlan, setWaitlistPlan] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [checkoutPending, setCheckoutPending] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }

    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setActivePlan(null);
      return;
    }

    let mounted = true;
    void (async () => {
      const { data } = await supabase
        .from("entitlements")
        .select("plan, status")
        .maybeSingle();
      if (!mounted) return;
      if (!data || data.status !== "active") {
        setActivePlan(null);
        return;
      }
      setActivePlan(data.plan?.toLowerCase() ?? null);
    })();

    return () => {
      mounted = false;
    };
  }, [session]);

  const selectedPlan = activePlan === "pro" ? "Pro" : null;

  async function handleCheckout() {
    if (!supabase || !session) return;

    setCheckoutPending(true);
    const { data, error, response } = await supabase.functions.invoke<{ url: string }>(
      "create-polar-checkout",
      { body: {} },
    );

    if (error || !data?.url) {
      setCheckoutPending(false);
      toast.error(await checkoutErrorMessage(response, error));
      return;
    }

    try {
      await PolarEmbedCheckout.create(data.url, { theme: "dark" });
    } catch {
      toast.error("Could not open checkout. Please try again.");
    } finally {
      setCheckoutPending(false);
    }
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
            <p className="mx-auto mt-4 max-w-xl rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
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
                checkoutPending={checkoutPending}
                onCheckout={handleCheckout}
                onJoinWaitlist={(nextPlan) => setWaitlistPlan(nextPlan)}
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
            <div className="rounded-xl border border-line bg-surface p-6">
              <Lock size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Free is the whole loop
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Capturing a lesson and reviewing it later is the entire point of
                fixmind. That never moves behind a paywall.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <Check size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Pro pays for mobility
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The paid part is keeping the same lessons with you when you move
                between machines. The learning loop itself stays free.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <Check size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Team and Enterprise are future lanes
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Shared libraries, SSO, self-hosting, and org rollout support
                belong in the roadmap, not the launch offer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {waitlistPlan && (
        <WaitlistModal
          plan={waitlistPlan}
          onClose={() => setWaitlistPlan(null)}
        />
      )}

      <Footer />
    </div>
  );
}
