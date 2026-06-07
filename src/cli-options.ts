export function optionString(
  value: string | boolean | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function numberOption(
  value: string | boolean | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error("--limit must be a positive integer.");
  return parsed;
}

export function optionalPort(
  value: string | boolean | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("--port must be an integer from 0 to 65535.");
  }
  return port;
}

export function parseList(value?: string): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}
