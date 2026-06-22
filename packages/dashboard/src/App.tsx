import { Brain, Download, RefreshCw, Search } from "lucide-react";
import { useEffect } from "react";
import { LessonCard } from "./components/LessonCard";
import { LessonPage } from "./components/LessonPage";
import { MarginArt } from "./components/MarginArt";
import { ProgressChart } from "./components/ProgressChart";
import { RankList } from "./components/RankList";
import { exportUrl } from "./api";
import { formatToolName, formatWeek } from "./format";
import { useDashboardController } from "./useDashboardController";

export default function App() {
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
    confirmingReset,
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
    syncNote,
    totalPages,
    open,
    refreshDashboard,
    removeLesson,
    resetAll,
    submitReview,
    toggleWeek,
    navigate,
  } = useDashboardController();

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
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
              Last sync pull:{" "}
              {syncMeta?.lastPulledAt
                ? new Date(syncMeta.lastPulledAt).toLocaleString()
                : "never"}
            </p>
          </div>
        </header>

        <section className="border-b border-line py-12 max-sm:py-8">
          <div className="flex items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-[.2em] text-accent">
                Fixmind &mdash; a developer&rsquo;s lesson log
              </div>
              <h1 className="mt-3 font-serif text-[clamp(2.8rem,5.4vw,4.8rem)] leading-[1.02] font-bold tracking-tight">
                <span className="block whitespace-nowrap">
                  Don&rsquo;t just let <br /> AI fix it.
                </span>
                <span className="block text-accent">Learn from it.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                A running record of the bugs you&rsquo;ve fixed and the lessons
                behind them &mdash; what to remember, why it happened, and how
                to avoid it next time.
              </p>
            </div>
            <div
              className="relative hidden shrink-0 min-[900px]:block"
              aria-hidden="true"
            >
              <Brain className="size-56 text-line" strokeWidth={1} />
              <span className="absolute top-7 right-5 size-2.5 rounded-full bg-accent" />
              <span className="absolute bottom-10 left-3 size-2 rounded-full bg-accent/60" />
              <span className="absolute top-1/2 right-1 size-2 rounded-full border border-accent" />
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
                  {syncMeta && (!syncMeta.loggedIn || syncMeta.needsReauth) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-[.18em] text-muted">
                          {syncMeta.needsReauth ? "Sync needs re-login" : "Sync is off"}
                        </div>
                        <p className="text-sm leading-relaxed text-muted">
                          {syncMeta.needsReauth
                            ? "Your saved sync session expired. Sign in again on the account page to restore encrypted sync."
                            : "Sign in on the account page to enable encrypted sync across your devices."}
                        </p>
                      </div>
                      <a
                        className="inline-flex items-center justify-center rounded-full border border-line bg-page px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-ink transition-colors hover:border-accent/40 hover:text-accent"
                        href="https://fixmind.dev/account"
                      >
                        Open account
                      </a>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Your lessons{" "}
                      <span className="text-lg text-muted">
                        ({modelVisible.length})
                      </span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => void refreshDashboard()}
                      disabled={refreshing}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition-colors hover:border-accent/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      title="Pull the latest lessons from sync"
                    >
                      <RefreshCw
                        size={12}
                        className={refreshing ? "animate-spin" : ""}
                      />
                      {refreshing ? "Syncing" : "Refresh"}
                    </button>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                    Filter by learning state or model.
                  </p>
                  {syncNote && <p className="text-sm text-muted">{syncNote}</p>}
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
                <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[.15em]">
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
                </div>
                <button
                  className="mt-4 cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.15em] text-danger hover:underline"
                  onClick={() => setConfirmingReset(true)}
                >
                  Reset all data
                </button>
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
