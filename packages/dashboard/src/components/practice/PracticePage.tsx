import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PracticeEmptyState } from "@/components/practice/PracticeEmptyState";
import { PracticeModeSelector } from "@/components/practice/PracticeModeSelector";
import {
  type PracticeMcqFeedback,
  PracticePromptCard,
} from "@/components/practice/PracticePromptCard";
import { PracticeRelatedLessons } from "@/components/practice/PracticeRelatedLessons";
import { PracticeSessionComplete } from "@/components/practice/PracticeSessionComplete";
import { useDashboardData } from "@/hooks/useDashboardData";
import { buildPracticeCard, getPracticeLessons, scorePracticeResult } from "@/lib/practice";
import { findProactiveMemoryMatches } from "@/lib/proactive-memory";
import type { PracticeMode, Understanding } from "@/lib/types";

export function PracticePage() {
  const { data, error, loadDashboardData, submitReview } = useDashboardData();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PracticeMode>("mixed");
  const [sessionLessonIds, setSessionLessonIds] = useState<string[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [mcqFeedback, setMcqFeedback] = useState<PracticeMcqFeedback>(null);
  const [pendingMcqSubmission, setPendingMcqSubmission] = useState<{
    answer: string;
    result: Understanding;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [sessionSeed, setSessionSeed] = useState(0);

  useEffect(() => {
    if (!data) {
      void loadDashboardData();
    }
  }, [data, loadDashboardData]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: switching practice modes starts a new session
  useEffect(() => {
    setSessionLessonIds([]);
    setSessionTotal(0);
    setAnswer("");
    setSelectedChoice("");
    setRevealed(false);
    setMcqFeedback(null);
    setPendingMcqSubmission(null);
    setSessionLoading(true);
    setSessionError("");
    setSaving(false);
    setSessionSeed((value) => value + 1);
  }, [mode]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the seed intentionally rebuilds a completed session
  useEffect(() => {
    if (!data) return;

    const availableIds = new Set(data.lessons.map((lesson) => lesson.id));
    setSessionLessonIds((current) => {
      if (current.length === 0) {
        const initialIds = getPracticeLessons(data).map((lesson) => lesson.id);
        setSessionTotal(initialIds.length);
        setSessionLoading(false);
        return initialIds;
      }

      const nextIds = current.filter((id) => availableIds.has(id));
      setSessionLoading(false);
      return nextIds.length === current.length ? current : nextIds;
    });
  }, [data, sessionSeed]);

  const currentLesson = useMemo(
    () =>
      data && sessionLessonIds.length > 0
        ? (data.lessons.find((lesson) => lesson.id === sessionLessonIds[0]) ?? null)
        : null,
    [data, sessionLessonIds],
  );
  const card = useMemo(
    () => (data && currentLesson ? buildPracticeCard(currentLesson, data.lessons, mode) : null),
    [data, currentLesson, mode],
  );
  const relatedLessons = useMemo(
    () => (data && currentLesson ? findProactiveMemoryMatches(currentLesson, data.lessons) : []),
    [data, currentLesson],
  );
  const progress =
    sessionTotal === 0 || sessionLessonIds.length === 0
      ? 0
      : sessionTotal - sessionLessonIds.length + 1;

  // biome-ignore lint/correctness/useExhaustiveDependencies: each card starts with fresh answer state
  useEffect(() => {
    setRevealed(false);
    setAnswer("");
    setSelectedChoice("");
    setMcqFeedback(null);
    setPendingMcqSubmission(null);
    setSessionError("");
  }, [currentLesson?.id]);

  async function savePracticeResult(
    result: Understanding,
    submittedAnswer: string,
  ): Promise<boolean> {
    if (!card) return false;
    if (!submittedAnswer.trim()) {
      setSessionError(
        card.mode === "mcq"
          ? "Pick an answer before saving."
          : "Write a short answer before saving.",
      );
      return false;
    }

    setSaving(true);
    setSessionError("");
    try {
      await submitReview(card.lesson.id, { [card.question.id]: submittedAnswer }, result);
      if (card.mode === "free") {
        setSessionLessonIds((current) => current.slice(1));
        setAnswer("");
        setSelectedChoice("");
        setRevealed(false);
        setMcqFeedback(null);
        setPendingMcqSubmission(null);
      }
      return true;
    } catch (caught) {
      setSessionError(caught instanceof Error ? caught.message : String(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function chooseMcqOption(option: string): void {
    if (card?.mode !== "mcq" || saving || mcqFeedback) return;

    setSelectedChoice(option);
    setRevealed(true);
    const result = scorePracticeResult(option, card.question.expectedAnswer);
    setPendingMcqSubmission({ answer: option, result });
    setMcqFeedback(result === "understood" ? "correct" : "wrong");
    setSessionError("");
  }

  async function advanceMcqCard(): Promise<void> {
    if (card?.mode !== "mcq" || !pendingMcqSubmission || saving) return;

    const saved = await savePracticeResult(
      pendingMcqSubmission.result,
      pendingMcqSubmission.answer,
    );
    if (!saved) return;

    setSessionLessonIds((current) => current.slice(1));
    setRevealed(false);
    setSelectedChoice("");
    setMcqFeedback(null);
    setPendingMcqSubmission(null);
  }

  if (!data) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-4 py-10 text-lg text-muted sm:px-6 lg:px-8">
        {error || "Loading practice mode..."}
      </main>
    );
  }

  if (sessionLoading) {
    return (
      <main className="grid min-h-[60vh] place-items-center px-4 py-10 text-lg text-muted sm:px-6 lg:px-8">
        Preparing a new practice session...
      </main>
    );
  }

  const sessionFinished = sessionTotal > 0 && sessionLessonIds.length === 0;

  if (sessionFinished) {
    return (
      <PracticeSessionComplete
        sessionTotal={sessionTotal}
        onPracticeAgain={() => {
          setMode("mixed");
          setSessionLessonIds([]);
        }}
      />
    );
  }

  if (!card) {
    return <PracticeEmptyState onBack={() => navigate("/")} />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition hover:text-ink"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="size-3.5" />
            Back to dashboard
          </button>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Quick practice from your due lessons
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Pick an answer, review the feedback, then move on. MCQ shows right or wrong instantly,
              while free response lets you think it through first.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-line px-2 py-0.5 font-mono text-[10px] text-ink">
                Practice mode
              </span>
            </div>
          </div>
        </div>

        <PracticeModeSelector mode={mode} onModeChange={setMode} />
      </header>

      <div className="space-y-6">
        <PracticePromptCard
          card={card}
          progress={progress}
          sessionTotal={sessionTotal}
          answer={answer}
          selectedChoice={selectedChoice}
          revealed={revealed}
          mcqFeedback={mcqFeedback}
          saving={saving}
          sessionError={sessionError}
          onAnswerChange={setAnswer}
          onReveal={() => setRevealed(true)}
          onSelectChoice={chooseMcqOption}
          onSaveUnderstanding={(result) => void savePracticeResult(result, answer)}
          onAdvanceMcq={advanceMcqCard}
        />

        <PracticeRelatedLessons
          matches={relatedLessons}
          onOpenLesson={(lessonId) => navigate(`/lessons/${encodeURIComponent(lessonId)}`)}
        />
      </div>
    </main>
  );
}
