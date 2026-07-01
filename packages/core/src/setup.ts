import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type SupportedClient = "codex" | "claude" | "cursor";

// "user" configures the client globally, so the MCP server is available in every
// project on this device. "project" scopes the configuration to a single project
// directory instead, so it only applies there (and can be checked into version control).
export type SetupScope = "user" | "project";

export interface ServerCommand {
  command: string;
  args: string[];
}

export interface SetupResult {
  client: SupportedClient;
  status: "configured" | "already_configured" | "dry_run" | "unavailable";
  detail: string;
}

export interface SetupOptions {
  clients: SupportedClient[];
  scope?: SetupScope;
  projectDirectory?: string;
  dryRun?: boolean;
  homeDirectory?: string;
  platform?: NodeJS.Platform;
  run?: (command: string, args: string[]) => string;
}

export function mcpServerCommand(platform: NodeJS.Platform = process.platform): ServerCommand {
  return platform === "win32"
    ? { command: "cmd", args: ["/c", "npx", "-y", "fixmind", "mcp"] }
    : { command: "npx", args: ["-y", "fixmind", "mcp"] };
}

export function detectClients(homeDirectory = os.homedir()): SupportedClient[] {
  const detected: SupportedClient[] = [];
  if (commandExists("codex")) detected.push("codex");
  if (commandExists("claude")) detected.push("claude");
  if (commandExists("cursor") || fs.existsSync(path.join(homeDirectory, ".cursor"))) detected.push("cursor");
  return detected;
}

export function configureClients(options: SetupOptions): SetupResult[] {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const scope = options.scope ?? "user";
  const platform = options.platform ?? process.platform;
  const run = options.run ?? runCommand;
  const serverCommand = mcpServerCommand(platform);
  return options.clients.map((client) => {
    if (client === "cursor") {
      return configureCursor(homeDirectory, projectDirectory, scope, serverCommand, Boolean(options.dryRun));
    }
    return configureCliClient(client, serverCommand, Boolean(options.dryRun), run, scope);
  });
}

export function genericMcpConfiguration(
  platform: NodeJS.Platform = process.platform,
): Record<string, unknown> {
  const server = mcpServerCommand(platform);
  return {
    mcpServers: {
      "fixmind": {
        command: server.command,
        args: server.args,
      },
    },
  };
}

function configureCliClient(
  client: "codex" | "claude",
  server: ServerCommand,
  dryRun: boolean,
  run: (command: string, args: string[]) => string,
  scope: SetupScope,
): SetupResult {
  const getArgs = ["mcp", "get", "fixmind"];
  try {
    run(client, getArgs);
    return {
      client,
      status: "already_configured",
      detail: `${client} already has an MCP server named fixmind.`,
    };
  } catch (error) {
    if (isMissingCommandError(error)) {
      return {
        client,
        status: "unavailable",
        detail: `${client} is not available on PATH, so fixmind was not configured for it.`,
      };
    }
    // The client reports a non-zero status when the named server is absent.
  }

  // The Codex CLI has no project-scope flag for `mcp add`, so a project-scoped
  // request still registers the server globally; the detail message says so.
  const addArgs = client === "claude"
    ? ["mcp", "add", "--scope", scope, "fixmind", "--", server.command, ...server.args]
    : ["mcp", "add", "fixmind", "--", server.command, ...server.args];
  if (!dryRun) {
    try {
      run(client, addArgs);
    } catch (error) {
      if (isMissingCommandError(error)) {
        return {
          client,
          status: "unavailable",
          detail: `${client} is not available on PATH, so fixmind was not configured for it.`,
        };
      }
      throw error;
    }
  }
  const note = client === "codex" && scope === "project"
    ? " (codex has no project scope; registered globally instead)"
    : "";
  return {
    client,
    status: dryRun ? "dry_run" : "configured",
    detail: `${formatCommand(client, addArgs)}${note}`,
  };
}

