import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Minus, X } from "lucide-react";
import { formatDate, statusColor, statusLabel } from "../format";
import { recallCoverage } from "../lib/recall";
import { CodeBlock } from "./CodeBlock";
import { MarkdownText } from "./MarkdownText";
import type { DashboardLesson, Understanding } from "../types";

type SelfCheck = "got" | "partial" | "missed";

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

const sectionHeading =
  "mt-10 mb-4 border-t border-line pt-8 text-2xl font-semibold tracking-tight";
const fieldLabel = "font-mono text-[10px] uppercase tracking-[.2em] text-muted";
const tagClass =
  "border border-line px-2 py-0.5 font-mono text-[11px] text-ink";

function SelfCheckButtons({
  value,
  onChange,
}: {
  value?: SelfCheck;
  onChange(value: SelfCheck): void;
}) {
  const base =
    "flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition";
  return (
    <div className="mt-3 mb-1 flex gap-5 font-mono text-[10px] uppercase tracking-[.2em]">
      <button
        className={`${base} ${value === "got" ? "text-positive" : "text-muted hover:text-ink"}`}
        onClick={() => onChange("got")}
      >
        <Check className="size-3" /> Nailed it
      </button>
      <button
        className={`${base} ${value === "partial" ? "text-accent" : "text-muted hover:text-ink"}`}
        onClick={() => onChange("partial")}
      >
        <Minus className="size-3" /> Partly
      </button>
      <button
        className={`${base} ${value === "missed" ? "text-danger" : "text-muted hover:text-ink"}`}
        onClick={() => onChange("missed")}
      >
        <X className="size-3" /> Missed it
      </button>
    </div>
  );
}

/**
 * Compares a free-text recall answer against the reference text it's being
 * checked against, and gives a self-assessment nudge - not a grade.
 */
function ExplanationCoverageHint({
  answer,
  reference,
}: {
  answer: string;
  reference: string;
}) {
  const trimmed = answer.trim();
  if (!trimmed) return null;

  if (trimmed.split(/\s+/).length < 4) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-muted italic">
        That&rsquo;s a short answer - before you self-check, try writing a full sentence explaining
        the reasoning, not just naming the topic.
      </p>
    );
  }

  const { ratio, missingTerms, hasSignal } = recallCoverage(trimmed, reference);
  if (!hasSignal || ratio >= 0.5) return null;

  return (
    <p className="mt-3 text-sm leading-relaxed text-muted italic">
      Your answer may not cover: {missingTerms.slice(0, 4).join(", ")}. Re-read the explanation
      above - if your reasoning gets to the same idea in different words, "Nailed it" is still
      fair, but if it doesn&rsquo;t, mark this "Partly" or "Missed it" instead.
    </p>
  );
}

interface RecallToggleProps {
  prompt: string;
  reveal: ReactNode;
  /** Plain-text version of `reveal`, compared against `answer` for a self-assessment hint. */
  referenceText: string;
  reviewMode: boolean;
  answer: string;
  onAnswerChange(value: string): void;
  revealed: boolean;
  onToggleReveal(): void;
  check?: SelfCheck;
  onCheck(value: SelfCheck): void;
}

/**
 * In review mode, hides `reveal` behind a recall prompt so the developer has
 * to attempt an answer before seeing the lesson's content. Outside review
 * mode, `reveal` is shown directly.
 */
