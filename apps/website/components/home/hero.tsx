import Link from "next/link";
import { CommandSnippet } from "@/components/ui/CommandSnippet";
import TerminalCard from "./terminalCard";

export default function Hero() {
  return (
    <section
      id="install"
      className="relative flex min-h-[calc(100vh-4rem)] scroll-mt-16 items-center overflow-hidden bg-grid"
    >
      <div
        aria-hidden
        className="animate-pulse-slow pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/14 blur-[120px]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="animate-rise max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            MCP server - local by default
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl">
            Don&apos;t just let AI fix it.
            <br />
            <span className="text-accent text-glow">Learn from it.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Fixmind turns each AI-assisted fix into a local lesson you can
            review, search, and reuse the next time the same bug shows up.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/docs/quickstart"
              data-umami-event="home_hero_quickstart"
              className="inline-flex w-full items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 sm:w-auto"
            >
              Start Quickstart
            </Link>
            <Link
              href="/pricing"
              data-umami-event="home_hero_pricing"
              className="inline-flex w-full items-center justify-center rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent sm:w-auto"
            >
              See pricing
            </Link>
          </div>

          <div className="mt-8 w-full max-w-xl">
            <CommandSnippet command="npx fixmind setup" />
          </div>

          <div className="mt-6">
            <span className="rounded-full border border-line bg-surface/70 px-3 py-1.5 text-sm text-muted">
              No account. No telemetry. Free to start.
            </span>
          </div>
        </div>

        <div className="animate-rise lg:justify-self-end">
          <TerminalCard />
        </div>
      </div>
    </section>
  );
}
