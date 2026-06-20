import { Link, useRouter } from "./router";

export const INSTALL_CMD = "npm install -g fixmind && fixmind setup";
export const REPO_URL = "https://github.com/F-47/fixmind";

export function GithubMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.75 2.68 1.25 3.33.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  );
}

export function Nav() {
  const { path } = useRouter();
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-line/60 bg-bg/60 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
          <span className="text-accent">▌</span>
          fixmind
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <Link to="/#loop" className="transition-colors hover:text-ink">
            The loop
          </Link>
          <Link to="/#features" className="transition-colors hover:text-ink">
            Features
          </Link>
          <Link to="/#how" className="transition-colors hover:text-ink">
            How it works
          </Link>
          <Link to="/#tokens" className="transition-colors hover:text-ink">
            Token cost
          </Link>
          <Link to="/#commands" className="transition-colors hover:text-ink">
            Commands
          </Link>
          <Link
            to="/pricing"
            className={`transition-colors hover:text-ink ${path === "/pricing" ? "text-ink" : ""}`}
          >
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View fixmind on GitHub"
            className="text-muted transition-colors hover:text-ink"
          >
            <GithubMark size={18} />
          </a>
          <Link
            to="/#commands"
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            Install
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-ink">
            <span className="text-accent">▌</span>
            fixmind
          </div>
          <p className="text-sm text-muted">Local-first learning lessons for AI-assisted fixes.</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
          >
            <GithubMark size={15} />
            GitHub
          </a>
        </div>
        <p className="mt-6 border-t border-line pt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          MIT licensed · No telemetry · Node 22.5+
        </p>
      </div>
    </footer>
  );
}
