#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { type DashboardHandle, startDashboard } from "./dashboard.js";

export interface DesktopServerOptions {
  port: number;
  dataDirectory?: string;
  dashboardDirectory: string;
  logFile?: string;
  sessionToken?: string;
}

const DEFAULT_DASHBOARD_DIRECTORY = path.resolve(
  path.dirname(process.argv[1] ?? process.execPath),
  "../dashboard",
);

export function parseDesktopServerArgs(args: string[]): DesktopServerOptions {
  const optionValues = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Expected a value after ${name ?? "an option"}.`);
    }
    if (
      !["--port", "--data-dir", "--dashboard-dir", "--log-file", "--session-token"].includes(name)
    ) {
      throw new Error(`Unknown option: ${name}`);
    }
    optionValues.set(name, value);
  }

  const rawPort = optionValues.get("--port") ?? "0";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error("--port must be an integer from 0 to 65535.");
  }

  return {
    port,
    dataDirectory: optionValues.get("--data-dir"),
    dashboardDirectory: path.resolve(
      optionValues.get("--dashboard-dir") ?? DEFAULT_DASHBOARD_DIRECTORY,
    ),
    logFile: optionValues.get("--log-file"),
    sessionToken: optionValues.get("--session-token"),
  };
}

export async function runDesktopServer(args = process.argv.slice(2)): Promise<void> {
  const options = parseDesktopServerArgs(args);
  if (options.dataDirectory) process.env.FIXMIND_DATA_DIR = path.resolve(options.dataDirectory);
  writeLog(options.logFile, "starting");

  let dashboard: DashboardHandle | undefined;
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    writeLog(options.logFile, "stopping");
    await dashboard?.close();
  };

  process.once("SIGINT", () => void stop().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void stop().finally(() => process.exit(0)));
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (command: string) => {
    if (command.split(/\r?\n/).includes("shutdown")) {
      void stop().finally(() => process.exit(0));
    }
  });
  process.stdin.once("end", () => void stop().finally(() => process.exit(0)));

  dashboard = await startDashboard({
    port: options.port,
    open: false,
    dashboardDirectory: options.dashboardDirectory,
    sessionToken: options.sessionToken,
  });
  writeLog(options.logFile, `ready ${dashboard.url}`);
  process.stdout.write(`${JSON.stringify({ event: "ready", url: dashboard.url })}\n`);
}

function writeLog(logFile: string | undefined, message: string): void {
  if (!logFile) return;
  const resolvedLogFile = path.resolve(logFile);
  fs.mkdirSync(path.dirname(resolvedLogFile), { recursive: true });
  fs.appendFileSync(resolvedLogFile, `${new Date().toISOString()} ${message}\n`, "utf8");
}

function isDirectEntry(entry = process.argv[1]): boolean {
  return entry !== undefined && path.basename(entry).toLowerCase() === "desktop-server.js";
}

if (isDirectEntry()) {
  runDesktopServer().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
