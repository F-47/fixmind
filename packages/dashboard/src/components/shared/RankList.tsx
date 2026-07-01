import type { RankedItem } from "@/lib/types";

interface Props {
  items: RankedItem[];
  emptyMessage?: string;
  limit?: number;
}

export function RankList({
  items,
  emptyMessage = "More lessons are needed to show a pattern.",
  limit = 6,
}: Props) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="grid gap-2.5">
      {items.slice(0, limit).map((item, i) => {
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
