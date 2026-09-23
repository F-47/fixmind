import { cn } from "@/components/shared/cn";
import type { PracticeMode } from "@/lib/types";

interface Props {
  mode: PracticeMode;
  onModeChange(mode: PracticeMode): void;
}

export function PracticeModeSelector({ mode, onModeChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-line bg-surface/50 p-3 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
      <ModeButton active={mode === "free"} onClick={() => onModeChange("free")}>
        Free response
      </ModeButton>
      <ModeButton active={mode === "mcq"} onClick={() => onModeChange("mcq")}>
        MCQ
      </ModeButton>
      <ModeButton active={mode === "mixed"} onClick={() => onModeChange("mixed")}>
        Mixed
      </ModeButton>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick(): void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-4 py-2 font-mono text-[12px] font-semibold uppercase tracking-[.18em] transition",
        active
          ? "border-accent/50 bg-accent text-page shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
          : "border-line bg-page text-ink hover:border-accent/40 hover:bg-surface hover:text-accent",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
