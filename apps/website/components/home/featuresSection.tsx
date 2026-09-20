import { BrainCircuit, GitCompare, Lock, Plug, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function FeatureCard({
  icon,
  title,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/40",
        className,
      )}
    >
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Built for how you already work
      </p>
      <h2 className="mt-3 text-center font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Local by default. Accounts are opt-in, not required.
      </h2>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <FeatureCard className="lg:col-span-4" icon={<Lock size={18} />} title="Local-first">
          Lessons live in <code className="text-ink">~/.fixmind/learning.db</code>. No account
          needed, no paid AI API in the loop.
        </FeatureCard>
        <FeatureCard className="lg:col-span-4" icon={<Plug size={18} />} title="Speaks MCP">
          Works with Claude Code, Cursor, and Codex.{" "}
          <code className="text-ink">npx fixmind setup</code> wires itself into whatever you already
          run - on this device, or scoped to a single project.
        </FeatureCard>
        <FeatureCard
          className="lg:col-span-4"
          icon={<GitCompare size={18} />}
          title="Real diffs, not summaries"
        >
          Captures the actual bad and good code from your git diff - not a vague paraphrase of what
          changed.
        </FeatureCard>
        <FeatureCard
          className="lg:col-span-4 lg:col-start-3"
          icon={<BrainCircuit size={18} />}
          title="Spaced recall"
        >
          New lessons resurface on a schedule with a real question, so you answer before you see the
          takeaway.
        </FeatureCard>
        <FeatureCard
          className="lg:col-span-4 lg:col-start-7"
          icon={<Search size={18} />}
          title="Memory retrieval"
        >
          Reviewed lessons can be pulled back into context when a new task looks familiar, so the
          agent reuses the rule instead of relearning the same mistake.
        </FeatureCard>
      </div>
    </section>
  );
}
