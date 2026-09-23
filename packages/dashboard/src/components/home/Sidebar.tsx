import { AlertTriangle, Download } from "lucide-react";
import type { RefObject } from "react";
import { RankList } from "@/components/shared/RankList";
import { downloadExport } from "@/lib/api";
import { formatToolName } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

interface Props {
  data: DashboardData;
  resetDialogRef: RefObject<HTMLDialogElement | null>;
  setConfirmingReset(value: boolean): void;
  resetAll(): void;
}

export function Sidebar({ data, resetDialogRef, setConfirmingReset, resetAll }: Props) {
  const hasLessons = data.summary.total > 0;
  return (
    <aside className="self-start max-[900px]:static max-[900px]:border-t max-[900px]:border-line max-[900px]:pt-10 [&>section]:border-t [&>section]:border-line [&>section]:pt-6 [&>section]:pb-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0 sticky top-10 border-l border-line pl-10 max-[900px]:border-l-0 max-[900px]:pl-0">
      {data.models.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Models</h2>
          <div className="grid gap-2">
            {data.models.map(({ name, count }) => (
              <div className="flex items-baseline justify-between gap-3 text-sm" key={name}>
                <span className="text-muted">{formatToolName(name)}</span>
                <span className="font-mono text-xs font-semibold text-accent">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Topics you keep encountering</h2>
        <RankList items={data.topics} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Patterns to work on</h2>
        <RankList items={data.patterns} />
      </section>
      {data.weeklyDigest?.recentLessons > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">This week</h2>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            {data.weeklyDigest.recentLessons} lesson(s) captured or reviewed in the last 7 days.
          </p>
          {data.weeklyDigest.topMistakePatterns.length > 0 && (
            <>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Top patterns
              </h3>
              <RankList items={data.weeklyDigest.topMistakePatterns} />
            </>
          )}
          {data.weeklyDigest.forgottenConcepts.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Still learning
              </h3>
              <RankList items={data.weeklyDigest.forgottenConcepts} />
            </>
          )}
        </section>
      )}
      {hasLessons && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Backup &amp; export</h2>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Your lessons are stored locally. Export a copy any time.
          </p>
          <div className="flex flex-col items-start space-y-1.5 text-sm font-mono">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-accent hover:underline"
              onClick={() => void downloadExport("json")}
            >
              <Download className="size-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-accent hover:underline"
              onClick={() => void downloadExport("md")}
            >
              <Download className="size-3.5" />
              Export Markdown
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 text-danger hover:underline"
              onClick={() => setConfirmingReset(true)}
            >
              <AlertTriangle className="size-3.5" />
              Delete all data
            </button>
          </div>

          {/* biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog already supports keyboard dismissal */}
          <dialog
            ref={resetDialogRef}
            className="dialog-glass fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden p-0"
            onClose={() => setConfirmingReset(false)}
            onClick={(event) => {
              if (event.target === resetDialogRef.current) setConfirmingReset(false);
            }}
          >
            <div className="border border-danger/20 bg-danger/5 p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-danger/20 bg-danger/10 text-danger">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[.24em] text-danger">
                    Danger zone
                  </div>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">
                    Delete all {data.summary.total} lesson(s)?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Export a backup first if you want to keep them. This action permanently removes
                    every lesson and cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4 font-mono text-[11px] uppercase tracking-[.2em]">
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-muted transition-colors hover:text-ink"
                  onClick={() => setConfirmingReset(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-danger/30 bg-danger px-4 py-2 font-bold text-page transition hover:bg-danger/90"
                  onClick={() => void resetAll()}
                >
                  Delete all
                </button>
              </div>
            </div>
          </dialog>
        </section>
      )}
    </aside>
  );
}
