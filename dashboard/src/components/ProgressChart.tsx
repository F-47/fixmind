import type { ProgressData, UnderstandingBreakdown } from "../types";

type Status = "understood" | "partial" | "copied_blindly" | "unknown";

const STATUSES: Status[] = ["understood", "partial", "copied_blindly", "unknown"];

const STATUS_COLORS: Record<Status, string> = {
  understood: "bg-mint",
  partial: "bg-warn",
  copied_blindly: "bg-danger",
  unknown: "bg-[#2a3440]",
};

const STATUS_LABELS: Record<Status, string> = {
  understood: "Understood",
  partial: "Still learning",
  copied_blindly: "Needs practice",
  unknown: "Not reviewed",
};

const weekLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

function formatWeek(weekStart: string): string {
  return weekLabel.format(new Date(`${weekStart}T00:00:00Z`));
}

function weekTotal(week: UnderstandingBreakdown): number {
  return week.understood + week.partial + week.copied_blindly + week.unknown;
}

export function ProgressChart({ data }: { data: ProgressData }) {
  const total = data.lessonsPerWeek.reduce((sum, week) => sum + week.count, 0);
  if (total === 0) {
    return <div className="px-2 py-8 text-center text-[13px] text-muted">More lessons are needed to show your progress.</div>;
  }

  const maximum = Math.max(...data.lessonsPerWeek.map((week) => week.count), 1);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="mb-3 text-xs text-muted">Lessons per week</div>
        <div className="flex items-end gap-1.5">
          {data.lessonsPerWeek.map((week) => (
            <div className="flex flex-1 flex-col items-center gap-1.5" key={week.weekStart}>
              <div className="relative h-32 w-full overflow-hidden rounded-md bg-[#161b22]">
                <div
                  className="absolute bottom-0 left-0 w-full rounded-md bg-gradient-to-t from-mint to-sky"
                  style={{ height: `${(week.count / maximum) * 100}%` }}
                  title={`${formatWeek(week.weekStart)}: ${week.count} lesson(s)`}
                />
              </div>
              <span className="text-[9px] text-muted">{formatWeek(week.weekStart)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 text-xs text-muted">Understanding over time</div>
        <div className="flex items-end gap-1.5">
          {data.understandingByWeek.map((week) => {
            const count = weekTotal(week);
            return (
              <div className="flex flex-1 flex-col items-center gap-1.5" key={week.weekStart}>
                <div className="relative h-32 w-full overflow-hidden rounded-md bg-[#161b22]">
                  {count > 0 && (
                    <div
                      className="absolute bottom-0 left-0 flex w-full flex-col-reverse"
                      style={{ height: `${(count / maximum) * 100}%` }}
                      title={`${formatWeek(week.weekStart)}: ${count} lesson(s)`}
                    >
                      {STATUSES.map((status) => week[status] > 0 && (
                        <div
                          key={status}
                          className={STATUS_COLORS[status]}
                          style={{ height: `${(week[status] / count) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted">{formatWeek(week.weekStart)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted">
          {STATUSES.map((status) => (
            <span className="flex items-center gap-1.5" key={status}>
              <span className={`size-2 rounded-full ${STATUS_COLORS[status]}`} />
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
