import { CONTACT_EMAIL } from "./constants";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line/60 bg-surface/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="font-medium text-ink">fixmind</p>
            <p>Local-first learning for developer workflows.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">
            {CONTACT_EMAIL}
          </a>
          <span className="hidden h-1 w-1 rounded-full bg-line md:inline-block" />
          <a
            href="https://ko-fi.com/B2N322IARY"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-line px-3 py-1.5 text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Support the project
          </a>
          <span className="hidden h-1 w-1 rounded-full bg-line md:inline-block" />
          <p>Built for Claude Code, Cursor, and Codex.</p>
        </div>
      </div>
    </footer>
  );
}
