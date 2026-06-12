import type { RankedItem } from "../types";

export function RankList({ items }: { items: RankedItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted">More lessons are needed to show a pattern.</p>;
  }
  const maximum = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="grid gap-3">
      {items.slice(0, 6).map((item) => (
        <div key={item.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{item.name}</span>
            <span className="font-mono text-xs text-muted">{item.count}</span>
          </div>
          <div className="mt-1.5 h-px w-full bg-line">
            <div className="h-px bg-accent" style={{ width: `${(item.count / maximum) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
