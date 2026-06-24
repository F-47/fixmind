import { Check, Repeat } from "lucide-react";
import type { ReactNode } from "react";

function LoopStep({
  index,
  children,
  tone,
}: {
  index: number;
  children: ReactNode;
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

export default function LoopSection() {
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
          <div className="relative bg-surface p-8">
            <div className="mb-7 flex items-center gap-2">
              <Repeat size={16} className="text-bad" />
              <h3 className="font-mono text-sm uppercase tracking-wide text-bad">
                Without fixmind
              </h3>
            </div>
            <div className="space-y-5">
              <LoopStep index={1} tone="bad">A bug shows up. You hand it to your agent.</LoopStep>
              <LoopStep index={2} tone="bad">The agent patches it. The diff looks reasonable, so you accept it.</LoopStep>
              <LoopStep index={3} tone="bad">You move on. The reasoning behind the fix never left the chat window.</LoopStep>
              <LoopStep index={4} tone="bad">Three weeks later, the same mistake shows up in a different file.</LoopStep>
            </div>
            <div className="mt-7 flex items-center gap-2 rounded-lg border border-dashed border-bad/30 px-3 py-2.5 font-mono text-xs text-bad">
              <Repeat size={13} />
              loop closes — back to step 1
            </div>
          </div>

          <div className="relative bg-surface p-8">
            <div className="mb-7 flex items-center gap-2">
              <Check size={16} className="text-good" />
              <h3 className="font-mono text-sm uppercase tracking-wide text-good">
                With fixmind
              </h3>
            </div>
            <div className="space-y-5">
              <LoopStep index={1} tone="good">A bug shows up. You hand it to your agent.</LoopStep>
              <LoopStep index={2} tone="good">The agent patches it, then calls <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-ink">save_lesson</code>.</LoopStep>
              <LoopStep index={3} tone="good">The mistake, the root cause, and the bad/good code land in your local database.</LoopStep>
              <LoopStep index={4} tone="good">Fixmind quizzes you on it in 1, 3, and 7 days.</LoopStep>
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
