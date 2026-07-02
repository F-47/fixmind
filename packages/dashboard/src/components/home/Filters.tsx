import { cn } from "@/components/shared/cn";

type FilterOption = [string, string];

interface Props {
  filters: FilterOption[];
  filter: string;
  query: string;
  onFilter(value: string): void;
  onQuery(value: string): void;
}

export function Filters({
  filters,
  filter,
  query,
  onFilter,
  onQuery,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
            Learning state
          </div>
          <nav className="flex flex-wrap gap-5">
            {filters.map(([value, label]) => (
              <button
                key={value}
                className={cn(
                  "cursor-pointer border-b-2 pb-0.5 font-mono text-[11px] uppercase tracking-[.15em] transition",
                  filter === value
                    ? "border-accent text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
                onClick={() => onFilter(value)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-page/25 p-3 transition-colors focus-within:border-accent/50">
        <div className="flex items-center gap-3">
          <svg
            className="size-4 shrink-0 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="lesson-search"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search titles, files, concepts, tools, tags..."
          />
        </div>
      </div>
    </>
  );
}
