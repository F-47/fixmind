import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/components/shared/cn";
import { Filters } from "@/components/home/Filters";
import { Hero } from "@/components/home/Hero";
import { LessonList } from "@/components/home/LessonList";
import { ReviewInbox } from "@/components/home/ReviewInbox";
import { formatToolName, formatWeek } from "@/lib/format";
import { Progress } from "@/components/home/Progress";
import { Sidebar } from "@/components/home/Sidebar";

const PAGE_SIZE = 8;

export function HomePage() {
  const navigate = useNavigate();
  const { data, error, refreshing, syncMeta, loadDashboardData, refreshDashboard, removeLesson, resetAll } =
    useDashboardData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "learning" | "understood">("all");
  const [modelFilter, setModelFilter] = useState<"all" | `tool:${string}`>("all");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [syncJustCompleted, setSyncJustCompleted] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmingReset) {
      if (!resetDialogRef.current?.open) resetDialogRef.current?.showModal();
    } else {
      resetDialogRef.current?.close();
    }
  }, [confirmingReset]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboardData(query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData, query]);

  useEffect(() => {
    setPage(1);
  }, [filter, modelFilter, selectedWeek, query]);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center text-lg text-muted">
        {error || "Loading your lessons..."}
      </main>
    );
  }

  const hasLessons = data.summary.total > 0;
  const visible = data.lessons.filter(
    (item) =>
      filter === "all" ||
      (filter === "learning" && item.understanding !== "understood") ||
      (filter === "understood" && item.understanding === "understood"),
  );
  const filteredLessons = visible.filter(
    (item) =>
      (modelFilter === "all" || item.tool === modelFilter.slice(5)) &&
      (selectedWeek === null || item.createdAt.startsWith(selectedWeek)),
  );
  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const pageLessons = filteredLessons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canSync = Boolean(syncMeta?.loggedIn && syncMeta.syncEnabled);
  const syncButtonLabel = syncJustCompleted ? "Synced" : "Sync";
  const modelFilters = [
    ["all", "All models"],
    ...data.models.map(({ name }): [string, string] => [
      `tool:${name}`,
      formatToolName(name),
    ]),
  ] as Array<[string, string]>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <Hero totalLessons={data.summary.total} />

      <ReviewInbox
        lessons={data.due}
        onOpen={(lesson, review) =>
          navigate(`/lessons/${encodeURIComponent(lesson.id)}${review ? "?review=1" : ""}`)
        }
      />

      <section className="space-y-4 border-b border-line pb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your progress
            </h2>
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
              Lessons per week by understanding
            </div>
          </div>
          {selectedWeek && (
            <button
              className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-accent hover:underline"
              onClick={() => setSelectedWeek(null)}
            >
              Week of {formatWeek(selectedWeek)} &mdash; reset
            </button>
          )}
        </div>
        <Progress
          data={data.progress}
          selectedWeek={selectedWeek}
          onSelectWeek={(weekStart) =>
            setSelectedWeek((prev) => (prev === weekStart ? null : weekStart))
          }
        />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-10 max-[900px]:grid-cols-1 max-[900px]:gap-10">
        <div className="min-w-0">
          <div className="mb-5 space-y-4 rounded-3xl">
            <div className="space-y-2">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your lessons{" "}
                  <span className="text-lg text-muted">({filteredLessons.length})</span>
                </h2>
                <div className="flex items-center gap-x-1.5">
                  {canSync && (
                    <button
                      type="button"
                      onClick={() => {
                        void (async () => {
                          const synced = await refreshDashboard();
                          if (!synced) return;
                          setSyncJustCompleted(true);
                          window.setTimeout(() => setSyncJustCompleted(false), 1400);
                        })();
                      }}
                      disabled={refreshing}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        syncJustCompleted
                          ? "border-positive/40 bg-positive/10 text-positive hover:border-positive/40 hover:text-positive"
                          : "border-line bg-surface-2 text-muted hover:border-accent/40 hover:text-ink",
                      )}
                      title={
                        syncJustCompleted
                          ? "Sync completed"
                          : "Pull the latest lessons from sync"
                      }
                    >
                      <RefreshCw
                        size={12}
                        className={cn(
                          refreshing && "animate-spin",
                          !refreshing && syncJustCompleted && "text-positive",
                        )}
                      />
                      {refreshing ? "Syncing" : syncButtonLabel}
                    </button>
                  )}
                  {!canSync && (
                    <button
                      type="button"
                      disabled
                      onClick={undefined}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-muted opacity-70"
                      title="Requires an active Pro or Team plan"
                    >
                      <RefreshCw size={12} />
                      Sync
                      <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] tracking-[.22em] text-accent">
                        Pro
                      </span>
                    </button>
                  )}
                </div>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Filter by learning state.
              </p>
            </div>

            {hasLessons && (
            <Filters
              filters={[
                ["all", "All"],
                ["learning", "Not learned"],
                ["understood", "Learned"],
              ]}
              filter={filter}
              modelFilters={modelFilters}
              modelFilter={modelFilter}
              query={query}
              onFilter={(value) =>
                setFilter(value as "all" | "learning" | "understood")
              }
              onModelFilter={(value) =>
                setModelFilter(value as "all" | `tool:${string}`)
              }
              onQuery={setQuery}
            />
          )}
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <LessonList
            pageLessons={pageLessons}
            query={query}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => current - 1)}
            onNext={() => setPage((current) => current + 1)}
            onOpen={(lesson, review) =>
              navigate(
                `/lessons/${encodeURIComponent(lesson.id)}${review ? "?review=1" : ""}`,
              )
            }
            onDelete={(lessonId) => void removeLesson(lessonId)}
          />
        </div>

        <Sidebar
          data={data}
          resetDialogRef={resetDialogRef}
          setConfirmingReset={setConfirmingReset}
          resetAll={async () => {
            await resetAll();
            setConfirmingReset(false);
          }}
        />
      </div>
    </main>
  );
}
