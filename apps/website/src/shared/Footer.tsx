import { CONTACT_EMAIL } from "./constants";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-ink">
            <Logo size={18} />
            fixmind
          </div>
          <p className="text-sm text-muted">
            Local-first learning lessons for AI-assisted fixes.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        <p className="mt-6 border-t border-line pt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          MIT licensed · No telemetry · Node 22.5+
        </p>
      </div>
    </footer>
  );
}
