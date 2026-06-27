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
            MCP server · runs on your machine
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Don&apos;t just let AI fix it.
            <br />
            <span className="text-accent text-glow">Learn from it.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted text-justify">
            Your agent patches the code, you accept the diff, and the lesson
            evaporates. Fixmind catches it on the way out - a local MCP server
            that turns every AI-assisted fix into something you actually
            remember.
          </p>
          <div className="mt-9 max-w-xl space-y-2">
            <CommandSnippet command="npx fixmind setup" />
            <p className="text-sm leading-relaxed text-muted">
              Run the CLI through <code className="text-ink">npx</code> when you
              want a one-off setup or login. If you want a persistent binary on
              your PATH later, install the package globally after you know you
              need it.
            </p>
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
