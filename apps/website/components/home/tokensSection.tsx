import type { ReactNode } from "react";

function TokenStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <span className="font-mono text-sm text-accent">{number}</span>
        <span className="mt-2 w-px flex-1 bg-line" />
      </div>
      <div className="pb-9">
        <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
          {children}
        </p>
      </div>
    </div>
  );
}

function SessionTimeline() {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
        A typical session
      </p>
      <div className="relative mt-8 h-1 rounded-full bg-line">
        <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        <span className="absolute left-[68%] top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-good" />
      </div>
      <div className="relative mt-3 h-10 font-mono text-[11px]">
        <span className="absolute left-0 text-accent">
          connect
          <br />
          <span className="text-muted">schema + instructions</span>
        </span>
        <span className="absolute left-[68%] text-good">
          real fix
          <br />
          <span className="text-muted">one lesson saved</span>
        </span>
      </div>
      <p className="mt-8 border-t border-line pt-4 text-sm leading-relaxed text-muted">
        Everything in between &mdash; the turns spent reading code, writing
        patches, running tests &mdash; calls{" "}
        <code className="text-ink">save_lesson</code> zero times. Later, the
        agent can call <code className="text-ink">memory</code> to pull a few
        reviewed lessons back into context when the next task looks familiar.
      </p>
    </div>
  );
}

export default function TokensSection() {
  return (
    <section id="tokens" className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Token cost
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Mostly free, by design.
        </h2>
        <p className="mt-4 max-w-lg text-muted">
          Connecting an MCP server isn&rsquo;t free context-wise. Here&rsquo;s
          exactly where fixmind spends it &mdash; and where it doesn&rsquo;t.
        </p>
        <div className="mt-14 grid gap-16 lg:grid-cols-[1fr_420px] lg:items-start">
          <div>
            <TokenStep
              number="01"
              title="Sent once per session (~2,500 tokens, average)"
            >
              The server&rsquo;s instructions and the{" "}
              <code className="text-ink">save_lesson</code> schema go out when
              the client connects. Clients that support prompt caching reuse
              that across every later turn, dropping the cost to{" "}
              <strong className="font-medium text-ink">
                near zero ($0.001)
              </strong>
              .
            </TokenStep>
            <TokenStep
              number="02"
              title="Silent on every other turn (0 tokens)"
            >
              The tool is only called when the agent decides a fix actually
              taught it something &mdash; never on a whim, never on formatting
              or renames.
            </TokenStep>
            <TokenStep
              number="03"
              title="A commit-message-sized payload (~500 tokens, average)"
            >
              When a lesson is saved, the problem, root cause, fix summary, and
              code examples together are about as big as a short commit message
              or review comment &mdash; costing{" "}
              <strong className="font-medium text-ink">
                a fraction of a cent
              </strong>
              .
            </TokenStep>
          </div>
          <div className="lg:sticky lg:top-24">
            <SessionTimeline />
          </div>
        </div>
      </div>
    </section>
  );
}
