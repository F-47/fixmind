import {
  BrainCircuit,
  Check,
  GitCompare,
  Lock,
  Plug,
  Repeat,
  Workflow,
} from "lucide-react";
import { CopyButton } from "./components/CopyButton";

const INSTALL_CMD = "npm install -g fixmind && fixmind setup";

function Nav() {
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
        <span className="text-accent">▌</span>
        fixmind
      </div>
      <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
        <a href="#loop" className="transition-colors hover:text-ink">
          The loop
        </a>
        <a href="#features" className="transition-colors hover:text-ink">
          Features
        </a>
        <a href="#how" className="transition-colors hover:text-ink">
          How it works
        </a>
      </nav>
      <a
        href="#install"
        className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
      >
        Install
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div
        aria-hidden
        className="animate-pulse-slow pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            MCP server · runs on your machine
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            You fixed the bug.
            <br />
            <span className="text-accent text-glow">Again.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Your agent patches the code, you accept the diff, and the lesson evaporates.
            Fixmind catches it on the way out — a local MCP server that turns every
            AI&#8209;assisted fix into something you actually remember.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 font-mono text-sm text-ink">
              <span className="text-muted">$</span>
              {INSTALL_CMD}
              <CopyButton text={INSTALL_CMD} />
            </div>
          </div>
          <a
            href="#how"
            className="mt-5 inline-block text-sm text-muted underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            See how it works →
          </a>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <TerminalCard />
        </div>
      </div>
    </section>
  );
}

function TerminalCard() {
  return (
    <div className="rounded-xl border border-line bg-surface shadow-[0_0_80px_-20px_var(--color-accent-dim)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b35f]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        <span className="ml-2 font-mono text-xs text-muted">fixmind review</span>
      </div>
      <div className="space-y-3 px-5 py-5 font-mono text-[13px] leading-relaxed">
        <p className="text-muted">$ fixmind review</p>
        <p className="text-ink">
          <span className="text-accent">&gt;</span> What must be true about the server
          render and the browser&rsquo;s first render?
        </p>
        <p className="text-muted">
          Your answer:{" "}
          <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-accent/80" />
        </p>
        <div className="mt-4 border-t border-line pt-4 text-muted">
          <p>
            Expected: They must produce matching markup before client-only state is
            loaded.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-good">
            <Check size={14} /> Review saved · next check in 3 days
          </p>
        </div>
      </div>
    </div>
  );
}

