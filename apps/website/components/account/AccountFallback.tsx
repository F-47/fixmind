export function AccountFallback() {
  return (
    <div className="relative overflow-hidden bg-grid">
      <section>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto h-6 w-36 animate-pulse rounded bg-surface-2" />
            <div className="mx-auto mt-5 h-10 w-[min(92vw,680px)] animate-pulse rounded bg-surface-2" />
            <div className="mx-auto mt-5 h-5 w-[min(90vw,620px)] animate-pulse rounded bg-surface-2" />
          </div>

          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-line bg-surface p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 rounded bg-surface-2" />
              <div className="h-9 w-2/3 rounded bg-surface-2" />
              <div className="h-4 w-full rounded bg-surface-2" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-20 rounded-xl bg-surface-2" />
                <div className="h-20 rounded-xl bg-surface-2" />
              </div>
            </div>
            <div className="mt-5 h-5 w-40 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </section>
    </div>
  );
}
