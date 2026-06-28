import type { RankedItem } from "@/lib/types";

export function RankList({ items }: { items: RankedItem[] }) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">
        More lessons are needed to show a pattern.
      </p>
    );
  }

  return (
    <div className="grid gap-2.5">
      {items.slice(0, 6).map((item, i) => {
        return (
          <div
            className="flex items-baseline justify-between gap-3 text-sm"
            key={item.name}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-[9px] font-bold text-accent/60 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate text-muted text-xs">{item.name}</span>
            </div>
            <span className="font-mono text-xs font-semibold text-accent shrink-0">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
