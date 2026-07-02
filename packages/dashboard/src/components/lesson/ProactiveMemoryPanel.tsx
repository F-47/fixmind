import { ExternalLink, ChevronDown, X } from "lucide-react";
import { cn } from "@/components/shared/cn";
import { formatToolName } from "@/lib/format";
import type { ProactiveMemoryMatch } from "@/lib/proactive-memory";

interface Props {
  matches: ProactiveMemoryMatch[];
  onDismiss(): void;
  onOpenLesson(lessonId: string): void;
}

export function ProactiveMemoryPanel({ matches, onDismiss, onOpenLesson }: Props) {
  if (matches.length === 0) return null;

  return (
    <details className="mb-8 group rounded-3xl border border-warn/20 bg-warn/6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.45)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div className="space-y-1 text-left">
          <div className="font-mono text-[10px] uppercase tracking-[.24em] text-warn">
            Before you fix
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Relevant memory found
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {matches.length} prior lesson{matches.length === 1 ? "" : "s"} match this
            fix. Expand to review them before continuing.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-page px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180" />
            Review
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-page px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition hover:border-accent/40 hover:text-ink"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDismiss();
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <X className="size-3.5" />
            Dismiss
          </button>
        </div>
      </summary>

      <div className="border-t border-warn/15 px-5 pb-5 pt-4">
        <div className="mt-4 grid gap-4">
          {matches.map((match, index) => (
            <article
              key={match.lesson.id}
              className={cn(
                "rounded-2xl border p-4",
                index === 0
                  ? "border-warn/25 bg-page/80"
                  : "border-line bg-page/55",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                    {index === 0 ? "Top match" : `Match ${index + 1}`}
                  </div>
                  <h3 className="mt-1 font-serif text-xl font-semibold tracking-tight">
                    {match.lesson.title}
                  </h3>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  {confidenceLabel(match.score)}
                </span>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {match.lesson.displayTakeaway}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                <span>{formatToolName(match.lesson.tool)}</span>
                <span className="h-4 w-px bg-line" />
                <span>{match.lesson.displayPattern}</span>
                <span className="h-4 w-px bg-line" />
                <span>{match.summary}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page transition hover:translate-y-[-1px]"
                  onClick={() => onOpenLesson(match.lesson.id)}
                >
                  Open lesson
                  <ExternalLink className="size-3.5" />
                </button>
                {match.matchedFields.length > 0 && (
                  <span className="text-[11px] uppercase tracking-[.18em] text-muted">
                    Matched on {match.matchedFields.slice(0, 3).join(", ")}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}

function confidenceLabel(score: number): string {
  if (score >= 18) return "High confidence";
  if (score >= 12) return "Likely match";
  return "Possible match";
}
