import { Check } from "lucide-react";
import { TerminalShell } from "./terminalShell";

export default function TerminalCard() {
  return (
    <TerminalShell title="fixmind review">
      <div className="space-y-3 px-5 py-5">
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
    </TerminalShell>
  );
}
