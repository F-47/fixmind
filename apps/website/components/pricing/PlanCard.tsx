"use client";

import type { Session } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type Plan = {
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
};

export function PlanCard({
  plan,
  active,
  session,
  onJoinWaitlist,
}: {
  plan: Plan;
  active: boolean;
  session: Session | null | undefined;
  onJoinWaitlist: (plan: string) => void;
}) {
  const checkoutReady = Boolean(plan.checkoutUrl);
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-6",
        active
          ? "border-accent/45 bg-surface shadow-[0_0_40px_-28px_var(--color-accent-dim)]"
          : plan.highlight
            ? "border-accent/50 bg-surface shadow-[0_0_60px_-25px_var(--color-accent-dim)]"
            : "border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-ink">{plan.name}</h3>
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.15em]",
            plan.status === "available" ? "text-good" : "text-muted",
          )}
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
        <span className="font-display text-3xl font-semibold text-ink">{plan.price}</span>
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
            href="/#install"
            data-umami-event="pricing_install_click"
            data-umami-event-plan={plan.name.toLowerCase()}
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
            href="/account?next=/pricing"
            data-umami-event="pricing_signin_click"
            data-umami-event-plan={plan.name.toLowerCase()}
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Sign in to subscribe
          </Link>
        ) : plan.cta === "checkout" && checkoutReady ? (
          <a
            href={plan.checkoutUrl}
            data-polar-checkout
            data-polar-checkout-theme="dark"
            data-umami-event="pricing_checkout_click"
            data-umami-event-plan={plan.name.toLowerCase()}
            className="block rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Subscribe
          </a>
        ) : plan.cta === "checkout" ? (
          <div className="rounded-md border border-line px-3 py-2 text-center text-sm text-muted">
            Checkout unavailable
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onJoinWaitlist(plan.name)}
            data-umami-event="pricing_waitlist_click"
            data-umami-event-plan={plan.name.toLowerCase()}
            className="block w-full rounded-md border border-line px-3 py-2 text-center text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Join waitlist
          </button>
        )}
      </div>
    </div>
  );
}
