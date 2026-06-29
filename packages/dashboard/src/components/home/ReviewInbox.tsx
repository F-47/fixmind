import { ArrowRight, Clock3, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/components/shared/cn";
import { formatDate, formatToolName } from "@/lib/format";
import type { DashboardLesson } from "@/lib/types";

interface Props {
  lessons: DashboardLesson[];
  onOpen(lesson: DashboardLesson, review: boolean): void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function ReviewInbox({ lessons, onOpen }: Props) {
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

  return (
    <section className="rounded-3xl border border-line bg-surface/40 p-5 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.4)] animate-fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Due lessons</h2>
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
        <div className="mt-5 grid gap-4">
          {sortedLessons.map((lesson) => {
            const dueInfo = dueSummary(lesson.nextReviewAt);
            return (
              <article
                className="rounded-2xl border border-line bg-page/70 p-4 transition-shadow hover:shadow-[0_20px_60px_-42px_rgba(0,0,0,0.5)]"
                key={lesson.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl font-semibold tracking-tight">
                      {lesson.title}
                    </h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
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

                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px] uppercase tracking-[.18em] text-muted">
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
