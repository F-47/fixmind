import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { formatDate, reviewAction } from "../format";
import { computeCompleteness } from "../completeness";
import { CodeBlock } from "./CodeBlock";
import type { DashboardLesson, Understanding } from "../types";

interface Props {
  lesson: DashboardLesson | null;
  reviewMode: boolean;
  onClose(): void;
  onStartReview(): void;
  onSave(
    answers: Record<string, string>,
    understanding: Understanding,
  ): Promise<void>;
  onDelete(id: string): void;
}

const sectionHeading =
  "mt-10 mb-4 border-t border-line pt-8 text-2xl font-semibold tracking-tight";
const fieldLabel = "font-mono text-[10px] uppercase tracking-[.2em] text-muted";
const tagClass = "border border-line px-2 py-0.5 font-mono text-[11px] text-ink";

export function LessonDialog({
  lesson,
  reviewMode,
  onClose,
  onStartReview,
  onSave,
  onDelete,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [understanding, setUnderstanding] = useState<Understanding | "">("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selfChecks, setSelfChecks] = useState<Record<string, "got" | "missed">>({});

  useEffect(() => {
    if (lesson) dialogRef.current?.showModal();
    else dialogRef.current?.close();
    setAnswers({});
    setUnderstanding("");
    setError("");
    setConfirmingDelete(false);
    setRevealed({});
    setSelfChecks({});
  }, [lesson, reviewMode]);

  if (!lesson) return <dialog ref={dialogRef} />;

  const broken =
    lesson.badCodeExample ??
    "A broken example was not captured for this lesson.";
  const corrected =
    lesson.goodCodeExample ??
    lesson.codeExample ??
    "A corrected example was not captured for this lesson.";
  const hasCode = Boolean(
    lesson.badCodeExample || lesson.goodCodeExample || lesson.codeExample,
  );

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

  const { score } = computeCompleteness(lesson);
  const totalQuestions = lesson.reviewQuestions.length;
  const checkedCount = lesson.reviewQuestions.filter((q) => selfChecks[q.id]).length;
  const gotCount = lesson.reviewQuestions.filter((q) => selfChecks[q.id] === "got").length;

  return (
    <dialog
      className="fixed top-1/2 left-1/2 z-50 h-[min(92vh,900px)] w-[min(760px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-line bg-page p-0 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]"
      ref={dialogRef}
      onClose={onClose}
    >
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-line px-9 py-4 max-sm:px-5">
          <button
            className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-muted hover:text-ink"
            onClick={onClose}
          >
            &larr; All lessons
          </button>
          {confirmingDelete ? (
            <span className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[.2em]">
              <span className="text-muted">Delete this lesson?</span>
              <button
                className="cursor-pointer border-0 bg-transparent p-0 font-bold text-danger hover:underline"
                onClick={() => onDelete(lesson.id)}
              >
                Confirm
              </button>
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:underline"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-muted hover:text-danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          )}
        </div>

        {/* Article */}
        <article className="overflow-auto px-9 py-8 max-sm:px-5 max-sm:py-6">
          {/* Byline */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
            <span>{lesson.displayPattern}</span>
            <span>&middot;</span>
            <span>{lesson.tool}</span>
            <span>&middot;</span>
            <span>{formatDate(lesson.createdAt)}</span>
            <span className="ml-auto">{score}% complete</span>
          </div>

          <h1 className="mt-3 font-serif text-4xl leading-tight font-bold tracking-tight max-sm:text-3xl">
            {lesson.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            {lesson.displayTakeaway}
          </p>

          {/* Concepts and tags */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {lesson.concepts.map((concept) => (
              <span className={tagClass} key={concept}>
                {concept}
              </span>
            ))}
            {lesson.tags?.map((tag) =>
              tag.url ? (
                <a
                  key={tag.name}
                  href={tag.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${tagClass} text-accent no-underline hover:border-accent`}
                >
                  {tag.name} &#8599;
                </a>
              ) : (
                <span className={`${tagClass} text-accent`} key={tag.name}>
                  {tag.name}
                </span>
              ),
            )}
          </div>

          {/* Status line */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
            <span>
              {lesson.reviewCount} review{lesson.reviewCount === 1 ? "" : "s"}{" "}
              completed
            </span>
            <span>&middot;</span>
            <span>{reviewAction(lesson.nextReviewAt)}</span>
          </div>

          {/* Original prompt */}
          {lesson.originalPrompt && (
            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Original question
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {lesson.originalPrompt}
              </p>
            </details>
          )}

          {/* What broke */}
          <h2 className={sectionHeading}>What broke</h2>
          <p className="text-base leading-relaxed">{lesson.problem}</p>

          {/* Why it happened */}
          <h2 className={sectionHeading}>Why it happened</h2>
          <div className="grid gap-5">
            <div>
              <div className={fieldLabel}>What went wrong</div>
              <p className="mt-1.5 text-base leading-relaxed">{lesson.mistake}</p>
            </div>
            <div>
              <div className={fieldLabel}>Root cause</div>
              <p className="mt-1.5 text-base leading-relaxed">{lesson.rootCause}</p>
            </div>
            <div>
              <div className={fieldLabel}>Why the fix works</div>
              <p className="mt-1.5 text-base leading-relaxed">{lesson.fixSummary}</p>
            </div>
          </div>

          {/* Code comparison */}
          <h2 className={sectionHeading}>Broken and corrected code</h2>
          {hasCode ? (
            <>
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <CodeBlock
                  label="Broken approach"
                  value={broken}
                  kind="bad"
                  filesChanged={lesson.filesChanged}
                />
                <CodeBlock
                  label="Correct approach"
                  value={corrected}
                  kind="good"
                  filesChanged={lesson.filesChanged}
                />
              </div>
              {lesson.codeExplanation && (
                <div className="mt-5">
                  <div className={fieldLabel}>Key difference</div>
                  <p className="mt-1.5 text-base leading-relaxed">
                    {lesson.codeExplanation}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-base leading-relaxed text-muted">
              No useful code comparison was captured for this lesson.
            </p>
          )}

          {/* Practice */}
          <h2 className={sectionHeading}>Try it yourself</h2>
          <div className="border border-dashed border-line p-5">
            <div className={`${fieldLabel} text-positive`}>Practice task</div>
            <p className="mt-1.5 text-base leading-relaxed">
              {lesson.practiceTask ??
                "Recreate the smallest version of this mistake, then correct it without looking at the original fix."}
            </p>
          </div>

          {/* Files involved */}
          {lesson.filesChanged.length > 0 && (
            <>
              <h2 className={sectionHeading}>Files involved</h2>
              <div className="flex flex-wrap gap-2">
                {lesson.filesChanged.map((file) => (
                  <span className={tagClass} key={file}>
                    {file}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Recall review */}
          <div className="mt-10 border-t border-line pt-8">
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
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line py-6 first:border-t-0"
                  key={question.id}
                >
                  <div className="font-serif text-3xl leading-none text-muted/30">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <p className="text-base font-medium">{question.question}</p>
                    {reviewMode && (
                      <textarea
                        className="mt-3 min-h-24 w-full border border-line bg-surface p-3 text-ink outline-none focus:border-accent"
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
                        setRevealed((prev) => ({ ...prev, [question.id]: !isRevealed }))
                      }
                    >
                      <ChevronDown
                        className={`size-3 transition-transform ${isRevealed ? "rotate-180" : ""}`}
                      />
                      {isRevealed ? "Hide expected answer" : "Reveal expected answer"}
                    </button>
                    <div
                      className={`mt-3 grid transition-[grid-template-rows] duration-300 ease-out ${
                        isRevealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-sm leading-relaxed text-muted">
                          {question.expectedAnswer}
                        </p>
                        <div className="mt-3 mb-1 flex gap-5 font-mono text-[10px] uppercase tracking-[.2em]">
                          <button
                            className={`flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition ${
                              check === "got" ? "text-positive" : "text-muted hover:text-ink"
                            }`}
                            onClick={() =>
                              setSelfChecks((prev) => ({ ...prev, [question.id]: "got" }))
                            }
                          >
                            <Check className="size-3" /> Got it
                          </button>
                          <button
                            className={`flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition ${
                              check === "missed" ? "text-danger" : "text-muted hover:text-ink"
                            }`}
                            onClick={() =>
                              setSelfChecks((prev) => ({ ...prev, [question.id]: "missed" }))
                            }
                          >
                            <X className="size-3" /> Missed it
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Previous answers */}
          {lesson.reviewQuestions.some((q) => q.userAnswer) && (
            <>
              <h2 className={sectionHeading}>Your previous answers</h2>
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
              {totalQuestions > 0 && (
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[.15em] text-muted">
                  Self-check: {gotCount} / {totalQuestions} got it
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="border border-line bg-surface p-2.5 text-ink outline-none focus:border-accent"
                  value={understanding}
                  onChange={(event) =>
                    setUnderstanding(event.target.value as Understanding | "")
                  }
                >
                  <option value="">Choose your understanding</option>
                  <option value="understood">I understand it</option>
                  <option value="partial">I partly understand it</option>
                  <option value="copied_blindly">I need more practice</option>
                </select>
                <button
                  className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page"
                  onClick={() => void submit()}
                >
                  Save review
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 border-t border-line pt-8">
              <button
                className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page"
                onClick={onStartReview}
              >
                Test my recall
              </button>
            </div>
          )}
        </article>
      </div>
    </dialog>
  );
}
