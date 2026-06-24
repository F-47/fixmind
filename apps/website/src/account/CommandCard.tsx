import { CommandSnippet } from "../components/CommandSnippet";

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
      <CommandSnippet command={command} caption={label} />
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
    </div>
  );
}
