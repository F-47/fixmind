export function DocsFallback() {
  return (
    <div className="flex flex-col gap-10 px-6 py-12 md:flex-row md:items-start md:py-20">
      <aside className="w-full shrink-0 md:sticky md:top-24 md:w-64">
        <div className="h-12 w-full animate-pulse rounded-xl bg-surface-2" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 7 }, (_, position) => `doc-${position}`).map((key) => (
            <div key={key} className="h-10 w-full animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      </aside>

      <article className="min-w-0 flex-1">
        <div className="space-y-4">
          <div className="h-10 w-2/3 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface-2" />
          <div className="mt-8 h-72 rounded-2xl border border-line bg-surface-2/60" />
        </div>
      </article>

      <aside className="hidden w-56 shrink-0 xl:sticky xl:top-24 xl:block">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }, (_, position) => `outline-${position}`).map((key) => (
              <div key={key} className="h-9 w-full animate-pulse rounded bg-surface-2" />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
