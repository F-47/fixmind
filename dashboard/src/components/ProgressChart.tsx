import type { ProgressData } from "../types";
import { formatWeek } from "../format";

interface ProgressChartProps {
  data: ProgressData;
  selectedWeek: string | null;
  onSelectWeek: (weekStart: string) => void;
}

export function ProgressChart({
  data,
  selectedWeek,
  onSelectWeek,
}: ProgressChartProps) {
  const total = data.lessonsPerWeek.reduce((sum, week) => sum + week.count, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-muted">
        More lessons are needed to show your progress.
      </p>
    );
  }

  const weekly = data.lessonsPerWeek.map((week) => {
    const breakdown = data.understandingByWeek.find(
      (item) => item.weekStart === week.weekStart,
    );
    const learned = breakdown?.understood ?? 0;
    const notLearned = week.count - learned;
    return {
      ...week,
      learned,
      notLearned,
    };
  });
  const maximum = Math.max(...weekly.map((week) => week.count), 1);

  return (
    <>
      <div className="flex items-end gap-1.5">
        {weekly.map((week) => {
          const isSelected = week.weekStart === selectedWeek;
          return (
            <button
              type="button"
              key={week.weekStart}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0"
              onClick={() => onSelectWeek(week.weekStart)}
            >
              <div
                className={`relative h-32 w-full overflow-hidden bg-line ${isSelected ? "ring-2 ring-accent ring-inset" : ""}`}
              >
                {week.notLearned > 0 && (
                  <div
                    className="absolute bottom-0 left-0 flex w-full items-end justify-center bg-warn/85 pb-1 font-mono text-[10px] text-page"
                    style={{ height: `${(week.notLearned / maximum) * 100}%` }}
                    title={`${formatWeek(week.weekStart)}: ${week.notLearned} not learned`}
                  >
                    {week.notLearned}
                  </div>
                )}
                {week.learned > 0 && (
                  <div
                    className="absolute left-0 flex w-full items-start justify-center bg-positive pt-1 font-mono text-[10px] text-page"
                    style={{
                      height: `${(week.learned / maximum) * 100}%`,
                      bottom: `${(week.notLearned / maximum) * 100}%`,
                    }}
                    title={`${formatWeek(week.weekStart)}: ${week.learned} learned`}
                  >
                    {week.learned}
                  </div>
                )}
              </div>
              <span
                className={`font-mono text-[9px] ${isSelected ? "font-bold text-accent" : "text-muted"}`}
              >
                {formatWeek(week.weekStart)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[.15em] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 bg-positive" />
          Learned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 bg-warn/85" />
          Not learned
        </span>
      </div>
    </>
  );
}
