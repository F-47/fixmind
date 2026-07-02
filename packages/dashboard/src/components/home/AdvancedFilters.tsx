import { ChevronDown, FilterX } from "lucide-react";
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
}

export function AdvancedFilters({
  state,
  setState,
  modelOptions,
  conceptOptions,
  patternOptions,
  fileOptions,
}: Props) {
  const hasActiveFilters = Boolean(
    state.understanding !== "all" ||
      state.status !== "all" ||
      state.client !== "all" ||
      state.concept ||
      state.pattern ||
      state.file ||
      state.date !== "all" ||
      state.learningState !== "all" ||
      state.query.trim(),
  );

  return (
    <details
      open={hasActiveFilters}
      className="rounded-2xl border border-line bg-page/30 px-4 py-3 transition-colors open:border-accent/30"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[.22em] text-muted">
        <span className="inline-flex items-center gap-2">
          <ChevronDown className="size-3.5" />
          More filters
        </span>
        {hasActiveFilters ? (
          <span className="inline-flex items-center gap-1.5 text-accent">
            Active
          </span>
        ) : (
          <span>Optional</span>
        )}
      </summary>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <FilterSelect
          label="Model"
          value={state.client}
          onChange={(value) => setState((prev) => ({ ...prev, client: value }))}
          options={modelOptions}
        />
        <FilterSelect
          label="Learning state"
          value={state.learningState}
          onChange={(value) => setState((prev) => ({ ...prev, learningState: value as LessonFilterState["learningState"] }))}
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
          onChange={(value) =>
            setState((prev) => ({ ...prev, date: value as DateFilter }))
          }
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          Search matches titles, bodies, files, concepts, tools, tags, and paths.
        </p>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[.18em] transition",
            hasActiveFilters
              ? "border-line bg-page text-muted hover:border-accent/40 hover:text-ink"
              : "cursor-not-allowed border-line bg-page/60 text-muted opacity-60",
          )}
          onClick={() =>
            setState((prev) => ({
              ...prev,
              learningState: "all",
              understanding: "all",
              status: "all",
              client: "all",
              concept: "",
              pattern: "",
              file: "",
              date: "all",
            }))
          }
          disabled={!hasActiveFilters}
        >
          <FilterX className="size-3.5" />
          Clear filters
        </button>
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
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
        {label}
      </span>
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
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
        {label}
      </span>
      <select
        className="rounded-xl border border-line bg-page/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
