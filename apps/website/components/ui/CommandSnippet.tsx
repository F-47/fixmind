import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/cn";

type CommandSnippetProps = {
  command: string;
  description?: string;
  caption?: string;
  prefix?: string;
  className?: string;
};

export function CommandSnippet({
  command,
  description,
  caption,
  prefix = "$",
  className,
}: CommandSnippetProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface px-4 py-2.5",
        className,
      )}
    >
      {caption ? (
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          {caption}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 font-mono text-sm text-ink">
        <div className="flex min-w-0 items-start gap-2">
          <span className="pt-0.5 text-muted">{prefix}</span>
          <span className="min-w-0 whitespace-pre-wrap break-words leading-6">
            {command}
          </span>
        </div>
        <CopyButton text={command} />
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
