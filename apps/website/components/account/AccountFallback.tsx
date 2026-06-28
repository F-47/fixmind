export function AccountFallback() {
  return (
    <div className="relative overflow-hidden bg-grid">
      <section>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          {/* Page heading skeleton */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto h-6 w-36 animate-pulse rounded-full bg-surface-2" />
            <div className="mx-auto mt-5 h-10 w-[min(92vw,680px)] animate-pulse rounded-lg bg-surface-2" />
            <div className="mx-auto mt-3 h-5 w-[min(90vw,520px)] animate-pulse rounded-lg bg-surface-2" />
          </div>

          {/* Auth form skeleton — mirrors the two-panel AuthForm layout */}
          <div className="mx-auto mt-12 max-w-5xl grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            {/* Left panel skeleton */}
            <div className="rounded-2xl border border-line bg-surface p-7">
              <div className="h-5 w-24 animate-pulse rounded-full bg-surface-2" />
              <div className="mt-4 h-8 w-3/4 animate-pulse rounded-lg bg-surface-2" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-2" />
              <div className="mt-1 h-4 w-4/5 animate-pulse rounded bg-surface-2" />
              <div className="mt-7 space-y-3">
                {/* Feature item 1 */}
                <div className="flex gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-line" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-line" />
                    <div className="h-3 w-full animate-pulse rounded bg-line" />
                  </div>
                </div>
                {/* Feature item 2 */}
                <div className="flex gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3">
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-line" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/5 animate-pulse rounded bg-line" />
                    <div className="h-3 w-full animate-pulse rounded bg-line" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-line" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel (form) skeleton */}
            <div className="rounded-2xl border border-line bg-surface p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-3 w-14 animate-pulse rounded bg-surface-2" />
                  <div className="h-6 w-32 animate-pulse rounded-lg bg-surface-2" />
                </div>
                <div className="h-6 w-24 animate-pulse rounded-full bg-surface-2" />
              </div>
              <div className="mt-6 space-y-3">
                <div className="h-11 w-full animate-pulse rounded-lg bg-surface-2" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-surface-2" />
                <div className="h-11 w-full animate-pulse rounded-lg bg-surface-2" />
              </div>
              <div className="mt-3 h-11 w-full animate-pulse rounded-lg bg-surface-2" />
              <div className="mt-4 h-4 w-40 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
