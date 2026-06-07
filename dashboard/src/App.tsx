import { useEffect, useMemo, useState } from "react";
import { loadDashboard, saveReview } from "./api";
import { LessonCard } from "./components/LessonCard";
import { LessonDialog } from "./components/LessonDialog";
import { RankList } from "./components/RankList";
import { reviewAction } from "./format";
import type {
  DashboardLesson,
  DashboardData,
  Understanding,
} from "./types";

type Filter = "all" | "due" | "learning" | "understood";

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
  const visible = useMemo(
    () =>
      data?.lessons.filter(
        (item) =>
          filter === "all" ||
          (filter === "due" && dueIds.has(item.id)) ||
          (filter === "learning" && item.understanding !== "understood") ||
          (filter === "understood" && item.understanding === "understood"),
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

  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-muted">{error || "Loading your lessons..."}</main>
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
  ];

  return (
    <div className="mx-auto max-w-[1380px] p-7 max-sm:px-3 max-sm:py-5">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-3 font-extrabold">
          <span className="grid size-[38px] place-items-center rounded-xl border border-[#315849] bg-[#183129] font-mono text-[17px] font-extrabold text-mint">FM</span>Fixmind
        </div>
        <span className="rounded-full border border-[#315849] px-2.5 py-1.5 font-mono text-[10px] font-bold text-mint">LOCAL ONLY</span>
      </nav>
      <section className="my-12 grid grid-cols-[minmax(0,1fr)_430px] items-end gap-8 max-[950px]:grid-cols-1 max-sm:mt-9">
        <div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-mint">Your next learning step</div>
          <h1 className="my-3 text-[clamp(38px,5vw,66px)] leading-none font-bold tracking-[-.055em] max-sm:text-[42px]">What should you learn next?</h1>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-muted">
            Review the lessons behind your recent fixes. Each lesson
            explains what to remember, why the bug happened, and how to avoid it
            next time.
          </p>
        </div>
        <input
          className="w-full rounded-2xl border border-line bg-[#0d1116] px-4 py-3.5 text-ink outline-none focus:border-[#4f8f7c]"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search lessons, topics, patterns, or files"
        />
      </section>
      <section className="mb-5 grid grid-cols-4 gap-3 max-[950px]:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div className="rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-4" key={label}>
            <strong className="block text-3xl tracking-tight">{value}</strong>
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)_350px] gap-5 max-[950px]:grid-cols-1">
        <section className="rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="m-0 text-[17px] font-semibold">Your lessons</h2>
            <span className="text-xs text-muted">{visible.length} shown</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <button
                className={`cursor-pointer rounded-full border px-3 py-2 text-xs ${filter === value ? "border-[#315849] bg-[#183129] text-mint" : "border-line bg-[#11171d] text-muted"}`}
                onClick={() => setFilter(value)}
                key={value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3">
            {visible.length ? (
              visible.map((lesson) => (
                <LessonCard
                  lesson={lesson}
                  due={dueIds.has(lesson.id)}
                  onOpen={open}
                  key={lesson.id}
                />
              ))
            ) : (
              <div className="px-2 py-8 text-center text-[13px] text-muted">No lessons match this view.</div>
            )}
          </div>
        </section>
        <aside className="grid content-start gap-5 max-[950px]:row-start-1">
          <section className="rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="m-0 text-[17px] font-semibold">Review next</h2>
              <span className="text-xs text-muted">
                {data.summary.due ? `${data.summary.due} due` : "All caught up"}
              </span>
            </div>
            {data.due.length ? (
              data.due.slice(0, 4).map((lesson) => (
                <div className="border-b border-line py-3 last:border-0" key={lesson.id}>
                  <strong className="text-[13px]">{lesson.title}</strong>
                  <p className="my-2 text-[11px] text-muted">{reviewAction(lesson.nextReviewAt)}</p>
                  <button
                    className="cursor-pointer rounded-lg border-0 bg-mint px-3 py-2 font-extrabold text-[#05251b]"
                    onClick={() => open(lesson, true)}
                  >
                    Start review
                  </button>
                </div>
              ))
            ) : (
              <div className="px-2 py-8 text-center text-[13px] text-muted">Nothing is due right now.</div>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-5">
            <h2 className="m-0 text-[17px] font-semibold">Topics you keep encountering</h2>
            <RankList items={data.topics} />
          </section>
          <section className="rounded-2xl border border-line bg-gradient-to-br from-[#12171d] to-[#0d1115] p-5">
            <h2 className="m-0 text-[17px] font-semibold">Patterns to work on</h2>
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
      />
      {saved && <div className="fixed right-6 bottom-6 rounded-xl border border-[#2f6555] bg-[#143329] px-4 py-3 text-mint">Review saved</div>}
    </div>
  );
}
