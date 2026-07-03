import { type ReactNode } from "react";
import { Check, ChevronDown, Minus, X } from "lucide-react";
import { cn } from "@/components/shared/cn";
import { recallCoverage } from "@/lib/recall";

export type SelfCheck = "got" | "partial" | "missed";

export function LessonSelfCheckButtons({
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
        className={cn(base, value === "got" ? "text-positive" : "text-muted hover:text-ink")}
        onClick={() => onChange("got")}
      >
        <Check className="size-3" /> Nailed it
      </button>
      <button
        className={cn(
          base,
          value === "partial" ? "text-accent" : "text-muted hover:text-ink",
        )}
        onClick={() => onChange("partial")}
      >
        <Minus className="size-3" /> Partly
      </button>
      <button
        className={cn(base, value === "missed" ? "text-danger" : "text-muted hover:text-ink")}
        onClick={() => onChange("missed")}
      >
        <X className="size-3" /> Missed it
      </button>
    </div>
  );
}

export function LessonExplanationCoverageHint({
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

export interface LessonRecallBlockProps {
  title: string;
  prompt: string;
  referenceText: string;
  reviewMode: boolean;
  answer: string;
  onAnswerChange(value: string): void;
  revealed: boolean;
  onToggleReveal(): void;
  check?: SelfCheck;
  onCheck(value: SelfCheck): void;
  reveal: ReactNode;
}

export function LessonRecallBlock({
  title,
  prompt,
  referenceText,
  reviewMode,
  answer,
  onAnswerChange,
  revealed,
  onToggleReveal,
  check,
  onCheck,
  reveal,
}: LessonRecallBlockProps) {
  if (!reviewMode) {
    return (
      <>
        <h2 className="mt-10 mb-4 border-t border-line pt-8 text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {reveal}
      </>
    );
  }

  return (
    <>
      <h2 className="mt-10 mb-4 border-t border-line pt-8 text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      <div>
        <p className="text-sm leading-relaxed text-muted">{prompt}</p>
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
            className={cn("size-3 transition-transform", revealed && "rotate-180")}
          />
          {revealed ? "Hide" : "Reveal"}
        </button>
        <div
          className={cn(
            "mt-3 grid transition-[grid-template-rows] duration-300 ease-out",
            revealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            {reveal}
            <LessonExplanationCoverageHint answer={answer} reference={referenceText} />
            <LessonSelfCheckButtons value={check} onChange={onCheck} />
          </div>
        </div>
      </div>
    </>
  );
}
