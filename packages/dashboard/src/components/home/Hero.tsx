import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function Hero({
  totalLessons,
  dueLessons,
}: {
  totalLessons: number;
  dueLessons: number;
}) {
  const dueLabel = `${dueLessons} due`;
  const practiceCardClassName =
    "group flex w-full items-stretch justify-between gap-4 rounded-3xl border border-accent/30 bg-gradient-to-r from-accent/10 via-surface-2 to-surface-2 p-4 shadow-[0_14px_40px_-28px_rgba(0,0,0,0.65)] transition";

  return (
    <header className="border-b border-line pb-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
              Dashboard overview
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your lessons at a glance
            </h1>
          </div>
          <div className="text-right">
            <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {totalLessons} lessons
            </span>
          </div>
        </div>
        {dueLessons > 0 && (
          <Link
            to="/practice"
            className={`${practiceCardClassName} hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_18px_45px_-26px_rgba(0,0,0,0.75)]`}
          >
            <span className="min-w-0 flex-1 space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
                  Practice mode
                </span>
                <span className="rounded-full border border-line bg-page px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                  {dueLabel}
                </span>
              </div>
              <span className="block text-base font-medium tracking-tight text-ink">
                Start a short drill from lessons waiting in your inbox
              </span>
              <span className="block max-w-lg text-sm leading-relaxed text-muted">
                Due lessons appear below on this page, and practice starts from
                that queue.
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 self-center rounded-full border border-accent/20 bg-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-page transition group-hover:translate-x-0.5">
              Start
              <ArrowRight className="size-3.5" />
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
