import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { Check, Lock } from "lucide-react";
import { useEffect } from "react";
import { Link, usePageMeta } from "./router";
import { CONTACT_EMAIL } from "./shared/constants";
import { Footer } from "./shared/Footer";
import { Nav } from "./shared/Nav";

const PRO_CHECKOUT_URL = import.meta.env.VITE_PRO_CHECKOUT_URL;

interface Plan {
  name: string;
  price: string;
  unit?: string;
  note?: string;
  status: "available" | "roadmap";
  cta: "install" | "checkout" | "contact";
  checkoutUrl?: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        plan.highlight
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
        {plan.cta === "install" && (
          <Link
            to="/#install"
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Get started - it's free
          </Link>
        )}
        {plan.cta === "checkout" && (
          <a
            href={plan.checkoutUrl}
            data-polar-checkout
            data-polar-checkout-theme="dark"
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Subscribe
          </a>
        )}
        {plan.cta === "contact" && (
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${plan.name} waitlist`)}`}
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Join waitlist
          </a>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  usePageMeta(
    "Pricing - fixmind",
    "Fixmind is free and local-first forever. Pro adds encrypted sync across devices.",
  );

  useEffect(() => {
    PolarEmbedCheckout.init();
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
              <PlanCard key={plan.name} plan={plan} />
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

      <Footer />
    </div>
  );
}
