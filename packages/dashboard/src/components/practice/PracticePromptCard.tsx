import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarkdownText } from "@/components/shared/MarkdownText";
import { cn } from "@/components/shared/cn";
import type { PracticeCard } from "@/lib/practice";
import type { Understanding } from "@/lib/types";

export type PracticeMcqFeedback = "correct" | "wrong" | null;

interface Props {
  card: PracticeCard;
  progress: number;
  sessionTotal: number;
  answer: string;
  selectedChoice: string;
  revealed: boolean;
  mcqFeedback: PracticeMcqFeedback;
  saving: boolean;
  sessionError: string;
  onAnswerChange(answer: string): void;
  onReveal(): void;
  onSelectChoice(choice: string): void;
  onSaveUnderstanding(result: Understanding): void;
  onAdvanceMcq(): void;
}

export function PracticePromptCard({
  card,
  progress,
  sessionTotal,
  answer,
  selectedChoice,
  revealed,
  mcqFeedback,
  saving,
  sessionError,
  onAnswerChange,
  onReveal,
  onSelectChoice,
  onSaveUnderstanding,
  onAdvanceMcq,
}: Props) {
  return (
    <section className="rounded-3xl border border-line bg-page p-6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-muted">
              Practice prompt
            </p>
            <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] tracking-[.18em] text-muted">
              {progress} / {sessionTotal}
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {card.question.question}
          </h2>
        </div>
        <span className="inline-flex items-center rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
          {card.mode === "mcq" ? "Multiple choice" : "Free response"}
        </span>
      </div>

      <div className="mt-6">
        {!revealed && card.mode === "free" && (
          <textarea
            className="mt-4 min-h-32 w-full resize-none border border-line bg-surface p-3 text-ink outline-none focus:border-accent"
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Write your answer before revealing the explanation"
          />
        )}

        {card.mode === "mcq" && (
          <div className="mt-4 grid gap-3">
            {card.options.map((option, index) => {
              const selected = selectedChoice === option;
              const isCorrectAnswer =
                normalizeText(option) ===
                normalizeText(card.question.expectedAnswer);
              const isWrongSelection = mcqFeedback === "wrong" && selected;
              const isCorrectSelection = mcqFeedback === "correct" && selected;
              const isRevealedAnswer = mcqFeedback !== null && isCorrectAnswer;
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    isCorrectSelection || isRevealedAnswer
                      ? "border-positive/60 bg-positive/10 text-positive"
                      : isWrongSelection
                        ? "border-danger/60 bg-danger/10 text-danger"
                        : selected
                          ? "border-accent/50 bg-accent/10 text-ink"
                          : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink",
                  )}
                  onClick={() => onSelectChoice(option)}
                  disabled={saving || mcqFeedback !== null}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[.18em]">
                    {index + 1}.
                  </div>
                  <div className="mt-1 text-sm leading-relaxed">{option}</div>
                </button>
              );
            })}
          </div>
        )}

        {revealed && <RevealPanel card={card} />}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {!revealed && card.mode === "free" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-accent/30 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page transition hover:translate-y-[-1px]"
              onClick={onReveal}
            >
              Reveal answer
              <ArrowRight className="size-3.5" />
            </button>
          ) : card.mode === "free" ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-positive/30 bg-positive/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-positive transition hover:border-positive/50"
                onClick={() => onSaveUnderstanding("understood")}
                disabled={saving}
              >
                <CheckCircle2 className="size-3.5" />
                Nailed it
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-accent transition hover:border-accent/50"
                onClick={() => onSaveUnderstanding("partial")}
                disabled={saving}
              >
                Partly
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 border border-danger/30 bg-danger/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-danger transition hover:border-danger/50"
                onClick={() => onSaveUnderstanding("copied_blindly")}
                disabled={saving}
              >
                Missed it
              </button>
            </>
          ) : mcqFeedback ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 border border-accent/30 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[.2em] text-page transition hover:translate-y-[-1px]"
              onClick={onAdvanceMcq}
              disabled={saving}
            >
              Save and next
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}
        </div>

        {sessionError && (
          <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {sessionError}
          </p>
        )}
      </div>
    </section>
  );
}

function RevealPanel({ card }: { card: PracticeCard }) {
  return (
    <div className="mt-6 grid gap-5 rounded-2xl border border-line bg-surface/60 p-5">
      {card.mode === "free" && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
            Expected answer
          </div>
          <MarkdownText className="mt-1.5 text-sm leading-relaxed text-ink">
            {card.question.expectedAnswer}
          </MarkdownText>
        </div>
      )}
      {card.lesson.whenNotApplicable && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
            When this does not apply
          </div>
          <MarkdownText className="mt-1.5 text-sm leading-relaxed text-muted">
            {card.lesson.whenNotApplicable}
          </MarkdownText>
        </div>
      )}
    </div>
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
