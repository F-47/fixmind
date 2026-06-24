import { Search } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import { highlightText, type SearchResult } from "./docs-data";

type DocSearchModalProps = {
  isOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  inputValue: string;
  resultsQuery: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
  results: SearchResult[];
  selectedIndex: number;
};

export function DocSearchModal({
  isOpen,
  inputRef,
  inputValue,
  resultsQuery,
  onQueryChange,
  onClose,
  onSelect,
  results,
  selectedIndex,
}: DocSearchModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-bg shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-4",
            resultsQuery.trim().length > 0 && "border-b border-line",
          )}
        >
          <Search size={16} className="text-muted" />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search docs, commands, and guides"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:text-ink"
          >
            Esc
          </button>
        </div>

        {resultsQuery.trim().length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
            {results.length === 0 ? (
              <div className="px-3 py-8 text-sm text-muted">
                No matching results found.
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => {
                  const isActive = index === selectedIndex;

                  return (
                    <button
                      key={`${result.doc.id}:${result.section.id}`}
                      type="button"
                      onClick={() => onSelect(result)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        isActive
                          ? "bg-accent/12 text-ink ring-1 ring-accent/30"
                          : "text-muted hover:bg-surface/50 hover:text-ink",
                      )}
                    >
                      <span className="flex min-h-8 min-w-0 flex-1 flex-col">
                        <span className="block text-sm font-medium text-ink">
                          {highlightText(result.doc.title, resultsQuery)}
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-muted/90">
                          {highlightText(result.section.preview, resultsQuery)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
