import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stdin, stdout } from "node:process";
import { isCancel, log, outro, password } from "@clack/prompts";
import { readConfig, writeConfig } from "./config.js";
import { createLessonStore, initializeDataDirectory } from "./storage.js";
import { createSyncEngine, PRICING_URL } from "./sync.js";
import type { SetupScope } from "./setup.js";
import {
  common,
  isAddressInUseError,
  intro,
  multiselect,
  note,
  optionalPort,
  optionString,
  parseList,
  select,
  startSpinner,
  supportedClientOptions,
  terminalLink,
  unwrap,
  validateClients,
  validateScope,
  greenText,
  text,
} from "./cli-utils.js";
import { configureClients, configureInstructions, configurePermissions, detectClients, genericMcpConfiguration } from "./setup.js";

const DEFAULT_SUPABASE_URL = "https://jpczzgekindvuivnwjuw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwY3p6Z2VraW5kdnVpdm53anV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzEyMjEsImV4cCI6MjA5NzY0NzIyMX0.qG-9H5BZi3sKHVQrzL3iI9ALmJgoTizLCU4Bxzpw0Bo";
export async function setup(options: Record<string, string | boolean>): Promise<void> {
  const paths = initializeDataDirectory();
  const config = readConfig();
  const detected = detectClients();
  const supplied = parseList(optionString(options.client));
  let clients = supplied.length ? validateClients(supplied) : detected;

  const suppliedScope = optionString(options.scope);
  let scope: SetupScope = suppliedScope ? validateScope(suppliedScope) : "user";
  const projectDirectory = process.cwd();
  const captureModeInput = optionString(options["capture-mode"]);

  const interactive = stdin.isTTY && stdout.isTTY;
  if (interactive) {
    intro("Configure Learning Lessons", common);
  }
  const captureMode = captureModeInput
    ? validateCaptureMode(captureModeInput)
    : await chooseCaptureMode(config.captureMode, interactive);
  if (!options["dry-run"] && captureMode !== config.captureMode) {
    writeConfig({ ...config, captureMode });
  }
  if (!supplied.length && interactive) {
    note("Pick the AI clients that should receive the MCP server configuration.", "Setup", common);
    const selected = await multiselect({
      message: "Clients to configure",
      options: supportedClientOptions(detected),
      initialValues: detected,
      required: false,
      ...common,
    });
    clients = isCancel(selected) ? detected : validateClients(selected);
  }

  if (!suppliedScope && interactive) {
    const selectedScope = await select({
      message: "Where should fixmind be configured?",
      options: [
        { value: "user", label: "This device", hint: "Available in every project (~/.claude, ~/.cursor, ...)" },
        { value: "project", label: "This project only", hint: `Stored inside ${projectDirectory}` },
      ],
      initialValue: "user",
      ...common,
    });
    scope = isCancel(selectedScope) ? "user" : (selectedScope as SetupScope);
  }

  if (clients.length === 0) {
    console.log("No supported clients detected. Add this configuration to any stdio MCP client:");
    console.log(JSON.stringify(genericMcpConfiguration(), null, 2));
    return;
  }

  const dryRun = Boolean(options["dry-run"]);
  const setupOptions = { clients, scope, projectDirectory, dryRun };
  const results = configureClients(setupOptions);
  const instructions = configureInstructions(setupOptions);
  const permissions = configurePermissions(setupOptions);
  logSetupResults(paths.directory, scope, captureMode, results, instructions, permissions, projectDirectory);

  if (!logSetupFollowUp(options, interactive)) return;
  await handleSetupNextAction(options);
}

function setupSummaryLine(scope: SetupScope, projectDirectory: string): string {
  return scope === "project"
    ? `Scope: this project only (${projectDirectory}).`
    : "Scope: this device (every project).";
}