function RecallToggle({
  prompt,
  reveal,
  referenceText,
  reviewMode,
  answer,
  onAnswerChange,
  revealed,
  onToggleReveal,
  check,
  onCheck,
}: RecallToggleProps) {
  if (!reviewMode) return <>{reveal}</>;

  return (
    <div>
      <p className="text-base leading-relaxed text-muted">{prompt}</p>
      <textarea
        className="mt-3 min-h-24 w-full border border-line bg-surface p-3 text-ink outline-none focus:border-accent"
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        placeholder="Answer in your own words before revealing"
      />
      <button
        className="mt-3 flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 font-mono text-[10px] uppercase tracking-[.2em] text-muted transition hover:text-accent"
        onClick={onToggleReveal}
      >
        <ChevronDown
          className={`size-3 transition-transform ${revealed ? "rotate-180" : ""}`}
        />
        {revealed ? "Hide" : "Reveal"}
      </button>
      <div
        className={`mt-3 grid transition-[grid-template-rows] duration-300 ease-out ${
          revealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {reveal}
          <ExplanationCoverageHint answer={answer} reference={referenceText} />
          <SelfCheckButtons value={check} onChange={onCheck} />
        </div>
      </div>
    </div>
  );
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [selfChecks, setSelfChecks] = useState<Record<string, SelfCheck>>({});

  useEffect(() => {
    setAnswers({});
    setUnderstanding("");
    setError("");
    setConfirmingDelete(false);
    setRevealed({});
    setSelfChecks({});
  }, [lesson?.id, reviewMode]);

  if (!lesson) {
    return (
      <section className="mt-10 border border-line bg-page p-8 text-ink">
        <button
          className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-muted hover:text-ink"
          onClick={onBack}
        >
          &larr; All lessons
        </button>
        <h1 className="mt-6 font-serif text-3xl font-bold tracking-tight">
          Lesson not found
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          The lesson may have been deleted, or the link no longer points to a valid id.
        </p>
      </section>
    );
  }

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
  const hasBothExamples = Boolean(
    lesson.badCodeExample && (lesson.goodCodeExample || lesson.codeExample),
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

  const totalQuestions = lesson.reviewQuestions.length;
  const checkedCount = lesson.reviewQuestions.filter(
    (q) => selfChecks[q.id],
  ).length;

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

  return (
    <section className="mt-10 border border-line bg-page text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-line px-9 py-4 max-sm:px-5">
        <button
          className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-muted hover:text-ink"
          onClick={onBack}
        >
          &larr; All lessons
        </button>
        <button
          className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
          onClick={onBack}
          aria-label="Back to all lessons"
        >
          <X className="size-5" />
        </button>
      </div>

      <article className="px-9 py-8 max-sm:px-5 max-sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{lesson.displayPattern}</span>
            <span>&middot;</span>
            <span>{formatDate(lesson.createdAt)}</span>
            <span>&middot;</span>
            <span>{lesson.tool}</span>
          </div>
          <span className={`flex items-center gap-1.5 ${statusColor(lesson.understanding)}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {statusLabel(lesson.understanding)}
          </span>
        </div>

        <h1 className="mt-3 font-serif text-4xl leading-tight font-bold tracking-tight max-sm:text-3xl">
          {lesson.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">
          {lesson.displayTakeaway}
        </p>

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

        {lesson.originalPrompt && (
          <>
            <h2 className={sectionHeading}>The prompt</h2>
            <MarkdownText className="border-l-2 border-line pl-4 text-base leading-relaxed text-muted italic">
              {lesson.originalPrompt}
            </MarkdownText>
          </>
        )}

        <h2 className={sectionHeading}>What broke</h2>
        <MarkdownText className="text-base leading-relaxed">{lesson.problem}</MarkdownText>

        <h2 className={sectionHeading}>Why it happened</h2>
        <RecallToggle
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
                <div className={fieldLabel}>What went wrong</div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">{lesson.mistake}</MarkdownText>
              </div>
              <div>
                <div className={fieldLabel}>Root cause</div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">{lesson.rootCause}</MarkdownText>
              </div>
              <div>
                <div className={fieldLabel}>Why the fix works</div>
                <MarkdownText className="mt-1.5 text-base leading-relaxed">{lesson.fixSummary}</MarkdownText>
              </div>
            </div>
          }
        />

        <h2 className={sectionHeading}>Broken and corrected code</h2>
        {hasCode ? (
          <>
            <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
              <CodeBlock
                label="Broken approach"
                value={broken}
                compareWith={hasBothExamples ? corrected : undefined}
                kind="bad"
                filesChanged={lesson.filesChanged}
              />
              <CodeBlock
                label="Correct approach"
                value={corrected}
                compareWith={hasBothExamples ? broken : undefined}
                kind="good"
                filesChanged={lesson.filesChanged}
              />
            </div>
            {lesson.codeExplanation && (
              <div className="mt-5">
                <div className={fieldLabel}>Key difference</div>
                  <MarkdownText className="mt-1.5 text-base leading-relaxed">{lesson.codeExplanation}</MarkdownText>
              </div>
            )}
          </>
        ) : (
          <p className="text-base leading-relaxed text-muted">
            No useful code comparison was captured for this lesson.
          </p>
        )}

        <h2 className={sectionHeading}>When this doesn&rsquo;t apply</h2>
        {lesson.whenNotApplicable ? (
          <RecallToggle
            prompt="Before reading on: in what situation would this lesson's advice be wrong or unnecessary?"
            referenceText={lesson.whenNotApplicable}
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
              <MarkdownText className="text-base leading-relaxed">{lesson.whenNotApplicable}</MarkdownText>
            }
          />
        ) : (
          <p className="text-base leading-relaxed">
            Not captured for this lesson.
          </p>
        )}

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
                  <MarkdownText className="text-base font-medium">{question.question}</MarkdownText>
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
                      setRevealed((prev) => ({
                        ...prev,
                        [question.id]: !isRevealed,
                      }))
                    }
                  >
                    <ChevronDown
                      className={`size-3 transition-transform ${isRevealed ? "rotate-180" : ""}`}
                    />
                    {isRevealed
                      ? "Hide expected answer"
                      : "Reveal expected answer"}
                  </button>
                  <div
                    className={`mt-3 grid transition-[grid-template-rows] duration-300 ease-out ${
                      isRevealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <MarkdownText className="text-sm leading-relaxed text-muted">
                        {question.expectedAnswer}
                      </MarkdownText>
                      {reviewMode && (
                        <ExplanationCoverageHint
                          answer={answers[question.id] ?? ""}
                          reference={question.expectedAnswer}
                        />
                      )}
                      <SelfCheckButtons
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
            <h2 className={sectionHeading}>Your previous answers</h2>
            <div className="grid gap-4">
              {lesson.reviewQuestions
                .filter((q) => q.userAnswer)
                .map((q) => (
                  <div
                    className="border-l-2 border-line pl-3 text-sm text-muted"
                    key={q.id}
                  >
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
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[.15em] text-muted">
              Self-check score: {recallScore} / {recallKeys.length} ({recallChecked} / {recallKeys.length} checked)
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
                  className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page"
                  onClick={() => void submit()}
                >
                  Save review
                </button>
              </div>
              <DeleteControl
                confirming={confirmingDelete}
                onRequest={() => setConfirmingDelete(true)}
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => onDelete(lesson.id)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-8 border-t border-line pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                className="cursor-pointer border-0 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page"
                onClick={onStartReview}
              >
                Test my recall
              </button>
              <DeleteControl
                confirming={confirmingDelete}
                onRequest={() => setConfirmingDelete(true)}
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => onDelete(lesson.id)}
              />
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

interface DeleteControlProps {
  confirming: boolean;
  onRequest(): void;
  onCancel(): void;
  onConfirm(): void;
}

function DeleteControl({
  confirming,
  onRequest,
  onCancel,
  onConfirm,
}: DeleteControlProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirming) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [confirming]);

  return (
    <>
      <button
        className="cursor-pointer border-0 bg-transparent p-0 font-mono text-[11px] uppercase tracking-[.2em] text-muted hover:text-danger"
        onClick={onRequest}
      >
        Delete lesson
      </button>
      <dialog
        ref={dialogRef}
        className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-line bg-page p-6 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]"
        onClose={onCancel}
        onClick={(event) => {
          if (event.target === dialogRef.current) onCancel();
        }}
      >
        <p className="text-base leading-relaxed">
          Delete this lesson? This can&rsquo;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-5 font-mono text-[11px] uppercase tracking-[.2em]">
          <button
            className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="cursor-pointer border-0 bg-transparent p-0 font-bold text-danger hover:underline"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </dialog>
    </>
  );
}
