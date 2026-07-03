import type { ProactiveMemoryMatch } from "@/lib/proactive-memory";

interface Props {
  matches: ProactiveMemoryMatch[];
  onOpenLesson(lessonId: string): void;
}

export function PracticeRelatedLessons({ matches, onOpenLesson }: Props) {
  return (
    <section className="rounded-3xl border border-line bg-surface/30 p-6">
      <div className="flex items-baseline justify-between gap-3 border-b border-line/70 pb-3">
        <h3 className="text-2xl font-semibold tracking-tight">
          Related lessons
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          {matches.length}
        </span>
      </div>
      <div className="mt-3 grid gap-1.5">
        {matches.length > 0 ? (
          matches.map((match, index) => (
            <button
              key={match.lesson.id}
              type="button"
              className="rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-line hover:bg-page/80 hover:text-accent"
              onClick={() => onOpenLesson(match.lesson.id)}
            >
              <span className="block text-sm font-medium leading-snug text-ink">
                {index + 1}. {match.lesson.title}
              </span>
            </button>
          ))
        ) : (
          <p className="px-1 py-2 text-sm leading-relaxed text-muted">
            No strong related lessons surfaced for this card.
          </p>
        )}
      </div>
    </section>
  );
}