function logSetupResults(
  pathsDirectory: string,
  scope: SetupScope,
  captureMode: "strict" | "balanced",
  results: Array<{ client: string; status: string; detail: string }>,
  instructions: Array<{ client: string; status: string; filePath: string }>,
  permissions: Array<{ client: string; status: string; filePath: string }>,
  projectDirectory: string,
): void {
  console.log(`Local data initialized at ${pathsDirectory}.`);
  console.log(setupSummaryLine(scope, projectDirectory));
  console.log(`Capture mode: ${captureMode}.`);
  for (const result of results) console.log(`${result.client}: ${result.status} - ${result.detail}`);
  for (const result of instructions) console.log(`${result.client} instructions: ${result.status} - ${result.filePath}`);
  for (const result of permissions) console.log(`${result.client} permissions: ${result.status} - ${result.filePath}`);
  console.log("Restart configured AI clients so they discover the MCP server.");
}

function logSetupFollowUp(options: Record<string, string | boolean>, interactive: boolean): boolean {
  if (Boolean(options["dry-run"]) || options["no-dashboard"] || !interactive) {
    console.log("Run `npx fixmind dashboard` to open the local dashboard, or `npx fixmind login` to enable sync.");
    return false;
  }
  return true;
}

async function handleSetupNextAction(options: Record<string, string | boolean>): Promise<void> {
  const nextAction = await select({
    message: "What would you like to do next?",
    options: [
      { value: "dashboard", label: "Open dashboard", hint: "Launch the local dashboard in your browser." },
      { value: "login", label: "Sign in now", hint: "Set up encrypted sync on this machine." },
      { value: "done", label: "Finish setup", hint: "Return to the terminal without opening anything." },
    ],
    initialValue: "done",
    ...common,
  });

  if (isCancel(nextAction) || nextAction === "done") return;
  if (nextAction === "login") {
    await launchLoginCommand();
    return;
  }

  const { startDashboard } = await import("./dashboard.js");
  try {
    const handle = await startDashboard({ port: optionalPort(options.port), open: true });
    console.log(`Fixmind dashboard: ${handle.url}`);
    console.log("Press Ctrl+C to stop.");
  } catch (error) {
    if (isAddressInUseError(error)) {
      const port = optionalPort(options.port) ?? 4317;
      console.log(`Dashboard is already running on 127.0.0.1:${port}; skipping a second launch.`);
      return;
    }
    throw error;
  }
}

export async function settingsCommand(options: Record<string, string | boolean>): Promise<void> {
  initializeDataDirectory();
  const current = readConfig();
  const interactive = stdin.isTTY && stdout.isTTY;
  const captureModeInput = optionString(options["capture-mode"]);
  const captureMode = captureModeInput ? validateCaptureMode(captureModeInput) : await chooseCaptureMode(current.captureMode, interactive);
  const next = { ...current, captureMode };
  writeConfig(next);
  console.log(`Capture mode set to ${captureMode}.`);
  console.log(
    captureMode === "balanced"
      ? "Balanced mode captures more borderline fixes; the quality gate still rejects shallow lessons."
      : "Strict mode keeps capture conservative and only logs clear learning-worthy fixes.",
  );
}

async function chooseCaptureMode(
  current: "strict" | "balanced",
  interactive = stdin.isTTY && stdout.isTTY,
): Promise<"strict" | "balanced"> {
  if (!interactive) return current;

  const selected = await select({
    message: "Capture mode",
    options: [
      { value: "strict", label: "Strict", hint: "Default. Capture only clear, learning-worthy fixes." },
      { value: "balanced", label: "Balanced", hint: "Capture more borderline fixes, while still rejecting junk." },
    ],
    initialValue: current,
    ...common,
  });
  return isCancel(selected) ? current : (selected as "strict" | "balanced");
}

function validateCaptureMode(value: string): "strict" | "balanced" {
  if (value !== "strict" && value !== "balanced") {
    throw new Error("Unsupported capture mode: use strict or balanced.");
  }
  return value;
}

