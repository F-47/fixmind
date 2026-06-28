"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackUmamiEvent } from "@/lib/umami";

interface CopyButtonProps {
  text: string;
  variant?: "inline" | "block";
  eventName?: string;
  eventData?: Record<string, string | number | boolean | null | undefined>;
}

export function CopyButton({
  text,
  variant = "inline",
  eventName = "copy_command",
  eventData,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    trackUmamiEvent(eventName, {
      command: text,
      ...eventData,
    });
    setTimeout(() => setCopied(false), 1800);
  }

  const className =
    variant === "block"
      ? "group flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      : "group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/50 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy"}
      className={className}
    >
      {copied ? (
        <Check size={14} className="text-good" />
      ) : (
        <Copy size={14} className="transition-colors group-hover:text-accent" />
      )}
    </button>
  );
}
