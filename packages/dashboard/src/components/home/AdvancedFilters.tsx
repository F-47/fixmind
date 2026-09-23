import { ChevronDown } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { cn } from "@/components/shared/cn";
import type {
  DateFilter,
  LessonFilterState,
  LessonStatusFilter,
  UnderstandingFilter,
} from "@/lib/lesson-filters";

interface Props {
  state: LessonFilterState;
  setState: Dispatch<SetStateAction<LessonFilterState>>;
  modelOptions: FilterOption[];
  conceptOptions: string[];
  patternOptions: string[];
  fileOptions: string[];
  open: boolean;
  onToggleOpen(open: boolean): void;
}

export function AdvancedFilters({
  state,
  setState,
  modelOptions,
  conceptOptions,
  patternOptions,
  fileOptions,
  open,
  onToggleOpen,
}: Props) {
  const hasActiveFilters = Boolean(
    state.understanding !== "all" ||
      state.status !== "all" ||
      state.client !== "all" ||
      state.concept ||
      state.pattern ||
      state.file ||
      state.date !== "all" ||
      state.learningState !== "all",
  );

  return (
    <details
      open={open}
      className="rounded-2xl border border-line bg-page/30 px-4 py-3 transition-colors open:border-accent/30"
      onToggle={(event) => onToggleOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span className="inline-flex items-center gap-2">
          <ChevronDown className="size-3.5" />
          More filters
        </span>
        {hasActiveFilters ? (
          <span className="inline-flex items-center gap-1.5 text-accent">Active</span>
        ) : (
          <span>Optional</span>
        )}
      </summary>

      <div className={cn("mt-4 grid gap-3 md:grid-cols-2", "xl:grid-cols-5")}>
        <FilterSelect
          label="Model"
          value={state.client}
          onChange={(value) => setState((prev) => ({ ...prev, client: value }))}
          options={modelOptions}
        />
        <FilterSelect
          label="Learning state"
          value={state.learningState}
          onChange={(value) =>
            setState((prev) => ({
              ...prev,
              learningState: value as LessonFilterState["learningState"],
            }))
          }
          options={[
            ["all", "All states"],
            ["learning", "Not learned"],
            ["understood", "Learned"],
          ]}
        />
        <FilterSelect
          label="Understanding"
          value={state.understanding}
          onChange={(value) =>
            setState((prev) => ({ ...prev, understanding: value as UnderstandingFilter }))
          }
          options={[
            ["all", "Any level"],
            ["understood", "Understood"],
            ["partial", "Partial"],
            ["copied_blindly", "Copied blindly"],
            ["unknown", "Unknown"],
          ]}
        />
        <FilterSelect
          label="Date"
          value={state.date}
          onChange={(value) => setState((prev) => ({ ...prev, date: value as DateFilter }))}
          options={[
            ["all", "Any time"],
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
            ["90d", "Last 90 days"],
            ["older", "Older"],
          ]}
        />
        <FilterSelect
          label="Status"
          value={state.status}
          onChange={(value) =>
            setState((prev) => ({ ...prev, status: value as LessonStatusFilter }))
          }
          options={[
            ["all", "All lessons"],
            ["active", "Active"],
            ["superseded", "Superseded"],
          ]}
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <FieldInput
          label="Concept"
          value={state.concept}
          placeholder="hydration timing, null guard..."
          listId="concept-options"
          options={conceptOptions}
          onChange={(value) => setState((prev) => ({ ...prev, concept: value }))}
        />
        <FieldInput
          label="Pattern"
          value={state.pattern}
          placeholder="stale closure, async timing..."
          listId="pattern-options"
          options={patternOptions}
          onChange={(value) => setState((prev) => ({ ...prev, pattern: value }))}
        />
        <FieldInput
          label="File"
          value={state.file}
          placeholder="app.tsx, storage.ts..."
          listId="file-options"
          options={fileOptions}
          onChange={(value) => setState((prev) => ({ ...prev, file: value }))}
        />
      </div>

      <datalist id="concept-options">
        {conceptOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="pattern-options">
        {patternOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="file-options">
        {fileOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </details>
  );
}

type FilterOption = [string, string];

function FieldInput({
  label,
  value,
  placeholder,
  listId,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  listId: string;
  options: string[];
  onChange(value: string): void;
}) {
  return (
    <label className="group grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">{label}</span>
      <input
        list={listId}
        className="rounded-xl border border-line bg-page/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent/50"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-[11px] leading-relaxed text-muted">
        {options.length > 0 ? `${options.length} suggestions available.` : "No suggestions yet."}
      </span>
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: Array<[string, string]>;
}) {
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] ?? value;

  return (
    <label className="group grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">{label}</span>
      <div className="relative">
        <select
          value={value}
          aria-label={label}
          className={cn(
            "w-full appearance-none rounded-xl border border-line bg-page/80 px-3.5 py-2.5 pr-10 text-sm font-medium text-ink outline-none transition-all",
            "shadow-[0_1px_0_rgba(255,255,255,0.03)] hover:border-accent/30 hover:bg-page focus:border-accent/60 focus:bg-page focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]",
          )}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted transition-transform duration-150",
            value !== "all" && "text-ink/70",
          )}
        />
      </div>
      <span className="text-[11px] leading-relaxed text-muted">Selected: {selectedLabel}</span>
    </label>
  );
}
