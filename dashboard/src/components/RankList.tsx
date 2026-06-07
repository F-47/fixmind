import type { RankedItem } from "../types";

export function RankList({ items }: { items: RankedItem[] }) {
  if (!items.length) return <div className="px-2 py-8 text-center text-[13px] text-muted">More lessons are needed to show a pattern.</div>;
  const maximum = Math.max(...items.map((item) => item.count), 1);
  return <div className="mt-4 grid gap-3">{items.slice(0, 6).map((item) => <div className="grid grid-cols-[1fr_auto] gap-2.5 text-xs" key={item.name}>
    <div>{item.name}<div className="mt-2 h-1 overflow-hidden rounded-full bg-[#242d37]"><i className="block h-full bg-gradient-to-r from-mint to-sky" style={{ width: `${item.count / maximum * 100}%` }} /></div></div><strong>{item.count}</strong>
  </div>)}</div>;
}
