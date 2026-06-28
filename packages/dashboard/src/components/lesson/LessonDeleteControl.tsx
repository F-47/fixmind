import { useEffect, useRef } from "react";

export function LessonDeleteControl({
  confirming,
  onRequest,
  onCancel,
  onConfirm,
}: {
  confirming: boolean;
  onRequest(): void;
  onCancel(): void;
  onConfirm(): void;
}) {
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
