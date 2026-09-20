#!/usr/bin/env node
import { parseArgs as parseCliArgs } from "./cli-utils.js";
import { buildHelpText, findCommand, isStoreCommand } from "./commands/registry.js";
import { createLessonStore, initializeDataDirectory } from "./storage.js";
import { readInstalledVersion } from "./version.js";

const VERSION = readInstalledVersion();

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.options.version) {
    console.log(VERSION);
    return;
  }

  if (!args.command || args.options.help) {
    console.log(buildHelpText());
    return;
  }

  const command = findCommand(args.command);
  if (!command) {
    throw new Error(`Unknown command: ${args.command}. Run fixmind --help for usage.`);
  }

  if (isStoreCommand(command)) {
    initializeDataDirectory();
    const store = createLessonStore();
    try {
      await command.run({ options: args.options, positionals: args.positionals, store });
    } finally {
      store.close();
    }
    return;
  }

  await command.run({ options: args.options, positionals: args.positionals });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
  console.error(`Error: ${message}${cause ? ` (${cause})` : ""}`);
  process.exitCode = 1;
});
