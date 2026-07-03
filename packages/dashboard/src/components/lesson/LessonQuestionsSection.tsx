import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/shared/cn";
import { MarkdownText } from "@/components/shared/MarkdownText";
import type { DashboardLesson, Understanding } from "@/lib/types";
import {
  LessonExplanationCoverageHint,
  LessonSelfCheckButtons,
  type SelfCheck,
} from "@/components/lesson/LessonRecallBlock";
import { LessonDeleteControl } from "@/components/lesson/LessonDeleteControl";
import { lessonSectionHeading } from "@/components/lesson/lessonStyles";

interface Props {
  lesson: DashboardLesson;
  reviewMode: boolean;
  answers: Record<string, string>;
  setAnswers(
    value:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>),
  ): void;
  understanding: Understanding | "";
  setUnderstanding(value: Understanding | ""): void;
  error: string;
  onSave(): Promise<void>;
  onStartReview(): void;
  onDelete(): void;
  revealed: Record<string, boolean>;
  setRevealed(
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ): void;
  selfChecks: Record<string, SelfCheck>;
  setSelfChecks(
    value:
      | Record<string, SelfCheck>
      | ((prev: Record<string, SelfCheck>) => Record<string, SelfCheck>),
  ): void;
}

export function LessonQuestionsSection({
  lesson,
  reviewMode,
  answers,
  setAnswers,
  understanding,
  setUnderstanding,
  error,
  onSave,
  onStartReview,
  onDelete,
  revealed,
  setRevealed,
  selfChecks,
  setSelfChecks,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setConfirmingDelete(false);
  }, [lesson.id, reviewMode]);

  const totalQuestions = lesson.reviewQuestions.length;
  const checkedCount = lesson.reviewQuestions.filter((q) => selfChecks[q.id]).length;

  const recallKeys = [
    "__rootCause",
    ...(lesson.whenNotApplicable ? ["__scope"] : []),
    ...lesson.reviewQuestions.map((q) => q.id),
  ];
  const recallScore = recallKeys.reduce((sum, key) => {
    if (selfChecks[key] === "got") return sum + 1;
    if (selfChecks[key] === "partial") return sum + 0.5;
    return sum;
  }, 0);
  const recallChecked = recallKeys.filter((key) => selfChecks[key]).length;

  async function submit() {
    await onSave();
  }

  return (
    <>
      <div className="mt-12 border-t border-line pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Check your understanding
          </h2>
          {totalQuestions > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
              {checkedCount} / {totalQuestions} self-checked
            </span>
          )}
        </div>
        {totalQuestions > 0 && (
          <div className="mt-3 h-px w-full bg-line">
            <div
              className="h-px bg-accent transition-[width] duration-300"
              style={{ width: `${(checkedCount / totalQuestions) * 100}%` }}
            />
          </div>
        )}
        {lesson.reviewQuestions.map((question, index) => {
          const isRevealed = Boolean(revealed[question.id]);
          const check = selfChecks[question.id];
          return (
            <div
              className="grid grid-cols-[2.5rem_1fr] gap-5 border-t border-line py-7 first:border-t-0"
              key={question.id}
            >
              <div className="font-serif text-3xl leading-none text-muted/25">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <MarkdownText className="text-base font-medium">
                  {question.question}
                </MarkdownText>
                {reviewMode && (
                  <textarea
                    className="mt-4 min-h-28 w-full border border-line bg-surface p-3 text-ink outline-none focus:border-accent"
                    value={answers[question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers({
                        ...answers,
                        [question.id]: event.target.value,
                      })
                    }
                    placeholder="Answer in your own words before revealing the expected answer"
                  />
                )}
                <button
                  className="mt-3 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.2em] text-muted transition hover:text-accent"
                  onClick={() =>
                    setRevealed((prev) => ({
                      ...prev,
                      [question.id]: !isRevealed,
                    }))
                  }
                >
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      isRevealed && "rotate-180",
                    )}
                  />
                  {isRevealed ? "Hide expected answer" : "Reveal expected answer"}
                </button>
                <div
                  className={cn(
                    "mt-4 grid transition-[grid-template-rows] duration-300 ease-out",
                    isRevealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <MarkdownText className="text-sm leading-relaxed text-muted">
                      {question.expectedAnswer}
                    </MarkdownText>
                    {reviewMode && (
                      <LessonExplanationCoverageHint
                        answer={answers[question.id] ?? ""}
                        reference={question.expectedAnswer}
                      />
                    )}
                    <LessonSelfCheckButtons
                      value={check}
                      onChange={(value) =>
                        setSelfChecks((prev) => ({
                          ...prev,
                          [question.id]: value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lesson.reviewQuestions.some((q) => q.userAnswer) && (
        <>
          <h2 className={lessonSectionHeading}>Your previous answers</h2>
          <div className="grid gap-4">
            {lesson.reviewQuestions
              .filter((q) => q.userAnswer)
              .map((q) => (
                <div className="border-l-2 border-line pl-3 text-sm text-muted" key={q.id}>
                  <p className="font-medium text-ink">{q.question}</p>
                  <p className="mt-1">{q.userAnswer}</p>
                </div>
              ))}
          </div>
        </>
      )}

      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {reviewMode ? (
        <div className="mt-8 border-t border-line pt-8">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[.15em] text-muted">
            Self-check score: {recallScore} / {recallKeys.length} ({recallChecked} /{" "}
            {recallKeys.length} checked)
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border border-line bg-surface p-2.5 text-ink outline-none focus:border-accent"
                value={understanding}
                onChange={(event) =>
                  setUnderstanding(event.target.value as Understanding | "")
                }
              >
                <option value="">Choose result</option>
                <option value="understood">Learned</option>
                <option value="partial">Not learned</option>
              </select>
              <button
                className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-page disabled:opacity-50"
                onClick={() => void submit()}
                disabled={!understanding}
              >
                Save review
              </button>
            </div>
            <LessonDeleteControl
              confirming={confirmingDelete}
              onRequest={() => setConfirmingDelete(true)}
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={onDelete}
            />
          </div>
        </div>
      ) : (
        <div className="mt-8 border-t border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[.2em] text-page"
              onClick={onStartReview}
            >
              Test my recall
            </button>
            <LessonDeleteControl
              confirming={confirmingDelete}
              onRequest={() => setConfirmingDelete(true)}
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={onDelete}
            />
          </div>
        </div>
      )}
    </>
  );
}
