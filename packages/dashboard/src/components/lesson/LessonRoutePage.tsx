import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LessonPage } from "@/components/lesson/LessonPage";
import { ProactiveMemoryPanel } from "@/components/lesson/ProactiveMemoryPanel";
import { useDashboardData } from "@/hooks/useDashboardData";
import { findProactiveMemoryMatches } from "@/lib/proactive-memory";

export function LessonRoutePage() {
  const { data, error, loadDashboardData, submitReview, removeLesson } = useDashboardData();
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const [memoryDismissed, setMemoryDismissed] = useState(false);
  const reviewMode = searchParams.get("review") === "1";

  useEffect(() => {
    if (!data) {
      void loadDashboardData();
    }
  }, [data, loadDashboardData]);

  const lesson = useMemo(
    () => data?.lessons.find((item) => item.id === lessonId) ?? null,
    [data, lessonId],
  );
  const proactiveMatches = useMemo(
    () => (lesson && data ? findProactiveMemoryMatches(lesson, data.lessons) : []),
    [data, lesson],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: each lesson gets an independent memory-panel dismissal
  useEffect(() => {
    setMemoryDismissed(false);
  }, [lesson?.id]);

  if (!data) {
    return (
      <main className="mx-auto grid min-h-[60vh] max-w-5xl place-items-center px-4 py-10 text-lg text-muted sm:px-6 lg:px-8">
        {error || "Loading lesson..."}
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="py-8 text-ink">
          <div className="mb-6 flex items-center justify-between border-b border-line pb-4 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
            <span>Lesson</span>
            <span>Not found</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Lesson not found</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            The lesson may have been deleted, or the link no longer points to a valid id.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl py-8 sm:py-12 sm:px-6 lg:px-8">
      {!memoryDismissed && proactiveMatches.length > 0 && (
        <ProactiveMemoryPanel
          matches={proactiveMatches}
          onDismiss={() => setMemoryDismissed(true)}
          onOpenLesson={(targetLessonId) => {
            navigate(`/lessons/${encodeURIComponent(targetLessonId)}`);
          }}
        />
      )}
      <LessonPage
        lesson={lesson}
        reviewMode={reviewMode}
        onBack={() => {
          navigate("/");
        }}
        onStartReview={() => {
          navigate(`/lessons/${encodeURIComponent(lesson.id)}?review=1`);
        }}
        onSave={async (answers, understanding) => {
          await submitReview(lesson.id, answers, understanding);
          navigate("/", { replace: true });
        }}
        onDelete={async (lessonIdToDelete) => {
          await removeLesson(lessonIdToDelete);
          navigate("/", { replace: true });
        }}
      />
    </main>
  );
}
