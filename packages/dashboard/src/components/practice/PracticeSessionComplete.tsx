import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  sessionTotal: number;
  onPracticeAgain(): void;
}

export function PracticeSessionComplete({ sessionTotal, onPracticeAgain }: Props) {
  return (
    <main className="mx-auto flex min-h-[72vh] max-w-4xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative w-full overflow-hidden rounded-[2rem] border border-line bg-page shadow-[0_30px_90px_-60px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-positive to-accent/40" />
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-center lg:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-positive/30 bg-positive/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-positive">
                Practice mode
              </span>
              <span className="rounded-full border border-line bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted">
                Session complete
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                You finished the practice session
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                You finished {sessionTotal} practice card
                {sessionTotal === 1 ? "" : "s"}. The normal review schedule is still updated in the
                background.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[.18em] text-muted transition hover:border-accent/40 hover:text-ink"
                onClick={onPracticeAgain}
                type="button"
              >
                <RotateCcw className="size-3.5" />
                Practice again
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent px-4 py-2.5 font-mono text-[10px] uppercase tracking-[.18em] text-page transition hover:translate-y-[-1px]"
              >
                <ArrowLeft className="size-3.5" />
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-line bg-surface/60 p-5 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.45)]">
            <div className="font-mono text-[10px] uppercase tracking-[.22em] text-muted">
              Session stats
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="text-5xl font-semibold tracking-tight text-ink">{sessionTotal}</div>
              <div className="pb-2 text-sm text-muted">
                card{sessionTotal === 1 ? "" : "s"} reviewed
              </div>
            </div>
            <div className="mt-5 grid gap-2 text-sm leading-relaxed text-muted">
              <p>Practice queue completed.</p>
              <p>Review schedule updated in the background.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
