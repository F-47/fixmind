import type { RankedItem } from "../types";

export function RankList({ items }: { items: RankedItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted">More lessons are needed to show a pattern.</p>;
  }
  return (
    <div className="grid gap-3">
      {items.slice(0, 6).map((item) => (
        <div className="flex items-baseline justify-between gap-3 text-sm" key={item.name}>
          <span className="text-muted">{item.name}</span>
          <span className="font-mono text-xs font-semibold text-accent">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
