export function PricingFallback() {
  return (
    <div className="relative overflow-hidden bg-grid">
      <section>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center px-6 py-24 text-center">
          <div className="mx-auto h-5 w-20 animate-pulse rounded bg-surface-2" />
          <div className="mx-auto mt-4 h-10 w-[min(92vw,720px)] animate-pulse rounded bg-surface-2" />
          <div className="mx-auto mt-5 h-5 w-[min(90vw,520px)] animate-pulse rounded bg-surface-2" />
          <div className="mx-auto mt-4 h-9 w-[min(90vw,640px)] animate-pulse rounded-md bg-surface-2" />
          <div className="mx-auto mt-4 h-8 w-[min(90vw,420px)] animate-pulse rounded-md bg-surface-2" />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-24 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, position) => `plan-${position}`).map((key) => (
          <div key={key} className="rounded-xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="h-5 w-20 animate-pulse rounded bg-surface-2" />
              <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
            </div>
            <div className="mt-6 h-12 w-20 animate-pulse rounded bg-surface-2" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-surface-2" />
            </div>
            <div className="mt-6 h-10 w-full animate-pulse rounded-md bg-surface-2" />
          </div>
        ))}
      </section>
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-9 w-[min(92vw,540px)] animate-pulse rounded bg-surface-2" />
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, position) => `faq-${position}`).map((key) => (
              <div key={key} className="rounded-xl border border-line bg-surface p-6">
                <div className="h-5 w-10 animate-pulse rounded bg-surface-2" />
                <div className="mt-4 h-6 w-44 animate-pulse rounded bg-surface-2" />
                <div className="mt-3 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2" />
                  <div className="h-4 w-10/12 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
