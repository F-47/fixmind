import {
  loginCommand,
  logoutCommand,
  settingsCommand,
  setup as setupRunner,
  syncCommand,
} from "../cli-sync.js";
import type { LessonStore } from "../storage.js";
import { dashboardCommand } from "./dashboard-server.js";
import { dataCommand } from "./data.js";
import { deleteCommand } from "./delete.js";
import { diagnosticsCommand } from "./diagnostics.js";
import { editCommand } from "./edit.js";
import { exportCommand } from "./export-lessons.js";
import { hooksCommand } from "./hooks.js";
import { injectCommand } from "./inject.js";
import { insightsCommand } from "./insights.js";
import { listCommand } from "./list.js";
import { mcpCommand } from "./mcp-server.js";
import { memoryCommand } from "./memory.js";
import { reviewCommand } from "./review.js";
import { saveCommand } from "./save.js";
import { saveFromSummaryCommand } from "./save-from-summary.js";
import { searchCommand } from "./search.js";
import { statsCommand } from "./stats.js";
import { statusCommand } from "./status.js";
import { supersedeCommand } from "./supersede.js";

export type CommandOptions = Record<string, string | boolean>;

export interface StandaloneCommandArgs {
  options: CommandOptions;
  positionals: string[];
}

export interface StoreCommandArgs extends StandaloneCommandArgs {
  store: LessonStore;
}

export interface StandaloneCommand {
  readonly names: readonly string[];
  readonly usage: readonly string[];
  readonly kind: "standalone";
  readonly run: (args: StandaloneCommandArgs) => void | Promise<void>;
}

export interface StoreCommand {
  readonly names: readonly string[];
  readonly usage: readonly string[];
  readonly kind: "store";
  readonly run: (args: StoreCommandArgs) => void | Promise<void>;
}

export type CommandDefinition = StandaloneCommand | StoreCommand;

export function isStoreCommand(command: CommandDefinition): command is StoreCommand {
  return command.kind === "store";
}

export const commands: readonly CommandDefinition[] = [
  {
    names: ["setup"],
    usage: [
      "  fixmind setup [--client codex,claude,cursor] [--scope user|project] [--capture-mode strict|balanced] [--dry-run] [--no-dashboard] [--starter-pack] [--session-start-hook]",
    ],
    kind: "standalone",
    run: ({ options }) => setupRunner(options),
  },
  {
    names: ["settings"],
    usage: ["  fixmind settings [--capture-mode strict|balanced]"],
    kind: "standalone",
    run: ({ options }) => settingsCommand(options),
  },
  memoryCommand,
  dashboardCommand,
  dataCommand,
  mcpCommand,
  injectCommand,
  hooksCommand,
  diagnosticsCommand,
  insightsCommand,
  {
    names: ["login"],
    usage: [
      "  fixmind login [--url <supabase-url> --key <anon-key> --passphrase ...]  (opens browser for GitHub sign in)",
      "  fixmind login --password-login --email ... --password ... --passphrase ...  (email/password instead)",
    ],
    kind: "standalone",
    run: ({ options }) => loginCommand(options),
  },
  {
    names: ["logout"],
    usage: ["  fixmind logout"],
    kind: "standalone",
    run: () => logoutCommand(),
  },
  {
    names: ["sync"],
    usage: ["  fixmind sync push", "  fixmind sync pull", "  fixmind sync status"],
    kind: "standalone",
    run: ({ positionals }) => syncCommand(positionals[0]),
  },
  saveCommand,
  saveFromSummaryCommand,
  listCommand,
  searchCommand,
  reviewCommand,
  statsCommand,
  statusCommand,
  editCommand,
  deleteCommand,
  supersedeCommand,
  exportCommand,
];

const HELP_TAIL: readonly string[] = [
  "",
  "Options:",
  "  -v, --version  Show the installed CLI version.",
  "  -h, --help     Show this help text.",
  "",
  "Save options:",
  "  --title --original-prompt --problem --mistake --root-cause --fix-summary",
  "  --takeaway --mistake-pattern --when-not-applicable --concepts --files-changed",
  "  --code-example --bad-code-example --good-code-example --code-explanation",
  "  --practice-task --review-question --expected-answer --tool --understanding --tags",
  "",
  "Edit accepts the same field options as save (without --review-question,",
  "--expected-answer, --original-prompt, or --tool). <id> may be the full",
  "lesson id or any unique prefix shown by `fixmind list`.",
  "",
  "Delete requires --yes (or -y) when run outside an interactive terminal.",
  "",
  "Supersede marks <oldId> as superseded by <newId> (linked, never deleted).",
  "Superseded lessons are hidden from `list`/`search` and review by default;",
  "pass --include-superseded to see them. <oldId>/<newId> accept id prefixes.",
  "",
  "Aliases:",
  "  fixmind save-manual -> fixmind save",
  "  fixmind save-ai-summary -> fixmind save-from-summary",
];

export function buildHelpText(): string {
  return [
    "fixmind",
    "",
    "Commands:",
    ...commands.flatMap((command) => command.usage),
    ...HELP_TAIL,
  ].join("\n");
}

export function findCommand(name: string): CommandDefinition | undefined {
  return commands.find((command) => command.names.includes(name));
}
