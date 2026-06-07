import type { SupportedClient } from "./setup.js";

export function supportedClientOptions(
  detected: SupportedClient[],
): Array<{ value: SupportedClient; label: string; hint?: string }> {
  const detectedSet = new Set(detected);
  return [
    {
      value: "codex",
      label: "Codex",
      hint: detectedSet.has("codex") ? "detected" : undefined,
    },
    {
      value: "claude",
      label: "Claude",
      hint: detectedSet.has("claude") ? "detected" : undefined,
    },
    {
      value: "cursor",
      label: "Cursor",
      hint: detectedSet.has("cursor") ? "detected" : undefined,
    },
  ];
}
