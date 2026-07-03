import { ArrowLeft } from "lucide-react";

interface Props {
  onBack(): void;
}

export function PracticeEmptyState({ onBack }: Props) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-5xl place-items-center px-6 py-10">
      <section className="w-full max-w-2xl rounded-3xl border border-line bg-surface/40 p-6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-muted">
              Practice mode
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              No lessons to practice
            </h1>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-line bg-page px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition hover:border-accent/40 hover:text-ink"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>
        </div>
        <p className="mt-4 text-base leading-relaxed text-muted">
          There are no due lessons right now, so the practice queue is empty.
          Come back after new lessons are due, or open the dashboard to review
          recent lessons instead.
        </p>
      </section>
    </main>
  );
}
