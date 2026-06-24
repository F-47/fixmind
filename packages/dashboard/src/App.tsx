import { Download, RefreshCw, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { exportUrl } from "./api";
import { LessonCard } from "./components/LessonCard";
import { LessonPage } from "./components/LessonPage";
import { MarginArt } from "./components/MarginArt";
import { ProgressChart } from "./components/ProgressChart";
import { RankList } from "./components/RankList";
import { formatToolName, formatWeek } from "./format";
import { useDashboardController } from "./useDashboardController";

export default function App() {
  const [syncJustCompleted, setSyncJustCompleted] = useState(false);

  useEffect(() => {
    document.title = "fixmind - close the loop on AI bug fixes";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Fixmind is a local-first MCP server that turns every AI bug fix into a lesson you actually remember. Local by default, no account required.",
      );
  }, []);

  const {
    data,
    error,
    filters,
    filter,
    modelCounts,
    modelFilters,
    modelFilter,
    modelVisible,
    page,
    pageLessons,
    query,
    refreshing,
    resetDialogRef,
    route,
    saved,
    selectedLesson,
    selectedWeek,
    setConfirmingReset,
    setFilter,
    setModelFilter,
    setPage,
    setQuery,
    setSelectedWeek,
    syncMeta,
    totalPages,
    open,
    refreshDashboard,
    removeLesson,
    resetAll,
    submitReview,
    toggleWeek,
    navigate,
  } = useDashboardController();
  const canSync = Boolean(syncMeta?.loggedIn && syncMeta.syncEnabled);
  const syncButtonLabel = syncJustCompleted ? "Synced" : "Sync";

  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-lg text-muted">
        {error || "Loading your lessons..."}
      </main>
    );

  return (
    <>
      <MarginArt side="left" />
      <MarginArt side="right" />
      <div className="mx-auto max-w-260 px-6 py-10 max-sm:px-4 max-sm:py-6">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <span className="text-2xl font-bold tracking-tight">Fixmind</span>
          <div className="text-right">
            <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {data.summary.total} lessons
            </span>
          </div>
        </header>

        <section className="border-b border-line py-12 max-sm:py-8">
          <div className="flex items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-[.2em] text-accent">
                Fixmind &mdash; a record of fixes that became lessons
              </div>
              <h1 className="mt-3 font-serif text-[clamp(2.8rem,5.4vw,4.8rem)] leading-[1.02] font-bold tracking-tight">
                <span className="block whitespace-nowrap">
                  Don&rsquo;t stop at <br /> the fix.
                </span>
                <span className="block text-accent">Turn it into a rule.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                A running record of fixes, root causes, and reusable lessons.
              </p>
            </div>
            <div
              className="relative hidden shrink-0 min-[900px]:block"
              aria-hidden="true"
            >
              <img src="/logo.jpeg" alt="" className="size-52 rounded-3xl" />
            </div>
          </div>
        </section>

        <section className="border-b border-line py-10 max-sm:py-8 space-y-4">
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
          <ProgressChart
            data={data.progress}
            selectedWeek={selectedWeek}
            onSelectWeek={toggleWeek}
          />
        </section>

        {route.kind === "lesson" ? (
          <LessonPage
            lesson={selectedLesson}
            reviewMode={route.review}
            onBack={() => navigate("/", true)}
            onStartReview={() => {
              const lessonId = selectedLesson?.id ?? route.lessonId;
              navigate(`/lessons/${encodeURIComponent(lessonId)}?review=1`);
            }}
            onSave={submitReview}
            onDelete={(lessonId) => void removeLesson(lessonId)}
          />
        ) : (
          <div className="grid grid-cols-[1fr_300px] gap-10 py-10 max-[900px]:grid-cols-1 max-[900px]:gap-10">
            <main>
              <div className="mb-5 space-y-4 rounded-3xl">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Your lessons{" "}
                      <span className="text-lg text-muted">
                        ({modelVisible.length})
                      </span>
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
                              window.setTimeout(
                                () => setSyncJustCompleted(false),
                                1400,
                              );
                            })();
                          }}
                          disabled={refreshing}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            syncJustCompleted
                              ? "border-positive/40 bg-positive/10 text-positive hover:border-positive/40 hover:text-positive"
                              : "border-line bg-surface-2 text-muted hover:border-accent/40 hover:text-ink"
                          }`}
                          title={
                            syncJustCompleted
                              ? "Sync completed"
                              : "Pull the latest lessons from sync"
                          }
                        >
                          <RefreshCw
                            size={12}
                            className={
                              refreshing
                                ? "animate-spin"
                                : syncJustCompleted
                                  ? "text-positive"
                                  : ""
                            }
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
                    Filter by learning state or model.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <nav className="flex flex-wrap gap-5">
                    {filters.map(([value, label]) => (
                      <button
                        className={`cursor-pointer border-b-2 pb-0.5 font-mono text-[11px] uppercase tracking-[.15em] transition ${
                          filter === value
                            ? "border-accent text-ink"
                            : "border-transparent text-muted hover:text-ink"
                        }`}
                        onClick={() => setFilter(value)}
                        key={value}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                  <div className="h-4 w-px bg-line max-sm:hidden" />
                  <nav className="flex flex-wrap gap-5">
                    {modelFilters.map(([value, label]) => (
                      <button
                        className={`cursor-pointer border-b-2 pb-0.5 font-mono text-[11px] uppercase tracking-[.15em] transition ${
                          modelFilter === value
                            ? "border-accent text-ink"
                            : "border-transparent text-muted hover:text-ink"
                        }`}
                        onClick={() => setModelFilter(value)}
                        key={value}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="rounded-2xl border border-line bg-page/25 p-3">
                  <div className="flex items-center gap-3 ">
                    <Search className="size-4 shrink-0 text-muted" />
                    <input
                      id="lesson-search"
                      className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Topics, patterns, files, tools..."
                    />
                  </div>
                </div>
              </div>
              <div>
                {pageLessons.length ? (
                  pageLessons.map((lesson) => (
                    <LessonCard
                      lesson={lesson}
                      onOpen={open}
                      onDelete={(lessonId) => void removeLesson(lessonId)}
                      key={lesson.id}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    No lessons match this view.
                  </p>
                )}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted"
                    onClick={() => setPage((current) => current - 1)}
                    disabled={page === 1}
                  >
                    &larr; Prev
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={page === totalPages}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </main>
            <aside className="self-start max-[900px]:static max-[900px]:border-t max-[900px]:border-line max-[900px]:pt-10 [&>section]:border-t [&>section]:border-line [&>section]:pt-6 [&>section]:pb-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0 sticky top-10 border-l border-line pl-10 max-[900px]:border-l-0 max-[900px]:pl-0">
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">
                  Models
                </h2>
                <div className="grid gap-2">
                  {modelCounts.map(({ tool, count }) => (
                    <div
                      className="flex items-baseline justify-between gap-3 text-sm"
                      key={tool}
                    >
                      <span className="text-muted">{formatToolName(tool)}</span>
                      <span className="font-mono text-xs font-semibold text-accent">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
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
              <section>
                <h2 className="mb-3 text-lg font-semibold tracking-tight">
                  Backup &amp; export
                </h2>
                <p className="mb-3 text-sm leading-relaxed text-muted">
                  Your lessons are stored locally. Export a copy any time.
                </p>
                <div className="flex flex-col space-y-1.5 items-start text-sm font-mono ">
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
                  className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-line bg-page p-6 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]"
                  onClose={() => setConfirmingReset(false)}
                  onClick={(event) => {
                    if (event.target === resetDialogRef.current)
                      setConfirmingReset(false);
                  }}
                >
                  <p className="text-base leading-relaxed">
                    Delete all {data.summary.total} lesson(s)? Export a backup
                    first if you want to keep them &mdash; this can&rsquo;t be
                    undone.
                  </p>
                  <div className="mt-6 flex justify-end gap-5 font-mono text-[11px] uppercase tracking-[.2em]">
                    <button
                      className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
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
            </aside>
          </div>
        )}

        <footer className="border-t border-line pt-6 text-center font-mono text-[11px] uppercase tracking-[.2em] text-muted">
          &copy; {new Date().getFullYear()} Fixmind &mdash;{" "}
          <a className="hover:text-ink" href="mailto:support@fixmind.dev">
            support@fixmind.dev
          </a>
        </footer>
        {saved && (
          <div className="fixed right-6 bottom-6 border border-line bg-surface px-4 py-3 font-mono text-[12px] uppercase tracking-[.1em] text-positive">
            Review saved
          </div>
        )}
      </div>
    </>
  );
}
