import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/CopyButton";

export default function HowItWorksSection() {
  return (
    <section id="how" className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          How it works
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Four steps, none of them yours to remember.
        </h2>
        <div className="mt-14 grid gap-16 lg:grid-cols-[1fr_400px] lg:items-start">
          <div>
            <HowStep
              number="01"
              title="Set up the MCP server"
              command="npx fixmind setup"
            >
              Use <code className="text-ink">npx fixmind setup</code> to
              register the MCP server with Claude Code, Cursor, or Codex on
              this device or just this project. No global install is required.
            </HowStep>
            <HowStep number="02" title="Fix bugs like normal">
              Keep working the way you already do. Your agent calls{" "}
              <code className="text-ink">save_lesson</code> after a fix that
              actually taught it something - never for renames or formatting.
            </HowStep>
            <HowStep number="03" title="Lesson stored on your machine">
              Problem, mistake, root cause, bad/good code, and one recall
              question - saved to a local database, not a server you don&apos;t
              control.
            </HowStep>
            <HowStep
              number="04"
              title="Browse before you forget"
              command="npx fixmind dashboard"
            >
              Due reviews, progress signals, and recurring concepts, all in the
              local dashboard. Prefer the terminal?{" "}
              <code className="text-ink">fixmind review</code> does the same job
              one question at a time.
            </HowStep>
          </div>
          <div className="lg:sticky lg:top-24">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowStep({
  number,
  title,
  children,
  command,
}: {
  number: string;
  title: string;
  children: ReactNode;
  command?: string;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <span className="font-mono text-sm text-accent">{number}</span>
        <span className="mt-2 w-px flex-1 bg-line" />
      </div>
      <div className="pb-10">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
          {children}
        </p>
        {command && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink">
            <span className="text-muted">$</span>
            {command}
            <CopyButton text={command} />
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPreview() {
  const rows = [
    {
      title: "Keep server and client renders deterministic",
      tool: "claude-code",
      status: "Not learned",
      tone: "text-bad",
    },
    {
      title: "Close the response body before throwing",
      tool: "cursor",
      status: "Partial",
      tone: "text-[#e8b35f]",
    },
    {
      title: "Debounce the resize observer callback",
      tool: "codex",
      status: "Understood",
      tone: "text-good",
    },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface shadow-[0_0_80px_-20px_var(--color-accent-dim)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b35f]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        <span className="ml-2 font-mono text-xs text-muted">
          npx fixmind dashboard
        </span>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-ink">
            Your lessons <span className="text-muted">(3)</span>
          </p>
          <div className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            <span className="text-accent">All</span>
            <span>Not learned</span>
            <span>Learned</span>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          {rows.map((row) => (
            <div
              key={row.title}
              className="border-t border-line py-2.5 first:border-t-0 first:pt-0"
            >
              <p className="truncate text-[13px] text-ink">{row.title}</p>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                <span className={row.tone}>{row.status}</span>
                <span className="h-3 w-px bg-line" />
                <span>{row.tool}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-line pt-3 font-mono text-[11px] text-muted">
          Topics you keep encountering:{" "}
          <span className="text-accent">Next.js hydration ×3</span>
        </div>
      </div>
    </div>
  );
}
