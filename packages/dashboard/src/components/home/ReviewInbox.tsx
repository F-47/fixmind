import { ArrowRight, ChevronDown, Clock3, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/components/shared/cn";
import { formatDate, formatToolName } from "@/lib/format";
import type { DashboardLesson } from "@/lib/types";

interface Props {
  lessons: DashboardLesson[];
  onOpen(lesson: DashboardLesson, review: boolean): void;
  maxVisible?: number;
  compact?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function ReviewInbox({ lessons, onOpen, maxVisible = 3, compact = false }: Props) {
  const [showAll, setShowAll] = useState(false);
  const sortedLessons = useMemo(
    () =>
      [...lessons].sort(
        (a, b) =>
          Date.parse(a.nextReviewAt) - Date.parse(b.nextReviewAt) ||
          b.reviewCount - a.reviewCount ||
          a.title.localeCompare(b.title),
      ),
    [lessons],
  );
  const visibleLessons = showAll ? sortedLessons : sortedLessons.slice(0, maxVisible);
  const hasMoreLessons = sortedLessons.length > visibleLessons.length;

  return (
    <section
      className={cn(
        "rounded-3xl border border-line bg-surface/40 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.4)] animate-fade-up",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className={cn("font-semibold tracking-tight", compact ? "text-xl" : "text-2xl")}>
            Due lessons
          </h2>
          <div className="font-mono text-[10px] uppercase tracking-[.22em] text-muted">
            Review inbox
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-warn">
          <Clock3 className="size-3.5" />
          {sortedLessons.length} due
        </span>
      </div>

      {sortedLessons.length > 0 ? (
        <>
          <div className={cn("mt-5 grid", compact ? "gap-3" : "gap-4")}>
            {visibleLessons.map((lesson) => {
              const dueInfo = dueSummary(lesson.nextReviewAt);
              return (
                <article
                  className={cn(
                    "rounded-2xl border border-line bg-page/70 transition-shadow hover:shadow-[0_20px_60px_-42px_rgba(0,0,0,0.5)]",
                    compact ? "p-3.5" : "p-4",
                  )}
                  key={lesson.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-serif font-semibold tracking-tight",
                          compact ? "text-lg" : "text-xl",
                        )}
                      >
                        {lesson.title}
                      </h3>
                      <p
                        className={cn(
                          "mt-1.5 max-w-2xl leading-relaxed text-muted",
                          compact ? "text-[13px]" : "text-sm",
                        )}
                      >
                        {lesson.displayTakeaway}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em]",
                        dueInfo.tone,
                      )}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                    <span>{formatToolName(lesson.tool)}</span>
                    <span className="h-4 w-px bg-line" />
                    <span>{lesson.displayPattern}</span>
                    <span className="h-4 w-px bg-line" />
                    <span>Next: {formatDate(lesson.nextReviewAt)}</span>
                    <span className="h-4 w-px bg-line" />
                    <span>{lesson.reviewCount} review(s)</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      className="inline-flex cursor-pointer items-center gap-2 border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page transition hover:translate-y-[-1px]"
                      onClick={() => onOpen(lesson, true)}
                    >
                      Review now
                      <ArrowRight className="size-3.5" />
                    </button>
                    <button
                      className="inline-flex cursor-pointer items-center gap-2 border border-line bg-transparent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted transition hover:border-accent/40 hover:text-ink"
                      onClick={() => onOpen(lesson, false)}
                    >
                      <ExternalLink className="size-3.5" />
                      Open lesson
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {hasMoreLessons && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-page px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition hover:border-accent/40 hover:text-ink"
              onClick={() => setShowAll((current) => !current)}
            >
              <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
              {showAll
                ? "Show fewer"
                : `Show ${sortedLessons.length - visibleLessons.length} more`}
            </button>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-line bg-page/40 px-5 py-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-line bg-surface-2 text-muted">
            <Clock3 className="size-5" />
          </div>
          <p className="text-base font-medium text-ink">
            Nothing is due right now.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            When a lesson becomes due, it will appear here at the top of the
            dashboard.
          </p>
        </div>
      )}
    </section>
  );
}

function dueSummary(nextReviewAt: string): { label: string; tone: string } {
  const dueDate = new Date(nextReviewAt);
  const now = new Date();
  const dueDay = Date.UTC(
    dueDate.getUTCFullYear(),
    dueDate.getUTCMonth(),
    dueDate.getUTCDate(),
  );
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayDelta = Math.max(0, Math.floor((today - dueDay) / DAY_MS));

  if (dayDelta === 0) {
    return { label: "Due today", tone: "border-warn/25 bg-warn/10 text-warn" };
  }

  return {
    label: dayDelta === 1 ? "Overdue by 1 day" : `Overdue by ${dayDelta} days`,
    tone: "border-danger/25 bg-danger/10 text-danger",
  };
}
