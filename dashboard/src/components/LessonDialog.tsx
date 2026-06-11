import { useEffect, useRef, useState } from "react";
import { formatDate, reviewAction } from "../format";
import { computeCompleteness, completenessColor } from "../completeness";
import { CodeBlock } from "./CodeBlock";
import type { DashboardLesson, Understanding } from "../types";

interface Props {
  lesson: DashboardLesson | null;
  reviewMode: boolean;
  onClose(): void;
  onStartReview(): void;
  onSave(answers: Record<string, string>, understanding: Understanding): Promise<void>;
  onDelete(id: string): void;
}

export function LessonDialog({ lesson, reviewMode, onClose, onStartReview, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [understanding, setUnderstanding] = useState<Understanding | "">("");
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (lesson) dialogRef.current?.showModal(); else dialogRef.current?.close();
    setAnswers({}); setUnderstanding(""); setError(""); setConfirmingDelete(false);
  }, [lesson, reviewMode]);

  if (!lesson) return <dialog ref={dialogRef} />;

  const broken = lesson.badCodeExample ?? "A broken example was not captured for this lesson.";
  const corrected = lesson.goodCodeExample ?? lesson.codeExample ?? "A corrected example was not captured for this lesson.";
  const hasCode = Boolean(lesson.badCodeExample || lesson.goodCodeExample || lesson.codeExample);

  async function submit() {
    if (!understanding) { setError("Choose how well you understand the lesson."); return; }
    try { await onSave(answers, understanding); } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
  }

  const sectionLink = "block rounded-lg p-2 text-xs text-muted no-underline hover:bg-[#182028] hover:text-ink";
  const callout = "my-3 rounded-2xl border border-line bg-[#11171d] px-4 py-4 leading-relaxed";
  const fieldLabel = "mb-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted";

  const { score, checks } = computeCompleteness(lesson);
  const cColor = completenessColor(score);
  const barClass = cColor === "green" ? "bg-mint" : cColor === "yellow" ? "bg-warn" : "bg-danger";

  return (
    <dialog
      className="fixed left-1/2 top-1/2 z-50 h-[min(90vh,900px)] w-[min(1050px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-[#34414e] bg-[#0b0e12] p-0 text-ink shadow-[0_40px_120px_#000]"
      ref={dialogRef}
      onClose={onClose}
    >
      <div className="grid h-full grid-cols-[235px_1fr] max-[950px]:grid-cols-1">
        {/* Sidebar */}
        <aside className="border-r border-line bg-[#0e1318] px-4 py-6 max-[950px]:hidden overflow-auto">
          <button className="mb-6 cursor-pointer border-0 bg-transparent text-muted" onClick={onClose}>&larr; Back to lessons</button>
          <a className={sectionLink} href="#remember">What to remember</a>
          <a className={sectionLink} href="#cause">Why it happened</a>
          <a className={sectionLink} href="#examples">Code comparison</a>
          <a className={sectionLink} href="#practice">Practice</a>
          <a className={sectionLink} href="#recall">Recall review</a>
          <div className="mt-6 border-t border-line pt-5 text-[11px] leading-loose text-muted">
            <strong>{lesson.displayPattern}</strong><br />
            {lesson.tool}<br />
            {formatDate(lesson.createdAt)}<br />
            {lesson.reviewCount} completed review{lesson.reviewCount === 1 ? "" : "s"}<br />
            {reviewAction(lesson.nextReviewAt)}
          </div>
          {/* Completeness panel */}
          <div className="mt-5 border-t border-line pt-4">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-muted">Lesson completeness</div>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#242d37]">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${score}%` }} />
              </div>
              <span className="text-[11px] font-bold">{score}%</span>
            </div>
            <div className="grid gap-1">
              {checks.map((check) => (
                <div key={check.label} className="flex items-center gap-1.5 text-[10px]">
                  <span className={check.passed ? "text-mint" : "text-muted"}>{check.passed ? "✓" : "○"}</span>
                  <span className={check.passed ? "text-ink" : "text-muted"}>{check.label}</span>
                  {!check.passed && <span className="text-[9px] text-danger">+{check.max}</span>}
                </div>
              ))}
            </div>
          </div>
          {/* Delete lesson */}
          <div className="mt-5 border-t border-line pt-4">
            {confirmingDelete ? (
              <div className="rounded-lg border border-danger/40 bg-[#241319] p-3 text-[11px]">
                <p className="mb-2 text-ink">Delete this lesson? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    className="cursor-pointer rounded-md border-0 bg-danger px-2 py-1 font-bold text-[#2a0b0b]"
                    onClick={() => onDelete(lesson.id)}
                  >
                    Confirm delete
                  </button>
                  <button
                    className="cursor-pointer rounded-md border border-line bg-transparent px-2 py-1 text-muted"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="cursor-pointer border-0 bg-transparent text-[11px] text-danger"
                onClick={() => setConfirmingDelete(true)}
              >
                Delete lesson
              </button>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="overflow-auto px-10 pt-9 pb-16 max-sm:px-4 max-sm:pt-6">

          {/* What to remember */}
          <section id="remember">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-mint">What to remember</div>
            <h1 className="my-3 text-4xl font-bold tracking-tight max-sm:text-3xl">{lesson.title}</h1>
            <p className="text-lg leading-relaxed">{lesson.displayTakeaway}</p>
            {/* Concept badges */}
            <div className="flex flex-wrap items-center gap-2">
              {lesson.concepts.map((concept) => (
                <span className="rounded-full border border-[#243e54] bg-[#142333] px-2 py-1 text-[10px] text-sky" key={concept}>{concept}</span>
              ))}
            </div>
            {/* Tag chips with optional doc links */}
            {lesson.tags && lesson.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {lesson.tags.map((tag) =>
                  tag.url ? (
                    <a
                      key={tag.name}
                      href={tag.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-[#3a4e3a] bg-[#162016] px-2 py-1 text-[10px] text-mint no-underline hover:border-mint"
                    >
                      {tag.name}
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                        <path d="M1 8L8 1M8 1H3M8 1V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </a>
                  ) : (
                    <span key={tag.name} className="rounded-full border border-[#3a4e3a] bg-[#162016] px-2 py-1 text-[10px] text-mint">
                      {tag.name}
                    </span>
                  )
                )}
              </div>
            )}
            {/* Original prompt (collapsed) */}
            {lesson.originalPrompt && (
              <details className="mt-3 rounded-xl border border-line bg-[#0e1318] px-3 py-2 text-[12px] text-muted">
                <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[.12em]">Original question</summary>
                <p className="mt-2 leading-relaxed">{lesson.originalPrompt}</p>
              </details>
            )}
          </section>

          {/* What broke */}
          <h2 className="mt-10 mb-3 text-xl font-semibold">What broke</h2>
          <div className={`${callout} border-l-[3px] border-l-danger`}>{lesson.problem}</div>

          {/* Why it happened — mistake → root cause → fix */}
          <h2 className="mt-10 mb-3 text-xl font-semibold" id="cause">Why it happened</h2>
          <div className={`${callout} border-l-[3px] border-l-danger`}>
            <div className={fieldLabel}>What went wrong</div>
            {lesson.mistake}
          </div>
          <div className={`${callout} border-l-[3px] border-l-warn`}>
            <div className={fieldLabel}>Root cause</div>
            {lesson.rootCause}
          </div>
          <div className={`${callout} border-l-[3px] border-l-mint`}>
            <div className={fieldLabel}>Why the fix works</div>
            {lesson.fixSummary}
          </div>

          {/* Code comparison */}
          <h2 className="mt-10 mb-3 text-xl font-semibold" id="examples">Broken and corrected code</h2>
          {hasCode ? (
            <>
              <div className="grid grid-cols-2 gap-3 max-[950px]:grid-cols-1">
                <CodeBlock label="Broken approach" value={broken} kind="bad" filesChanged={lesson.filesChanged} />
                <CodeBlock label="Correct approach" value={corrected} kind="good" filesChanged={lesson.filesChanged} />
              </div>
              {lesson.codeExplanation && (
                <div className={`${callout} border-l-[3px] border-l-sky bg-[#101d28]`}>
                  <div className={fieldLabel}>Key difference</div>
                  {lesson.codeExplanation}
                </div>
              )}
            </>
          ) : (
            <div className={callout}>No useful code comparison was captured for this lesson.</div>
          )}

          {/* Practice */}
          <h2 className="mt-10 mb-3 text-xl font-semibold" id="practice">Try it yourself</h2>
          <div className="rounded-2xl border border-dashed border-[#4a6c60] bg-[#102019] p-5">
            <strong>Practice task</strong>
            <p>{lesson.practiceTask ?? "Recreate the smallest version of this mistake, then correct it without looking at the original fix."}</p>
          </div>

          {/* Files involved */}
          {lesson.filesChanged.length > 0 && (
            <>
              <h2 className="mt-10 mb-3 text-xl font-semibold">Files involved</h2>
              <div>
                {lesson.filesChanged.map((file) => (
                  <span className="m-1 inline-block rounded-md bg-[#121a22] px-2 py-1 font-mono text-[11px] text-[#b6c6d6]" key={file}>{file}</span>
                ))}
              </div>
            </>
          )}

          {/* Recall review */}
          <h2 className="mt-10 mb-3 text-xl font-semibold" id="recall">Check your understanding</h2>
          {lesson.reviewQuestions.map((question) => (
            <div className="my-3 rounded-2xl border border-line bg-[#11171d] p-4" key={question.id}>
              <strong>{question.question}</strong>
              {reviewMode && (
                <textarea
                  className="mt-3 min-h-24 w-full rounded-xl border border-line bg-[#080b0f] p-3 text-ink"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                  placeholder="Answer in your own words before revealing the expected answer"
                />
              )}
              <details className="mt-3 text-[13px] text-muted">
                <summary>Reveal expected answer</summary>
                <p>{question.expectedAnswer}</p>
              </details>
            </div>
          ))}

          {/* Previous answers */}
          {lesson.reviewQuestions.some((q) => q.userAnswer) && (
            <>
              <h2 className="mt-10 mb-3 text-xl font-semibold">Your previous answers</h2>
              {lesson.reviewQuestions.filter((q) => q.userAnswer).map((q) => (
                <div className="mt-3 border-l-2 border-[#34414e] pl-3 text-xs text-muted" key={q.id}>
                  <strong>{q.question}</strong><br />{q.userAnswer}
                </div>
              ))}
            </>
          )}

          {error && <p className="text-danger">{error}</p>}

          {reviewMode ? (
            <div className="mt-5 flex items-center gap-3">
              <select
                className="rounded-lg border border-line bg-[#11171d] p-2.5 text-ink"
                value={understanding}
                onChange={(event) => setUnderstanding(event.target.value as Understanding | "")}
              >
                <option value="">Choose your understanding</option>
                <option value="understood">I understand it</option>
                <option value="partial">I partly understand it</option>
                <option value="copied_blindly">I need more practice</option>
              </select>
              <button className="cursor-pointer rounded-lg border-0 bg-mint px-3 py-2 font-extrabold text-[#05251b]" onClick={() => void submit()}>
                Save review
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <button className="cursor-pointer rounded-lg border-0 bg-mint px-3 py-2 font-extrabold text-[#05251b]" onClick={onStartReview}>
                Test my recall
              </button>
            </div>
          )}
        </main>
      </div>
    </dialog>
  );
}
