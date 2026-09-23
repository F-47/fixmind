import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TerminalShellProps = {
  title: string;
  className?: string;
  children: ReactNode;
};

export function TerminalShell({ title, className, children }: TerminalShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface shadow-[0_0_80px_-20px_var(--color-accent-dim)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e8b35f]/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
        <span className="ml-2 truncate font-mono text-xs text-muted">{title}</span>
      </div>
      <div className="font-mono text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