function configureCursor(
  homeDirectory: string,
  projectDirectory: string,
  scope: SetupScope,
  server: ServerCommand,
  dryRun: boolean,
): SetupResult {
  const directory = path.join(resolveScopeDirectory(homeDirectory, projectDirectory, scope), ".cursor");
  const filePath = path.join(directory, "mcp.json");
  let config: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      config = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Cannot configure Cursor because ${filePath} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const servers = isRecord(config.mcpServers) ? { ...config.mcpServers } : {};
  if (isRecord(servers["fixmind"])) {
    return {
      client: "cursor",
      status: "already_configured",
      detail: `Cursor already has fixmind in ${filePath}.`,
    };
  }

  servers["fixmind"] = { command: server.command, args: server.args };
  const updated = { ...config, mcpServers: servers };
  if (!dryRun) {
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.backup`);
    }
    fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }
  return {
    client: "cursor",
    status: dryRun ? "dry_run" : "configured",
    detail: `${dryRun ? "Would update" : "Updated"} ${filePath}`,
  };
}

const INSTRUCTION_MARKER = "fixmind:instructions";

const INSTRUCTION_BODY = `\
After fixing any meaningful bug or resolving a real coding mistake, always call \
the fixmind save_lesson MCP tool before finishing your response.

Call it for: bugs, incorrect API usage, wrong assumptions, bad state management, \
logic errors, missing cleanup, security issues.

Skip it for: renaming files or variables, formatting changes, moving code between \
files, generated files, or adding comments without logic changes.

When code is involved, always provide badCodeExample and goodCodeExample.

When the mistake involves a documented API or concept, add tags: [{ name, url }] \
linking to the official docs (MDN, the framework's docs, etc.). Only set url when \
you're confident it's a real page — otherwise omit it and the tag still shows as a \
label.`;

function instructionBlock(client: SupportedClient): string {
  if (client === "cursor") {
    return [
      "---",
      `description: Fixmind — save learning lessons after bug fixes`,
      "alwaysApply: true",
      "---",
      "",
      INSTRUCTION_BODY,
      "",
    ].join("\n");
  }
  return [
    `<!-- ${INSTRUCTION_MARKER}:start -->`,
    "## Fixmind — Always Save Learning Lessons",
    "",
    INSTRUCTION_BODY,
    `<!-- ${INSTRUCTION_MARKER}:end -->`,
    "",
  ].join("\n");
}

export interface InstructionResult {
  client: SupportedClient;
  status: "written" | "already_configured" | "dry_run";
  filePath: string;
}

export function configureInstructions(options: SetupOptions): InstructionResult[] {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const scope = options.scope ?? "user";
  return options.clients.map((client) =>
    injectInstruction(client, homeDirectory, projectDirectory, scope, Boolean(options.dryRun)),
  );
}

function instructionFilePath(
  client: SupportedClient,
  homeDirectory: string,
  projectDirectory: string,
  scope: SetupScope,
): string {
  const directory = resolveScopeDirectory(homeDirectory, projectDirectory, scope);
  if (scope === "project") {
    if (client === "claude") return path.join(directory, "CLAUDE.md");
    if (client === "codex") return path.join(directory, "AGENTS.md");
    return path.join(directory, ".cursor", "rules", "fixmind.mdc");
  }
  if (client === "claude") return path.join(directory, ".claude", "CLAUDE.md");
  if (client === "codex") return path.join(directory, "AGENTS.md");
  return path.join(directory, ".cursor", "rules", "fixmind.mdc");
}

function injectInstruction(
  client: SupportedClient,
  homeDirectory: string,
  projectDirectory: string,
  scope: SetupScope,
  dryRun: boolean,
): InstructionResult {
  const filePath = instructionFilePath(client, homeDirectory, projectDirectory, scope);
  const block = instructionBlock(client);
  const marker = client === "cursor" ? "alwaysApply: true" : `${INSTRUCTION_MARKER}:start`;

  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  if (existing.includes(marker)) {
    return { client, status: "already_configured", filePath };
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const content = existing
      ? `${existing.trimEnd()}\n\n${block}`
      : block;
    fs.writeFileSync(filePath, content, "utf8");
  }

  return { client, status: dryRun ? "dry_run" : "written", filePath };
}

const FIXMIND_SAVE_TOOL = "mcp__fixmind__save_lesson";

export interface PermissionResult {
  client: "claude";
  status: "configured" | "already_configured" | "dry_run";
  filePath: string;
}

export function configurePermissions(options: SetupOptions): PermissionResult[] {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const scope = options.scope ?? "user";
  return options.clients
    .filter((client): client is "claude" => client === "claude")
    .map((client) => configureClaudePermissions(client, homeDirectory, projectDirectory, scope, Boolean(options.dryRun)));
}

function configureClaudePermissions(
  client: "claude",
  homeDirectory: string,
  projectDirectory: string,
  scope: SetupScope,
  dryRun: boolean,
): PermissionResult {
  const directory = path.join(resolveScopeDirectory(homeDirectory, projectDirectory, scope), ".claude");
  const filePath = path.join(directory, "settings.json");
  let config: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      config = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch (error) {
      throw new Error(`Cannot configure Claude permissions because ${filePath} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const permissions = isRecord(config.permissions) ? { ...config.permissions } : {};
  const allow = Array.isArray(permissions.allow) ? [...permissions.allow] : [];

  if (allow.includes(FIXMIND_SAVE_TOOL)) {
    return { client, status: "already_configured", filePath };
  }

  allow.push(FIXMIND_SAVE_TOOL);
  const updated = { ...config, permissions: { ...permissions, allow } };

  if (!dryRun) {
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.backup`);
    }
    fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }

  return { client, status: dryRun ? "dry_run" : "configured", filePath };
}

function commandExists(command: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[]): string {
  // On Windows, CLI tools installed via npm are typically `.cmd`/`.ps1` shims, which
  // Node refuses to spawn directly (EINVAL) unless `shell` is enabled.
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args.map((argument) => argument.includes(" ") ? JSON.stringify(argument) : argument)].join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingCommandError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === "ENOENT") return true;
  // With `shell: true` on Windows, a missing command no longer surfaces as ENOENT;
  // cmd.exe instead exits non-zero and writes this message to stderr.
  const stderr = (error as { stderr?: unknown }).stderr;
  const stderrText = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : typeof stderr === "string" ? stderr : "";
  return /is not recognized as an internal or external command/i.test(stderrText);
}

function resolveScopeDirectory(
  homeDirectory: string,
  projectDirectory: string,
  scope: SetupScope,
): string {
  return scope === "project" ? projectDirectory : homeDirectory;
}
