import { Check } from "lucide-react";

export default function TerminalCard() {
  return (
    <div className="rounded-xl border border-line bg-surface shadow-[0_0_80px_-20px_var(--color-accent-dim)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b35f]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        <span className="ml-2 font-mono text-xs text-muted">
          fixmind review
        </span>
      </div>
      <div className="space-y-3 px-5 py-5 font-mono text-[13px] leading-relaxed">
        <p className="text-muted">$ fixmind review</p>
        <p className="text-ink">
          <span className="text-accent">&gt;</span> What must be true about the
          server render and the browser&apos;s first render?
        </p>
        <p className="text-ink">
          Your answer:{" "}
          <span className="text-muted">
            They must produce matching markup before client-only state loads.
          </span>
        </p>
        <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-4 text-good">
          <Check size={14} />
          understood - next check in 3 days
        </div>
      </div>
    </div>
  );
}