function LoopStep({
  index,
  children,
  tone,
}: {
  index: number;
  children: React.ReactNode;
  tone: "bad" | "good";
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] " +
          (tone === "bad"
            ? "border-bad/40 text-bad"
            : "border-good/40 text-good")
        }
      >
        {index}
      </span>
      <p className="text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function LoopSection() {
  return (
    <section id="loop" className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          The loop
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Two ways this goes.
        </h2>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line md:grid-cols-2">
          {/* Without fixmind */}
          <div className="relative bg-surface p-8">
            <div className="mb-7 flex items-center gap-2">
              <Repeat size={16} className="text-bad" />
              <h3 className="font-mono text-sm uppercase tracking-wide text-bad">
                Without fixmind
              </h3>
            </div>
            <div className="space-y-5">
              <LoopStep index={1} tone="bad">
                A bug shows up. You hand it to your agent.
              </LoopStep>
              <LoopStep index={2} tone="bad">
                The agent patches it. The diff looks reasonable, so you accept it.
              </LoopStep>
              <LoopStep index={3} tone="bad">
                You move on. The reasoning behind the fix never left the chat window.
              </LoopStep>
              <LoopStep index={4} tone="bad">
                Three weeks later, the same mistake shows up in a different file.
              </LoopStep>
            </div>
            <div className="mt-7 flex items-center gap-2 rounded-lg border border-dashed border-bad/30 px-3 py-2.5 font-mono text-xs text-bad">
              <Repeat size={13} />
              loop closes — back to step 1
            </div>
          </div>

          {/* With fixmind */}
          <div className="relative bg-surface p-8">
            <div className="mb-7 flex items-center gap-2">
              <Check size={16} className="text-good" />
              <h3 className="font-mono text-sm uppercase tracking-wide text-good">
                With fixmind
              </h3>
            </div>
            <div className="space-y-5">
              <LoopStep index={1} tone="good">
                A bug shows up. You hand it to your agent.
              </LoopStep>
              <LoopStep index={2} tone="good">
                The agent patches it, then calls{" "}
                <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-ink">
                  save_learning_lesson
                </code>
                .
              </LoopStep>
              <LoopStep index={3} tone="good">
                The mistake, the root cause, and the bad/good code land in your local
                database.
              </LoopStep>
              <LoopStep index={4} tone="good">
                Fixmind quizzes you on it in 1, 3, and 7 days.
              </LoopStep>
            </div>
            <div className="mt-7 flex items-center gap-2 rounded-lg border border-dashed border-good/30 px-3 py-2.5 font-mono text-xs text-good">
              <Check size={13} />
              line ends — you understand the fix
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/40">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Built for how you already work
      </p>
      <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        No accounts. No cloud. Just a closer loop.
      </h2>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard icon={<Lock size={18} />} title="Local-first">
          Lessons live in <code className="text-ink">~/.fixmind/learning.db</code>. No
          account, no sync, no paid AI API in the loop.
        </FeatureCard>
        <FeatureCard icon={<Plug size={18} />} title="Speaks MCP">
          Works with Claude Code, Cursor, and Codex. <code className="text-ink">fixmind
          setup</code> wires itself into whatever you already run.
        </FeatureCard>
        <FeatureCard icon={<GitCompare size={18} />} title="Real diffs, not summaries">
          Captures the actual bad and good code from your git diff — not a vague
          paraphrase of what changed.
        </FeatureCard>
        <FeatureCard icon={<BrainCircuit size={18} />} title="Spaced recall">
          New lessons resurface on a schedule with a real question, so you answer
          before you see the takeaway.
        </FeatureCard>
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
  children: React.ReactNode;
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
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{children}</p>
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

function HowItWorksSection() {
  return (
    <section id="how" className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          How it works
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Four steps, none of them yours to remember.
        </h2>

        <div className="mt-14 max-w-2xl">
          <HowStep number="01" title="Connect" command="fixmind setup">
            Detects Claude Code, Cursor, and Codex, then registers the MCP server with
            whichever ones you pick.
          </HowStep>
          <HowStep number="02" title="Fix bugs like normal">
            Keep working the way you already do. Your agent calls{" "}
            <code className="text-ink">save_learning_lesson</code> after a fix that
            actually taught it something — never for renames or formatting.
          </HowStep>
          <HowStep number="03" title="Lesson stored on your machine">
            Problem, mistake, root cause, bad/good code, and one recall question — saved
            to a local database, not a server you don&rsquo;t control.
          </HowStep>
          <HowStep number="04" title="Review before you forget" command="fixmind review">
            Or run <code className="text-ink">fixmind dashboard</code> for the visual
            version, with due reviews and progress over time.
          </HowStep>
        </div>
      </div>
    </section>
  );
}

function InstallSection() {
  return (
    <section id="install" className="relative overflow-hidden bg-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Stop re-fixing the same bug.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          One install. Works offline. Nothing leaves your machine.
        </p>
        <div className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-lg border border-line bg-surface px-5 py-3 font-mono text-sm text-ink">
          <span className="text-muted">$</span>
          {INSTALL_CMD}
          <CopyButton text={INSTALL_CMD} />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          MIT licensed · No telemetry · Node 22.5+
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2 font-mono text-ink">
          <span className="text-accent">▌</span>
          fixmind
        </div>
        <p>Local-first learning lessons for AI-assisted fixes.</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="overflow-x-hidden">
      <Nav />
      <Hero />
      <LoopSection />
      <FeaturesSection />
      <HowItWorksSection />
      <InstallSection />
      <Footer />
    </div>
  );
}
