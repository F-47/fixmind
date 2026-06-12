import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { deleteLesson, loadDashboard, saveReview } from "./api";
import { LessonCard } from "./components/LessonCard";
import { LessonDialog } from "./components/LessonDialog";
import { MarginArt } from "./components/MarginArt";
import { ProgressChart } from "./components/ProgressChart";
import { RankList } from "./components/RankList";
import { formatToolName, reviewAction } from "./format";
import type {
  DashboardLesson,
  DashboardData,
  Understanding,
} from "./types";

type Filter = "all" | "due" | "learning" | "understood" | `tool:${string}`;

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<DashboardLesson | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard(query)
        .then(setData)
        .catch((caught: Error) => setError(caught.message));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const dueIds = useMemo(
    () => new Set(data?.due.map((item) => item.id) ?? []),
    [data],
  );
  const tools = useMemo(() => {
    const set = new Set<string>();
    for (const lesson of data?.lessons ?? []) set.add(lesson.tool);
    return [...set].sort();
  }, [data]);
  const visible = useMemo(
    () =>
      data?.lessons.filter(
        (item) =>
          filter === "all" ||
          (filter === "due" && dueIds.has(item.id)) ||
          (filter === "learning" && item.understanding !== "understood") ||
          (filter === "understood" && item.understanding === "understood") ||
          (filter.startsWith("tool:") && item.tool === filter.slice(5)),
      ) ?? [],
    [data, dueIds, filter],
  );
  function open(lesson: DashboardLesson, review: boolean) {
    setSelected(lesson);
    setReviewMode(review);
  }
  async function submitReview(
    answers: Record<string, string>,
    understanding: Understanding,
  ) {
    if (!selected) return;
    await saveReview(selected.id, answers, understanding);
    setSelected(null);
    setReviewMode(false);
    setData(await loadDashboard(query));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }
  async function removeLesson(lessonId: string) {
    await deleteLesson(lessonId);
    setSelected(null);
    setData(await loadDashboard(query));
  }

  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-lg text-muted">
        {error || "Loading your lessons…"}
      </main>
    );

  const metrics = [
    ["Reviews due", data.summary.due],
    ["Still learning", data.summary.learning],
    ["Understood", data.summary.understood],
    ["Total lessons", data.summary.total],
  ] as const;
  const filters: Array<[Filter, string]> = [
    ["all", "All"],
    ["due", "Review now"],
    ["learning", "Still learning"],
    ["understood", "Understood"],
    ...tools.map((tool): [Filter, string] => [`tool:${tool}`, formatToolName(tool)]),
  ];

  return (
    <>
    <MarginArt side="left" />
    <MarginArt side="right" />
    <div className="mx-auto max-w-[1040px] px-6 py-10 max-sm:px-4 max-sm:py-6">
      {/* Header */}
      <header className="flex items-baseline justify-between border-b border-line pb-5">
        <span className="text-2xl font-bold tracking-tight">
          Fixmind
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
          <span className="size-1.5 rounded-full bg-accent" />
          Local only
        </span>
      </header>

      {/* Hero */}
      <section className="grid grid-cols-[1.4fr_1fr] gap-16 border-b border-line py-12 max-[820px]:grid-cols-1 max-[820px]:gap-8 max-sm:py-8">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[.2em] text-accent">
            Fixmind &mdash; a developer&rsquo;s lesson log
          </div>
          <h1 className="mt-3 font-serif text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.05] font-bold tracking-tight">
            Don&rsquo;t fix the same bug twice.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            A running record of the bugs you&rsquo;ve fixed and the lessons
            behind them &mdash; what to remember, why it happened, and how to
            avoid it next time.
          </p>
        </div>
        <div className="flex flex-col gap-8 max-[820px]:gap-6">
          <div>
            <label
              htmlFor="lesson-search"
              className="font-mono text-[10px] uppercase tracking-[.2em] text-muted"
            >
              Search your lessons
            </label>
            <div className="mt-2 flex items-center gap-3 border-b border-line pb-3 focus-within:border-accent">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                id="lesson-search"
                className="w-full bg-transparent text-lg text-ink outline-none placeholder:text-muted"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Topics, patterns, files, tools&hellip;"
              />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dd className="font-mono text-4xl font-bold tracking-tight">
                  {value}
                </dd>
                <dt className="mt-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Progress */}
      <section className="border-b border-line py-10 max-sm:py-8">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          Your progress
        </h2>
        <ProgressChart data={data.progress} />
      </section>

      {/* Body */}
      <div className="grid grid-cols-[1fr_300px] gap-16 py-10 max-[900px]:grid-cols-1 max-[900px]:gap-10">
        <main>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your lessons
            </h2>
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
          </div>
          <div>
            {visible.length ? (
              visible.map((lesson) => (
                <LessonCard
                  lesson={lesson}
                  onOpen={open}
                  onDelete={(lessonId) => void removeLesson(lessonId)}
                  key={lesson.id}
                />
              ))
            ) : (
              <p className="py-10 text-sm text-muted">
                No lessons match this view.
              </p>
            )}
          </div>
        </main>
        <aside className="max-[900px]:border-t max-[900px]:border-line max-[900px]:pt-10 [&>section]:border-t [&>section]:border-line [&>section]:pt-6 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0 [&>section]:mt-6 border-l border-line pl-10 max-[900px]:border-l-0 max-[900px]:pl-0">
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Review next
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[.15em] text-muted">
                {data.summary.due ? `${data.summary.due} due` : "Caught up"}
              </span>
            </div>
            {data.due.length ? (
              data.due.slice(0, 4).map((lesson) => (
                <div className="border-t border-line py-3 first:border-t-0" key={lesson.id}>
                  <div className="text-sm font-medium">{lesson.title}</div>
                  <p className="mt-1 mb-2 font-mono text-[10px] uppercase tracking-[.1em] text-muted">
                    {reviewAction(lesson.nextReviewAt)}
                  </p>
                  <button
                    className="cursor-pointer font-mono text-[11px] uppercase tracking-[.15em] text-accent hover:underline"
                    onClick={() => open(lesson, true)}
                  >
                    Start review &rarr;
                  </button>
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-muted">
                Nothing is due right now.
              </p>
            )}
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
        </aside>
      </div>

      <LessonDialog
        lesson={selected}
        reviewMode={reviewMode}
        onClose={() => setSelected(null)}
        onStartReview={() => setReviewMode(true)}
        onSave={submitReview}
        onDelete={(lessonId) => void removeLesson(lessonId)}
      />
      {saved && (
        <div className="fixed right-6 bottom-6 border border-line bg-surface px-4 py-3 font-mono text-[12px] uppercase tracking-[.1em] text-positive">
          Review saved
        </div>
      )}
    </div>
    </>
  );
}
