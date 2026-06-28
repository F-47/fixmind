import { type RefObject } from "react";
import { Download, Trash } from "lucide-react";
import { exportUrl } from "@/lib/api";
import { formatToolName } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { RankList } from "@/components/shared/RankList";

interface Props {
  data: DashboardData;
  resetDialogRef: RefObject<HTMLDialogElement | null>;
  setConfirmingReset(value: boolean): void;
  resetAll(): void;
}

export function Sidebar({
  data,
  resetDialogRef,
  setConfirmingReset,
  resetAll,
}: Props) {
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
                <span className="font-mono text-xs font-semibold text-accent">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Topics you keep encountering
        </h2>
        <RankList items={data.topics} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Patterns to work on
        </h2>
        <RankList items={data.patterns} />
      </section>
      {hasLessons && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Backup &amp; export
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-muted">
            Your lessons are stored locally. Export a copy any time.
          </p>
          <div className="flex flex-col items-start space-y-1.5 text-sm font-mono">
            <a
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
              href={exportUrl("json")}
              download
            >
              <Download className="size-3.5" />
              Export JSON
            </a>
            <a
              className="inline-flex items-center gap-1.5 text-accent hover:underline"
              href={exportUrl("md")}
              download
            >
              <Download className="size-3.5" />
              Export Markdown
            </a>
            <button
              className="inline-flex items-center gap-1.5 cursor-pointer border-0 bg-transparent p-0 text-danger hover:underline"
              onClick={() => setConfirmingReset(true)}
            >
              <Trash className="size-3.5" />
              Reset all data
            </button>
          </div>

          <dialog
            ref={resetDialogRef}
            className="dialog-glass fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 p-6"
            onClose={() => setConfirmingReset(false)}
            onClick={(event) => {
              if (event.target === resetDialogRef.current)
                setConfirmingReset(false);
            }}
          >
            <p className="text-base leading-relaxed">
              Delete all {data.summary.total} lesson(s)? Export a backup first if
              you want to keep them &mdash; this can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-5 font-mono text-[11px] uppercase tracking-[.2em]">
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink transition-colors"
                onClick={() => setConfirmingReset(false)}
              >
                Cancel
              </button>
              <button
                className="cursor-pointer border-0 bg-transparent p-0 font-bold text-danger hover:underline"
                onClick={() => void resetAll()}
              >
                Reset
              </button>
            </div>
          </dialog>
        </section>
      )}
    </aside>
  );
}