async function launchLoginCommand(): Promise<void> {
  const launcherPath = fileURLToPath(new URL("./launcher.js", import.meta.url));
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [launcherPath, "login"], {
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fixmind login exited with code ${code ?? "unknown"}.`));
    });
  });
}

export async function loginCommand(options: Record<string, string | boolean>): Promise<void> {
  initializeDataDirectory();
  const store = createLessonStore();
  const interactive = stdin.isTTY && stdout.isTTY;
  try {
    const engine = createSyncEngine(store);
    const { supabaseUrl, supabaseAnonKey } = resolveSupabaseCredentials(options);

    if (interactive) intro("Fixmind login", common);

    const result = await performLogin(engine, options, interactive, supabaseUrl, supabaseAnonKey);

    const message = result.entitled
      ? greenText(`Logged in as ${result.email}. Sync is active.`)
      : `Signed in as ${result.email}. An active Pro or Team plan is required to enable sync. ` +
        `Subscribe at ${PRICING_URL} to start syncing, then run \`npx fixmind sync push\`.`; 

    console.log(message);
  } finally {
    store.close();
  }
}

async function promptPassphrase(interactive: boolean): Promise<string> {
  if (!interactive) {
    throw new Error("--passphrase is required outside an interactive terminal.");
  }

  while (true) {
    const value = unwrap(
      await password({
        message: "Sync encryption passphrase (encrypts lessons before they sync; use the same one on every machine)",
        ...common,
      }),
    );
    if (value.trim()) return value;
    log.message("Passphrase cannot be empty. Try again.", common);
  }
}

function isIncorrectPassphraseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Incorrect passphrase for this sync account/i.test(message);
}

function resolveSupabaseCredentials(options: Record<string, string | boolean>): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  return {
    supabaseUrl: optionString(options.url) ?? process.env.FIXMIND_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
    supabaseAnonKey: optionString(options.key) ?? process.env.FIXMIND_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY,
  };
}

