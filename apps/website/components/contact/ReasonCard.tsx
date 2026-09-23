import { Mail } from "lucide-react";

export interface ContactReason {
  email: string;
  title: string;
  description: string;
}

export function ReasonCard({ reason }: { reason: ContactReason }) {
  return (
    <a
      href={`mailto:${reason.email}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/40"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Mail size={16} />
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{reason.title}</h3>
      <p className="text-sm leading-relaxed text-muted">{reason.description}</p>
      <span className="font-mono text-sm text-accent transition-colors group-hover:text-ink">
        {reason.email}
      </span>
    </a>
  );
}
