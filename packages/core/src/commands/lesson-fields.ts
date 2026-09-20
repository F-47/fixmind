import { text } from "@clack/prompts";
import { common, optionString, unwrap } from "../cli-utils.js";

export function createLessonFieldReader(
  interactive: boolean,
  options: Record<string, string | boolean>,
): {
  required: (key: string, label: string, fallback?: string) => Promise<string>;
  optional: (key: string, label: string, current: string) => Promise<string | undefined>;
} {
  return {
    required: async (key: string, label: string, fallback = ""): Promise<string> => {
      const supplied = optionString(options[key]);
      if (supplied !== undefined) return supplied;
      if (!interactive) return fallback;
      return unwrap(await text({ message: label, defaultValue: fallback || undefined, ...common }));
    },
    optional: async (key: string, label: string, current: string): Promise<string | undefined> => {
      const supplied = optionString(options[key]);
      if (supplied !== undefined) return supplied;
      if (!interactive) return undefined;
      return unwrap(await text({ message: label, defaultValue: current, ...common }));
    },
  };
}
