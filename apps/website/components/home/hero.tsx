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
        className="animate-pulse-slow pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            MCP server - local by default
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Don&apos;t just let AI fix it.
            <br />
            <span className="text-accent text-glow">Learn from it.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Your agent patches the code, you accept the diff, and the lesson
            evaporates. Fixmind turns each AI-assisted fix into a local lesson
            you can review, search, and reuse the next time the same bug shows
            up.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/docs/quickstart"
              data-umami-event="home_hero_quickstart"
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Start Quickstart
            </Link>
            <Link
              href="/pricing"
              data-umami-event="home_hero_pricing"
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
            >
              See pricing
            </Link>
            <a
              href="#how"
              data-umami-event="home_hero_how"
              className="rounded-md border border-dashed border-line px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-ink"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 max-w-xl space-y-3">
            <CommandSnippet command="npx fixmind setup" caption="Start local" />
          </div>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <TerminalCard />
        </div>
      </div>
    </section>
  );
}