async function performLogin(
  engine: ReturnType<typeof createSyncEngine>,
  options: Record<string, string | boolean>,
  interactive: boolean,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<{ email: string; entitled: boolean; session: { accessToken: string; refreshToken: string } }> {
  const usePasswordLogin = Boolean(optionString(options.email) || options["password-login"]);
  const fixedPassphrase = optionString(options.passphrase);
  if (usePasswordLogin) {
    return loginWithPassword(engine, options, interactive, supabaseUrl, supabaseAnonKey, fixedPassphrase);
  }
  return interactive
    ? loginWithGithubInteractive(engine, supabaseUrl, supabaseAnonKey, fixedPassphrase)
    : loginWithGithubNonInteractive(engine, supabaseUrl, supabaseAnonKey, fixedPassphrase);
}

async function loginWithPassword(
  engine: ReturnType<typeof createSyncEngine>,
  options: Record<string, string | boolean>,
  interactive: boolean,
  supabaseUrl: string,
  supabaseAnonKey: string,
  fixedPassphrase: string | undefined,
): Promise<{ email: string; entitled: boolean; session: { accessToken: string; refreshToken: string } }> {
  return retryIncorrectPassphrase(interactive, fixedPassphrase, async (passphrase) => {
    const email = optionString(options.email) ?? (interactive
      ? unwrap(await text({ message: "Email", ...common }))
      : (() => { throw new Error("Usage: fixmind login --email <email> --password <password> --passphrase <passphrase>"); })());
    const userPassword = optionString(options.password) ?? (interactive
      ? unwrap(await password({ message: "Password", ...common }))
      : (() => { throw new Error("--password is required outside an interactive terminal."); })());
    return engine.login({ supabaseUrl, supabaseAnonKey, email, password: userPassword, passphrase });
  });
}

async function loginWithGithubInteractive(
  engine: ReturnType<typeof createSyncEngine>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  fixedPassphrase: string | undefined,
): Promise<{ email: string; entitled: boolean; session: { accessToken: string; refreshToken: string } }> {
  let spinnerHandle = startSpinner("Opening your browser to sign in with GitHub...");
  let fallbackUrl: string | undefined;
  try {
    const githubSession = await engine.loginWithGithub({
      supabaseUrl,
      supabaseAnonKey,
      onAuthUrl: (url) => {
        fallbackUrl = url;
        spinnerHandle.stop("Browser opened.");
        log.message(`Didn't open? ${terminalLink("Click here to sign in", url)}`, common);
        spinnerHandle = startSpinner("Waiting for authentication...");
      },
    });
    spinnerHandle.stop("GitHub sign-in complete. Enter your sync passphrase.");
    return completeGithubLogin(engine, supabaseUrl, supabaseAnonKey, githubSession, fixedPassphrase, true);
  } catch (error) {
    spinnerHandle.stop("GitHub sign in failed.");
    if (fallbackUrl) {
      log.message(`If the browser didn't open: ${terminalLink("Click here to sign in", fallbackUrl)}`, common);
    }
    throw error;
  }
}

async function loginWithGithubNonInteractive(
  engine: ReturnType<typeof createSyncEngine>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  fixedPassphrase: string | undefined,
): Promise<{ email: string; entitled: boolean; session: { accessToken: string; refreshToken: string } }> {
  const githubSession = await engine.loginWithGithub({
    supabaseUrl,
    supabaseAnonKey,
    onAuthUrl: (url) => console.log(`Opening your browser to sign in with GitHub...\nIf it doesn't open, visit: ${url}`),
  });
  return completeGithubLogin(engine, supabaseUrl, supabaseAnonKey, githubSession, fixedPassphrase, false);
}

async function completeGithubLogin(
  engine: ReturnType<typeof createSyncEngine>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  githubSession: { email: string; userId: string; session: { accessToken: string; refreshToken: string } },
  fixedPassphrase: string | undefined,
  interactive: boolean,
): Promise<{ email: string; entitled: boolean; session: { accessToken: string; refreshToken: string } }> {
  return retryIncorrectPassphrase(interactive, fixedPassphrase, async (passphrase) => engine.completeGithubLogin({
    supabaseUrl,
    supabaseAnonKey,
    email: githubSession.email,
    userId: githubSession.userId,
    session: githubSession.session,
    passphrase,
  }));
}

export async function logoutCommand(): Promise<void> {
  initializeDataDirectory();
  const store = createLessonStore();
  try {
    const engine = createSyncEngine(store);
    engine.logout();
    console.log("Logged out.");
  } finally {
    store.close();
  }
}

export async function syncCommand(sub: string | undefined): Promise<void> {
  if (!sub || !["push", "pull", "status"].includes(sub)) {
    throw new Error("Usage: fixmind sync <push|pull|status>");
  }

  initializeDataDirectory();
  const store = createLessonStore();
  try {
    const engine = createSyncEngine(store);

    if (sub === "status") {
      await printSyncStatus(engine);
      return;
    }

    if (sub === "push") {
      await pushSync(engine);
      return;
    }

    if (sub === "pull") {
      await pullSync(engine);
      return;
    }
  } finally {
    store.close();
  }
}

async function printSyncStatus(
  engine: ReturnType<typeof createSyncEngine>,
): Promise<void> {
  const status = await engine.status();
  if (!status.loggedIn) {
    console.log(status.needsReauth ? "Sync session expired. Run `npx fixmind login` again." : "Not logged in. Run `npx fixmind login`.");
    return;
  }
  if (!status.syncEnabled) {
    console.log(`Signed in as ${status.email}. Sync is not active on this account.`);
  } else {
    console.log(`Logged in as ${status.email}.`);
    console.log("Encrypted sync is on.");
  }
  console.log(`Last push: ${status.lastPushedAt ?? "never"}`);
  console.log(`Last pull: ${status.lastPulledAt ?? "never"}`);
}

async function pushSync(engine: ReturnType<typeof createSyncEngine>): Promise<void> {
  const result = await engine.push();
  console.log(`Pushed ${result.pushed} lesson(s).`);
}

async function pullSync(engine: ReturnType<typeof createSyncEngine>): Promise<void> {
  const result = await engine.pull();
  console.log(`Pulled ${result.pulled} change(s), applied ${result.applied} update(s) locally.`);
}

async function retryIncorrectPassphrase<T>(
  interactive: boolean,
  fixedPassphrase: string | undefined,
  action: (passphrase: string) => Promise<T>,
): Promise<T> {
  for (;;) {
    const passphrase = fixedPassphrase ?? await promptPassphrase(interactive);
    try {
      return await action(passphrase);
    } catch (error) {
      if (interactive && isIncorrectPassphraseError(error) && !fixedPassphrase) {
        log.message("That passphrase did not match this sync account. Try again.", common);
        continue;
      }
      throw error;
    }
  }
}
