export function Hero({ totalLessons }: { totalLessons: number }) {
  return (
    <header className="border-b border-line pb-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
              Dashboard overview
            </span>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your lessons at a glance
            </h1>
          </div>
          <div className="text-right">
            <span className="flex items-center justify-end gap-1.5 font-mono text-[11px] uppercase tracking-[.2em] text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              {totalLessons} lessons
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
