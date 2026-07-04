import { ArrowLeft, Clock3, Sparkles } from "lucide-react";

interface Props {
  onBack(): void;
}

export function PracticeEmptyState({ onBack }: Props) {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="text-center">
        <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
          <Clock3 className="size-3.5" />
          Practice mode
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-accent">
            <Sparkles className="size-3.5" />
            No lessons due
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Your practice queue is empty.
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Practice opens when lessons are due. When new lessons arrive, this
          page turns into a short drill.
        </p>

        <button
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </button>
        <p className="mt-4 text-sm text-muted">
          Check the review inbox when you want practice to appear.
        </p>
      </section>
    </main>
  );
}
