import { Check, Lock } from "lucide-react";
import { CopyButton } from "./components/CopyButton";
import { usePageMeta } from "./router";
import { CONTACT_EMAIL, Footer, INSTALL_CMD, Nav } from "./shared";

interface Plan {
  name: string;
  price: string;
  unit?: string;
  note?: string;
  status: "available" | "roadmap";
  cta: "install" | "soon" | "contact";
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
    price: "$9",
    unit: "/mo per developer",
    status: "roadmap",
    cta: "soon",
    tagline: "For developers who switch machines and want more recall modes.",
    features: [
      "Everything in Free",
      "Encrypted sync across your machines",
      "Cloze-deletion and timed recall modes",
      "Optional AI lesson enrichment (bring your own key)",
      "Priority support",
    ],
    highlight: true,
  },
  {
    name: "Team",
    price: "$19",
    unit: "/mo per developer",
    note: "5-seat minimum",
    status: "roadmap",
    cta: "soon",
    tagline: "For teams that don't want the same mistake fixed twice by two people.",
    features: [
      "Everything in Pro",
      "Shared lesson library, tagged by project",
      "Skill-coverage and review-compliance analytics",
      "SSO (SAML / OIDC)",
      "Webhook API for CI/CD",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    status: "roadmap",
    cta: "contact",
    tagline: "Self-hosted, for orgs that can't let lesson data leave the network.",
    features: [
      "Everything in Team",
      "Self-hosted (Docker / Kubernetes)",
      "On-premises storage only",
      "Role-based access control and audit logs",
      "Dedicated onboarding and support",
    ],
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${plan.highlight ? "border-accent/50 bg-surface shadow-[0_0_60px_-25px_var(--color-accent-dim)]" : "border-line bg-surface"
        }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">{plan.name}</h3>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.15em] ${plan.status === "available" ? "text-good" : "text-muted"
            }`}
        >
          {plan.status === "available" ? "Available now" : "Roadmap"}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-semibold text-ink">{plan.price}</span>
        {plan.unit && <span className="text-xs text-muted">{plan.unit}</span>}
      </div>
      {plan.note && (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{plan.note}</p>
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
          <div className="space-y-2">
            <p className="break-all rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">
              <span className="text-ink">$</span> {INSTALL_CMD}
            </p>
            <CopyButton text={INSTALL_CMD} label="Copy install command" variant="block" />
          </div>
        )}
        {plan.cta === "soon" && (
          <button
            type="button"
            disabled
            className="block w-full cursor-not-allowed rounded-md border border-line px-3 py-2 text-center text-sm text-muted"
          >
            Coming soon
          </button>
        )}
        {plan.cta === "contact" && (
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Contact us
          </a>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  usePageMeta(
    "Pricing — fixmind",
    "Fixmind is free and local-first forever. Pro, Team, and Enterprise plans add sync, shared libraries, and self-hosting on top.",
  );
  return (
    <div>
      <Nav />

      <section className="relative overflow-hidden bg-grid">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Pricing</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Free forever, until you need more than your own machine.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted">
            The core learning loop &mdash; capturing and reviewing lessons &mdash; stays free for
            individual developers. Paid plans add what an org needs on top: sync, sharing, and self-hosting.
          </p>
          <p className="mx-auto mt-4 max-w-xl rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
            Free is available today. Pro, Team, and Enterprise are on the roadmap.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Pricing philosophy
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            You don&rsquo;t pay for the part that teaches you something.
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-surface p-6">
              <Lock size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Free is the whole loop
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Capturing a lesson and reviewing it later is the entire point of fixmind.
                That never moves behind a paywall.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <Check size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Paid plans are convenience
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sync across machines, more recall modes, AI enrichment &mdash; useful, but
                never required to learn from a fix.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <Check size={18} className="text-accent" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink">
                Team plans monetize org pain
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Shared libraries and analytics solve a problem only orgs have: knowledge
                walking out the door when someone leaves.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
