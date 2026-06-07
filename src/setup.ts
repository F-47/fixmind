import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type SupportedClient = "codex" | "claude" | "cursor";

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
  const platform = options.platform ?? process.platform;
  const run = options.run ?? runCommand;
  const serverCommand = mcpServerCommand(platform);
  return options.clients.map((client) => {
    if (client === "cursor") {
      return configureCursor(homeDirectory, serverCommand, Boolean(options.dryRun));
    }
    return configureCliClient(client, serverCommand, Boolean(options.dryRun), run);
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

  const addArgs = client === "claude"
    ? ["mcp", "add", "--scope", "user", "fixmind", "--", server.command, ...server.args]
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
  return {
    client,
    status: dryRun ? "dry_run" : "configured",
    detail: formatCommand(client, addArgs),
  };
}

function configureCursor(homeDirectory: string, server: ServerCommand, dryRun: boolean): SetupResult {
  const directory = path.join(homeDirectory, ".cursor");
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

function commandExists(command: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where.exe" : "which", [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args.map((argument) => argument.includes(" ") ? JSON.stringify(argument) : argument)].join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingCommandError(error: unknown): boolean {
  return error != null
    && typeof error === "object"
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}
