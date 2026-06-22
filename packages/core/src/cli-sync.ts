import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stdin, stdout } from "node:process";
import { isCancel, log, outro, password } from "@clack/prompts";
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
  text,
} from "./cli-utils.js";
import { configureClients, configureInstructions, configurePermissions, detectClients, genericMcpConfiguration } from "./setup.js";

const DEFAULT_SUPABASE_URL = "https://jpczzgekindvuivnwjuw.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwY3p6Z2VraW5kdnVpdm53anV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzEyMjEsImV4cCI6MjA5NzY0NzIyMX0.qG-9H5BZi3sKHVQrzL3iI9ALmJgoTizLCU4Bxzpw0Bo";

export async function setup(options: Record<string, string | boolean>): Promise<void> {
  const paths = initializeDataDirectory();
  const detected = detectClients();
  const supplied = parseList(optionString(options.client));
  let clients = supplied.length ? validateClients(supplied) : detected;

  const suppliedScope = optionString(options.scope);
  let scope: SetupScope = suppliedScope ? validateScope(suppliedScope) : "user";
  const projectDirectory = process.cwd();

  const interactive = stdin.isTTY && stdout.isTTY;
  if (!supplied.length && interactive) {
    intro("Configure Learning Lessons", common);
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
  console.log(`Local data initialized at ${paths.directory}.`);
  console.log(scope === "project" ? `Scope: this project only (${projectDirectory}).` : "Scope: this device (every project).");
  for (const result of results) console.log(`${result.client}: ${result.status} - ${result.detail}`);
  for (const result of instructions) console.log(`${result.client} instructions: ${result.status} - ${result.filePath}`);
  for (const result of permissions) console.log(`${result.client} permissions: ${result.status} - ${result.filePath}`);
  console.log("Restart configured AI clients so they discover the MCP server.");

  if (dryRun || options["no-dashboard"] || !interactive) {
    console.log("Run `npx fixmind dashboard` to open the local dashboard, or `npx fixmind login` to enable sync.");
    return;
  }

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

  if (isCancel(nextAction) || nextAction === "done") {
    return;
  }

  if (nextAction === "login") {
    await launchLoginCommand();
    return;
  }

  if (nextAction === "dashboard") {
    const { startDashboard } = await import("./dashboard.js");
    try {
      const handle = await startDashboard({ port: optionalPort(options.port), open: true });
      console.log(`Fixmind dashboard: ${handle.url}`);
      console.log("Press Ctrl+C to stop.");
    } catch (error) {
      if (isAddressInUseError(error)) {
        const port = optionalPort(options.port) ?? 4317;
        console.log(`Dashboard is already running on 127.0.0.1:${port}; skipping a second launch.`);
      } else {
        throw error;
      }
    }
  }
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
    const supabaseUrl = optionString(options.url) ?? process.env.FIXMIND_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
    const supabaseAnonKey = optionString(options.key) ?? process.env.FIXMIND_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;

    if (interactive) intro("Fixmind login", common);
    const passphrase = optionString(options.passphrase) ?? await promptPassphrase(interactive);

    const usePasswordLogin = Boolean(optionString(options.email) || options["password-login"]);
    let result: { email: string; entitled: boolean };
    if (usePasswordLogin) {
      const email = optionString(options.email) ?? (interactive
        ? unwrap(await text({ message: "Email", ...common }))
        : (() => { throw new Error("Usage: fixmind login --email <email> --password <password> --passphrase <passphrase>"); })());
      const userPassword = optionString(options.password) ?? (interactive
        ? unwrap(await password({ message: "Password", ...common }))
        : (() => { throw new Error("--password is required outside an interactive terminal."); })());
      result = await engine.login({ supabaseUrl, supabaseAnonKey, email, password: userPassword, passphrase });
    } else if (interactive) {
      let s = startSpinner("Opening your browser to sign in with GitHub...");
      let fallbackUrl: string | undefined;
      try {
        result = await engine.loginWithGithub({
          supabaseUrl,
          supabaseAnonKey,
          passphrase,
          onAuthUrl: (url) => {
            fallbackUrl = url;
            s.stop("Browser opened.");
            log.message(`Didn't open? ${terminalLink("Click here to sign in", url)}`, common);
            s = startSpinner("Waiting for sign in to finish in your browser...");
          },
        });
        s.stop("Signed in with GitHub.");
      } catch (error) {
        s.stop("GitHub sign in failed.");
        if (fallbackUrl) log.message(`If the browser didn't open: ${terminalLink("Click here to sign in", fallbackUrl)}`, common);
        throw error;
      }
    } else {
      result = await engine.loginWithGithub({
        supabaseUrl,
        supabaseAnonKey,
        passphrase,
        onAuthUrl: (url) => console.log(`Opening your browser to sign in with GitHub...\nIf it doesn't open, visit: ${url}`),
      });
    }

    const message = result.entitled
      ? `Logged in as ${result.email}. Sync is active.`
      : `Signed in as ${result.email}, but you don't have an active Pro or Team plan yet. ` +
        `Subscribe at ${PRICING_URL} to start syncing - no need to log in again afterward, just run \`npx fixmind sync push\`.`;

    if (interactive) {
      outro(message, common);
    } else {
      console.log(message);
    }
  } finally {
    store.close();
  }
}

async function promptPassphrase(interactive: boolean): Promise<string> {
  if (!interactive) {
    throw new Error("--passphrase is required outside an interactive terminal.");
  }

  while (true) {
    const value = unwrap(await password({ message: "Sync encryption passphrase (use the same one on every machine)", ...common }));
    if (value.trim()) return value;
    log.message("Passphrase cannot be empty. Try again.", common);
  }
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
      return;
    }

    if (sub === "push") {
      const result = await engine.push();
      console.log(`Pushed ${result.pushed} lesson(s).`);
      return;
    }

    if (sub === "pull") {
      const result = await engine.pull();
      console.log(`Pulled ${result.pulled} change(s), applied ${result.applied} update(s) locally.`);
      return;
    }
  } finally {
    store.close();
  }
}
