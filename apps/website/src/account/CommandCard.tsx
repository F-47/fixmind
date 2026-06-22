import { CopyButton } from "../components/CopyButton";

export function CommandCard({
  label,
  command,
  description,
}: {
  label: string;
  command: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            {label}
          </p>
          <p className="mt-1 font-mono text-[12px] text-ink">
            <span className="text-muted">$</span> {command}
          </p>
        </div>
        <CopyButton text={command} />
      </div>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
