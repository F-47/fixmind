import { optionString, validateScope } from "../cli-utils.js";
import { configureCursorMemoryRule, configureSessionStartHook } from "../session-injection.js";
import type { CommandDefinition } from "./registry.js";

export const hooksCommand: CommandDefinition = {
  names: ["hooks"],
  usage: ["  fixmind hooks <claude|cursor> [--scope user|project]"],
  kind: "standalone",
  run: ({ options, positionals }) => {
    const client = positionals[0];
    if (client !== "claude" && client !== "cursor") {
      throw new Error("Usage: fixmind hooks <claude|cursor> [--scope user|project]");
    }
    const scopeInput = optionString(options.scope);
    const scope = scopeInput ? validateScope(scopeInput) : client === "cursor" ? "project" : "user";

    if (client === "claude") {
      const result = configureSessionStartHook({ scope });
      console.log(
        `Session-start hook: ${result.status} - ${result.filePath}` +
          (result.status === "configured" ? " (restart Claude Code sessions to pick it up)" : ""),
      );
      return;
    }

    const result = configureCursorMemoryRule({ scope });
    console.log(`Cursor memory rule: ${result.status} - ${result.filePath}`);
  },
};
