import { FilterX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdvancedFilters } from "@/components/home/AdvancedFilters";
import { Filters } from "@/components/home/Filters";
import { Hero } from "@/components/home/Hero";
import { LessonList } from "@/components/home/LessonList";
import { Progress } from "@/components/home/Progress";
import { ReviewInbox } from "@/components/home/ReviewInbox";
import { Sidebar } from "@/components/home/Sidebar";
import { SyncStatusCard } from "@/components/home/SyncStatusCard";
import { cn } from "@/components/shared/cn";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatToolName, formatWeek, weekStartOf } from "@/lib/format";
import {
  DEFAULT_LESSON_FILTERS,
  filterLessons,
  type LessonFilterState,
} from "@/lib/lesson-filters";

const PAGE_SIZE = 8;

export function HomePage() {
  const navigate = useNavigate();
  const {
    data,
    error,
    refreshing,
    syncMeta,
    loadDashboardData,
    refreshDashboard,
    removeLesson,
    resetAll,
  } = useDashboardData();
  const [filters, setFilters] = useState<LessonFilterState>(DEFAULT_LESSON_FILTERS);
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmingReset) {
      if (!resetDialogRef.current?.open) resetDialogRef.current?.showModal();
    } else {
      resetDialogRef.current?.close();
    }
  }, [confirmingReset]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: changing any filter invalidates the current page
  useEffect(() => {
    setPage(1);
  }, [
    filters.client,
    filters.concept,
    filters.date,
    filters.learningState,
    filters.pattern,
    filters.query,
    filters.status,
    filters.understanding,
    filters.file,
    selectedWeek,
  ]);

  const lessonCorpus = data?.lessons ?? [];
  const filteredLessons = useMemo(
    () =>
      filterLessons(lessonCorpus, filters).filter(
        (item) => selectedWeek === null || weekStartOf(item.createdAt) === selectedWeek,
      ),
    [lessonCorpus, filters, selectedWeek],
  );
  const modelFilters = [
    ["all", "All models"],
    ...(data?.models ?? []).map(({ name }): [string, string] => [name, formatToolName(name)]),
  ] as Array<[string, string]>;
  const conceptOptions = useMemo(
    () =>
      [...new Set(lessonCorpus.flatMap((lesson) => lesson.concepts))]
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [lessonCorpus],
  );
  const patternOptions = useMemo(
    () =>
      [
        ...new Set(
          lessonCorpus.map((lesson) => lesson.mistakePattern?.trim() || lesson.displayPattern),
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [lessonCorpus],
  );
  const fileOptions = useMemo(
    () =>
      [...new Set(lessonCorpus.flatMap((lesson) => lesson.filesChanged))]
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [lessonCorpus],
  );

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center text-lg text-muted">
        {error || "Loading your lessons..."}
      </main>
    );
  }

  const hasLessons = data.summary.total > 0;
  const hasDueLessons = data.due.length > 0;
  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const pageLessons = filteredLessons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasAdvancedFilters =
    filters.learningState !== "all" ||
    filters.understanding !== "all" ||
    filters.status !== "all" ||
    filters.client !== "all" ||
    filters.concept ||
    filters.pattern ||
    filters.file ||
    filters.date !== "all";
  const hasAnyFilters = Boolean(filters.query || hasAdvancedFilters || selectedWeek);
  const resetAllFilters = () => {
    setFilters(DEFAULT_LESSON_FILTERS);
    setSelectedWeek(null);
    setAdvancedFiltersOpen(false);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <Hero totalLessons={data.summary.total} />

      <SyncStatusCard syncMeta={syncMeta} refreshing={refreshing} onRefresh={refreshDashboard} />

      {hasDueLessons && (
        <ReviewInbox
          lessons={data.due}
          onOpen={(lesson, review) =>
            navigate(`/lessons/${encodeURIComponent(lesson.id)}${review ? "?review=1" : ""}`)
          }
          maxVisible={3}
          compact
        />
      )}

      <section className="space-y-4 border-b border-line pb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Your progress</h2>
            <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
              Lessons per week by understanding
            </div>
          </div>
          {selectedWeek && (
            <button
              type="button"
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
            <div className="space-y-3">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your lessons{" "}
                  <span className="text-lg text-muted">({filteredLessons.length})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                  {hasAnyFilters && (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] transition-colors",
                        "border-line bg-surface-2 text-muted hover:border-accent/40 hover:text-ink",
                      )}
                      onClick={resetAllFilters}
                    >
                      <FilterX size={12} />
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {hasLessons && (
              <Filters
                query={filters.query}
                onQuery={(value) => setFilters((prev) => ({ ...prev, query: value }))}
              />
            )}

            {hasLessons && (
              <div className="mt-4">
                <AdvancedFilters
                  state={filters}
                  setState={setFilters}
                  modelOptions={modelFilters}
                  conceptOptions={conceptOptions}
                  patternOptions={patternOptions}
                  fileOptions={fileOptions}
                  open={advancedFiltersOpen}
                  onToggleOpen={setAdvancedFiltersOpen}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <LessonList
            pageLessons={pageLessons}
            query={filters.query}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => current - 1)}
            onNext={() => setPage((current) => current + 1)}
            onOpen={(lesson, review) =>
              navigate(`/lessons/${encodeURIComponent(lesson.id)}${review ? "?review=1" : ""}`)
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
