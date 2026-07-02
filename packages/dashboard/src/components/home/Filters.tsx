interface Props {
  query: string;
  onQuery(value: string): void;
}

export function Filters({ query, onQuery }: Props) {
  return (
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
  );
}
