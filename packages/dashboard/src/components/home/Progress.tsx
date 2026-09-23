import { ProgressChart } from "@/components/shared/ProgressChart";
import type { ProgressData } from "@/lib/types";

interface Props {
  data: ProgressData;
  selectedWeek: string | null;
  onSelectWeek(weekStart: string): void;
}

export function Progress({ data, selectedWeek, onSelectWeek }: Props) {
  return (
    <div className="space-y-4">
      <ProgressChart data={data} selectedWeek={selectedWeek} onSelectWeek={onSelectWeek} />
    </div>
  );
}
