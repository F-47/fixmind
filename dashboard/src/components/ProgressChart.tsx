import type { ProgressData, UnderstandingBreakdown } from "../types";

type Status = "understood" | "partial" | "copied_blindly" | "unknown";

const STATUSES: Status[] = ["understood", "partial", "copied_blindly", "unknown"];

const STATUS_COLORS: Record<Status, string> = {
  understood: "bg-positive",
  partial: "bg-warn",
  copied_blindly: "bg-danger",
  unknown: "bg-muted/30",
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
    return <p className="text-sm text-muted">More lessons are needed to show your progress.</p>;
  }

  const maximum = Math.max(...data.lessonsPerWeek.map((week) => week.count), 1);

  return (
    <div className="grid gap-10 sm:grid-cols-2 sm:[&>div:last-child]:border-l sm:[&>div:last-child]:border-line sm:[&>div:last-child]:pl-10">
      <div>
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-muted">Lessons per week</div>
        <div className="flex items-end gap-1.5">
          {data.lessonsPerWeek.map((week) => (
            <div className="flex flex-1 flex-col items-center gap-1.5" key={week.weekStart}>
              <div className="relative h-32 w-full bg-line">
                <div
                  className="absolute bottom-0 left-0 w-full bg-accent"
                  style={{ height: `${(week.count / maximum) * 100}%` }}
                  title={`${formatWeek(week.weekStart)}: ${week.count} lesson(s)`}
                />
              </div>
              <span className="font-mono text-[9px] text-muted">{formatWeek(week.weekStart)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-muted">Understanding over time</div>
        <div className="flex items-end gap-1.5">
          {data.understandingByWeek.map((week) => {
            const count = weekTotal(week);
            return (
              <div className="flex flex-1 flex-col items-center gap-1.5" key={week.weekStart}>
                <div className="relative h-32 w-full bg-line">
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
                <span className="font-mono text-[9px] text-muted">{formatWeek(week.weekStart)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[.15em] text-muted">
          {STATUSES.map((status) => (
            <span className="flex items-center gap-1.5" key={status}>
              <span className={`size-2 ${STATUS_COLORS[status]}`} />
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
