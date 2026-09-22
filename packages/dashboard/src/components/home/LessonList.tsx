import { Search } from "lucide-react";
import { LessonCard } from "@/components/home/LessonCard";
import type { DashboardLesson } from "@/lib/types";

interface Props {
  pageLessons: DashboardLesson[];
  query: string;
  page: number;
  totalPages: number;
  onPrev(): void;
  onNext(): void;
  onOpen(lesson: DashboardLesson, review: boolean): void;
  onDelete(lessonId: string): void;
}

export function LessonList({
  pageLessons,
  query,
  page,
  totalPages,
  onPrev,
  onNext,
  onOpen,
  onDelete,
}: Props) {
  return (
    <>
      <div>
        {pageLessons.length ? (
          pageLessons.map((lesson) => (
            <LessonCard lesson={lesson} onOpen={onOpen} onDelete={onDelete} key={lesson.id} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface/40 px-6 py-14 text-center animate-fade-up">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-muted">
              <Search className="size-5" />
            </div>
            <p className="text-sm font-medium text-ink">
              {query ? `No lessons matching "${query}"` : "No lessons match this view."}
            </p>
            <p className="mt-1 text-sm text-muted">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted"
            onClick={onPrev}
            disabled={page === 1}
          >
            &larr; Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="cursor-pointer border-0 bg-transparent p-0 hover:text-ink disabled:cursor-default disabled:opacity-30 disabled:hover:text-muted"
            onClick={onNext}
            disabled={page === totalPages}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </>
  );
}
