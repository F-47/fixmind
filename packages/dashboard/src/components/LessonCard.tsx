import { useEffect, useRef, useState } from "react";
import { formatDate, statusColor, statusLabel } from "../format";
import type { DashboardLesson } from "../types";
import { Trash2 } from "lucide-react";

interface Props {
  lesson: DashboardLesson;
  onOpen(lesson: DashboardLesson, review: boolean): void;
  onDelete(id: string): void;
}

export function LessonCard({ lesson, onOpen, onDelete }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmingDelete) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [confirmingDelete]);

  return (
    <article
      className="group cursor-pointer border-t border-line py-5 first:border-t-0 first:pt-0"
      onClick={() => onOpen(lesson, false)}
    >
      <h3 className="font-serif text-xl font-semibold tracking-tight transition group-hover:text-accent">
        {lesson.title}
      </h3>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
        {lesson.displayTakeaway}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center font-mono text-[11px] text-muted gap-x-2 gap-y-1.5">
          <span
            className={`flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.15em] ${statusColor(lesson.understanding)}`}
          >
            {statusLabel(lesson.understanding)}
          </span>
          <span className="h-4 w-px bg-line" />
          <span className="text-accent">{formatDate(lesson.createdAt)}</span>
          <span className="h-4 w-px bg-line" />
          <span>{lesson.tool}</span>
        </div>
        <button
          className="cursor-pointer border-0 bg-transparent p-0 opacity-0 transition group-hover:opacity-100 hover:text-danger"
          onClick={(event) => {
            event.stopPropagation();
            setConfirmingDelete(true);
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
        <dialog
          ref={dialogRef}
          className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-line bg-page p-6 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]"
          onClose={() => setConfirmingDelete(false)}
          onClick={(event) => {
            event.stopPropagation();
            if (event.target === dialogRef.current) setConfirmingDelete(false);
          }}
        >
          <p className="text-base leading-relaxed">
            Delete this lesson? This can&rsquo;t be undone.
          </p>
          <div className="mt-6 flex justify-end gap-5 font-mono text-[11px] uppercase tracking-[.2em]">
            <button
              className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              className="cursor-pointer border-0 bg-transparent p-0 font-bold text-danger hover:underline"
              onClick={() => onDelete(lesson.id)}
            >
              Delete
            </button>
          </div>
        </dialog>
      </div>
    </article>
  );
}
