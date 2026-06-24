import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function InfoPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]",
        tone === "good"
          ? "border-good/30 bg-good/10 text-good"
          : tone === "accent"
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-line bg-surface-2 text-muted"
      )}
    >
      {children}
    </span>
  );
}
