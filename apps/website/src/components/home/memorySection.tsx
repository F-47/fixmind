import { BrainCircuit } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";

export default function MemorySection() {
  return (
    <section id="memory" className="border-y border-line bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 lg:grid-cols-[1fr_.95fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Memory retrieval
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Reviewed lessons come back when the next task looks familiar.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Fixmind does not just store what went wrong. It pulls a few reviewed
            lessons back into context so the agent reuses the rule faster
            instead of relearning the same mistake from scratch.
          </p>

          <div className="mt-8 grid gap-4">
            <MemoryDetail label="Trigger">
              The current task looks like an older bug pattern.
            </MemoryDetail>
            <MemoryDetail label="Retrieval">
              The agent calls{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-ink">
                memory
              </code>{" "}
              and gets a small, relevant set of lessons.
            </MemoryDetail>
            <MemoryDetail label="Result">
              Less repeat debugging, faster responses, cleaner fixes.
            </MemoryDetail>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-page p-6 shadow-[0_0_80px_-40px_var(--color-accent-dim)]">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.18em] text-accent">
              <BrainCircuit className="size-4" />
              Memory snapshot
            </div>
            <span className="rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
              reviewed only
            </span>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="font-serif text-5xl font-bold tracking-tight text-ink">
                  3
                </div>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                  lessons ready to resurface as guidance when the next fix
                  matches an old pattern.
                </p>
              </div>
              <div className="w-full max-w-[250px] rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5 font-mono text-sm text-ink">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-accent">$</span>
                  <span className="truncate">use fixmind memory</span>
                  <CopyButton text="use fixmind memory" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <MemoryStatus tone="accent" label="Active">
                Only lessons that still matter stay eligible.
              </MemoryStatus>
              <MemoryStatus tone="good" label="Reviewed">
                Memory pulls from lessons you already checked.
              </MemoryStatus>
              <MemoryStatus tone="relevant" label="Relevant">
                It surfaces a few matches, not the whole archive.
              </MemoryStatus>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MemoryDetail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-page/70 p-5">
      <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
        {label}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function MemoryStatus({
  tone,
  label,
  children,
}: {
  tone: "accent" | "good" | "relevant";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        tone === "relevant"
          ? "border-accent/20 bg-accent/8"
          : "border-line bg-surface",
      )}
    >
      <span
        className={cn(
          "mt-1 size-2 rounded-full",
          tone === "good" ? "bg-good" : "bg-accent",
          tone === "relevant" &&
            "shadow-[0_0_0_3px_rgba(var(--color-accent-rgb),0.12)]",
        )}
      />
      <div>
        <div
          className={cn(
            "font-mono text-[10px] uppercase tracking-[.16em]",
            tone === "relevant" ? "text-accent" : "text-muted",
          )}
        >
          {label}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink">{children}</p>
      </div>
    </div>
  );
}
