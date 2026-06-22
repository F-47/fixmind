import { Brain, Download, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { deleteLesson, exportUrl, loadDashboard, resetAllLessons, saveReview } from "./api";
import { LessonCard } from "./components/LessonCard";
import { LessonPage } from "./components/LessonPage";
import { MarginArt } from "./components/MarginArt";
import { ProgressChart } from "./components/ProgressChart";
import { RankList } from "./components/RankList";
import { formatToolName, formatWeek, weekStartOf } from "./format";
import type { DashboardData, DashboardLesson, Understanding } from "./types";

type Filter = "all" | "learning" | "understood";
type ModelFilter = "all" | `tool:${string}`;
type Route = { kind: "dashboard" } | { kind: "lesson"; lessonId: string; review: boolean };

const PAGE_SIZE = 8;

function readRoute(): Route {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const match = pathname.match(/^\/lessons\/([^/]+)$/);
  if (!match) return { kind: "dashboard" };
  return {
    kind: "lesson",
    lessonId: decodeURIComponent(match[1]),
    review: new URLSearchParams(window.location.search).get("review") === "1",
  };
}

function lessonUrl(lessonId: string, review = false): string {
  return `/lessons/${encodeURIComponent(lessonId)}${review ? "?review=1" : ""}`;
}

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(1);
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
    const handlePopState = () => setRoute(readRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard(query)
        .then(setData)
        .catch((caught: Error) => setError(caught.message));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const tools = useMemo(() => {
    return data?.models ?? [];
  }, [data]);
  const modelCounts = useMemo(
    () => tools.map(({ name, count }) => ({ tool: name, count })),
    [data, tools],
  );
  const visible = useMemo(
    () =>
      data?.lessons.filter(
        (item) =>
          filter === "all" ||
          (filter === "learning" && item.understanding !== "understood") ||
          (filter === "understood" && item.understanding === "understood"),
      ) ?? [],
    [data, filter],
  );
  const modelVisible = useMemo(
    () =>
      visible.filter(
        (item) =>
          (modelFilter === "all" || item.tool === modelFilter.slice(5)) &&
          (selectedWeek === null ||
            weekStartOf(item.createdAt) === selectedWeek),
      ),
    [modelFilter, selectedWeek, visible],
  );
  const totalPages = Math.max(1, Math.ceil(modelVisible.length / PAGE_SIZE));
  const pageLessons = useMemo(
    () => modelVisible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [modelVisible, page],
  );
  useEffect(() => {
    setPage(1);
  }, [filter, modelFilter, selectedWeek, query]);
  const selectedLesson = useMemo(
    () =>
      route.kind === "lesson"
        ? data?.lessons.find((lesson) => lesson.id === route.lessonId) ?? null
        : null,
    [data, route],
  );

  function navigate(to: string, replace = false) {
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setRoute(readRoute());
  }

  function open(lesson: DashboardLesson, review: boolean) {
    navigate(lessonUrl(lesson.id, review));
  }
  function toggleWeek(weekStart: string) {
    setSelectedWeek((prev) => (prev === weekStart ? null : weekStart));
  }
  async function submitReview(
    answers: Record<string, string>,
    understanding: Understanding,
  ) {
    if (route.kind !== "lesson" || !selectedLesson) return;
    await saveReview(selectedLesson.id, answers, understanding);
    setData(await loadDashboard(query));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    navigate("/", true);
  }
  async function removeLesson(lessonId: string) {
    await deleteLesson(lessonId);
    setData(await loadDashboard(query));
    if (route.kind === "lesson" && route.lessonId === lessonId) {
      navigate("/", true);
    }
  }
  async function resetAll() {
    await resetAllLessons();
    setConfirmingReset(false);
    setData(await loadDashboard(query));
  }

  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-lg text-muted">
        {error || "Loading your lessons…"}
      </main>
    );

  const filters: Array<[Filter, string]> = [
    ["all", "All"],
    ["learning", "Not learned"],
    ["understood", "Learned"],
  ];
  const modelFilters: Array<[ModelFilter, string]> = [
    ["all", "All models"],
    ...tools.map(({ name }): [ModelFilter, string] => [
      `tool:${name}`,
      formatToolName(name),
    ]),
  ];

  return (
    <>
      <MarginArt side="left" />
      <MarginArt side="right" />
      <div className="mx-auto max-w-260 px-6 py-10 max-sm:px-4 max-sm:py-6">
        <header className="flex items-baseline justify-between border-b border-line pb-5">
          <span className="text-2xl font-bold tracking-tight">Fixmind</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
            <span className="size-1.5 rounded-full bg-accent" />
            {data.summary.total} lessons &mdash; Local only
          </span>
        </header>

        <section className="border-b border-line py-12 max-sm:py-8">
          <div className="flex items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-[.2em] text-accent">
                Fixmind &mdash; a developer&rsquo;s lesson log
              </div>
              <h1 className="mt-3 font-serif text-[clamp(2.8rem,5.4vw,4.8rem)] leading-[1.02] font-bold tracking-tight">
                Don&rsquo;t just let AI fix it.
                <span className="block text-accent">Learn from it.</span>
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                A running record of the bugs you&rsquo;ve fixed and the lessons
                behind them &mdash; what to remember, why it happened, and how to
                avoid it next time.
              </p>
            </div>
            <div className="relative hidden shrink-0 min-[900px]:block" aria-hidden="true">
              <Brain className="size-56 text-line" strokeWidth={1} />
              <span className="absolute top-7 right-5 size-2.5 rounded-full bg-accent" />
              <span className="absolute bottom-10 left-3 size-2 rounded-full bg-accent/60" />
              <span className="absolute top-1/2 right-1 size-2 rounded-full border border-accent" />
            </div>
          </div>
        </section>

        {/* Progress */}
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
            onStartReview={() => navigate(lessonUrl(selectedLesson?.id ?? route.lessonId, true))}
            onSave={submitReview}
            onDelete={(lessonId) => void removeLesson(lessonId)}
          />
        ) : (
          <div className="grid grid-cols-[1fr_300px] gap-10 py-10 max-[900px]:grid-cols-1 max-[900px]:gap-10">
            <main>
              <div className="mb-5 space-y-4 rounded-3xl">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Your lessons{" "}
                    <span className="text-lg text-muted">
                      ({modelVisible.length})
                    </span>
                  </h2>
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
                <h2 className="mb-3 text-lg font-semibold tracking-tight">Models</h2>
                <div className="grid gap-2">
                  {modelCounts.map(({ tool, count }) => (
                    <div className="flex items-baseline justify-between gap-3 text-sm" key={tool}>
                      <span className="text-muted">{formatToolName(tool)}</span>
                      <span className="font-mono text-xs font-semibold text-accent">{count}</span>
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
                    if (event.target === resetDialogRef.current) setConfirmingReset(false);
                  }}
                >
                  <p className="text-base leading-relaxed">
                    Delete all {data.summary.total} lesson(s)? Export a backup first if you want to
                    keep them &mdash; this can&rsquo;t be undone.
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
