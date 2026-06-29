import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { DashboardLesson, Understanding } from "@/lib/types";
import { MarkdownText } from "@/components/shared/MarkdownText";
import { LessonCodeSection } from "@/components/lesson/LessonCodeSection";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import { LessonQuestionsSection } from "@/components/lesson/LessonQuestionsSection";
import {
  LessonRecallBlock,
  type SelfCheck,
} from "@/components/lesson/LessonRecallBlock";
import {
  lessonSectionHeading,
  lessonTagClass,
} from "@/components/lesson/lessonStyles";

interface Props {
  lesson: DashboardLesson | null;
  reviewMode: boolean;
  onBack(): void;
  onStartReview(): void;
  onSave(
    answers: Record<string, string>,
    understanding: Understanding,
  ): Promise<void>;
  onDelete(id: string): void;
}

export function LessonPage({
  lesson,
  reviewMode,
  onBack,
  onStartReview,
  onSave,
  onDelete,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [understanding, setUnderstanding] = useState<Understanding | "">("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selfChecks, setSelfChecks] = useState<Record<string, SelfCheck>>({});

  useEffect(() => {
    setAnswers({});
    setUnderstanding("");
    setError("");
    setRevealed({});
    setSelfChecks({});
  }, [lesson?.id, reviewMode]);

  if (!lesson) {
    return (
      <section className="py-8 text-ink">
        <h1 className="mt-6 font-serif text-3xl font-bold tracking-tight">
          Lesson not found
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          The lesson may have been deleted, or the link no longer points to a
          valid id.
        </p>
      </section>
    );
  }

  async function submit() {
    if (!understanding) {
      setError("Choose how well you understand the lesson.");
      return;
    }
    try {
      await onSave(answers, understanding);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <section className="text-ink">
      <article>
        <button
          type="button"
          className="mb-6 inline-flex items-center gap-2 py-2 font-mono text-[11px] uppercase tracking-[.18em] text-muted transition hover:border-accent/40 hover:text-ink"
          onClick={onBack}
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </button>
        <LessonHeader lesson={lesson} />

        {lesson.originalPrompt && (
          <>
            <h2 className={lessonSectionHeading}>The prompt</h2>
            <MarkdownText className="border-l-2 border-line pl-4 text-base leading-relaxed text-muted italic">
              {lesson.originalPrompt}
            </MarkdownText>
          </>
        )}

        <h2 className={lessonSectionHeading}>What broke</h2>
        <MarkdownText className="text-base leading-relaxed">
          {lesson.problem}
        </MarkdownText>

        <LessonRecallBlock
          title="Why it happened"
          prompt="Before reading on: what was the mistake, and - more importantly - what was the root cause behind it (not just the symptom)?"
          referenceText={`${lesson.mistake} ${lesson.rootCause} ${lesson.fixSummary}`}
          reviewMode={reviewMode}
          answer={answers.__rootCause ?? ""}
          onAnswerChange={(value) =>
            setAnswers((prev) => ({ ...prev, __rootCause: value }))
          }
          revealed={Boolean(revealed.__rootCause)}
          onToggleReveal={() =>
            setRevealed((prev) => ({
              ...prev,
              __rootCause: !prev.__rootCause,
            }))
          }
          check={selfChecks.__rootCause}
          onCheck={(value) =>
            setSelfChecks((prev) => ({ ...prev, __rootCause: value }))
          }
          reveal={
            <div className="grid gap-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                  What went wrong
                </div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">
                  {lesson.mistake}
                </MarkdownText>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                  Root cause
                </div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">
                  {lesson.rootCause}
                </MarkdownText>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                  Why the fix works
                </div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">
                  {lesson.fixSummary}
                </MarkdownText>
              </div>
            </div>
          }
        />

        <LessonCodeSection lesson={lesson} />

        <LessonRecallBlock
          title="When this doesn't apply"
          prompt="Before reading on: in what situation would this lesson's advice be wrong or unnecessary?"
          referenceText={
            lesson.whenNotApplicable ?? "Not captured for this lesson."
          }
          reviewMode={reviewMode}
          answer={answers.__scope ?? ""}
          onAnswerChange={(value) =>
            setAnswers((prev) => ({ ...prev, __scope: value }))
          }
          revealed={Boolean(revealed.__scope)}
          onToggleReveal={() =>
            setRevealed((prev) => ({ ...prev, __scope: !prev.__scope }))
          }
          check={selfChecks.__scope}
          onCheck={(value) =>
            setSelfChecks((prev) => ({ ...prev, __scope: value }))
          }
          reveal={
            lesson.whenNotApplicable ? (
              <MarkdownText className="text-base leading-relaxed">
                {lesson.whenNotApplicable}
              </MarkdownText>
            ) : (
              <p className="text-base leading-relaxed">
                Not captured for this lesson.
              </p>
            )
          }
        />

        {lesson.filesChanged.length > 0 && (
          <>
            <h2 className={lessonSectionHeading}>Files involved</h2>
            <div className="flex flex-wrap gap-2">
              {lesson.filesChanged.map((file) => (
                <span className={lessonTagClass} key={file}>
                  {file}
                </span>
              ))}
            </div>
          </>
        )}

        <LessonQuestionsSection
          lesson={lesson}
          reviewMode={reviewMode}
          answers={answers}
          setAnswers={setAnswers}
          understanding={understanding}
          setUnderstanding={setUnderstanding}
          error={error}
          onSave={submit}
          onStartReview={onStartReview}
          onDelete={() => onDelete(lesson.id)}
          revealed={revealed}
          setRevealed={setRevealed}
          selfChecks={selfChecks}
          setSelfChecks={setSelfChecks}
        />
      </article>
    </section>
  );
}
