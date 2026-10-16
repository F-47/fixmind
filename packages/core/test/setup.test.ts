import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  configureClients,
  configureInstructions,
  configurePermissions,
  genericMcpConfiguration,
  mcpServerCommand,
} from "../src/setup.js";

test("builds a Windows-compatible local MCP command", () => {
  assert.deepEqual(mcpServerCommand("win32"), {
    command: "cmd",
    args: ["/c", "npx", "-y", "fixmind", "mcp"],
  });
  assert.deepEqual(genericMcpConfiguration("linux"), {
    mcpServers: {
      fixmind: {
        command: "npx",
        args: ["-y", "fixmind", "mcp"],
      },
    },
  });
});

test("configures Cursor without deleting existing servers and is idempotent", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-setup-"));
  const cursorDirectory = path.join(home, ".cursor");
  const configPath = path.join(cursorDirectory, "mcp.json");
  fs.mkdirSync(cursorDirectory, { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      mcpServers: { existing: { command: "existing-server" } },
      setting: true,
    }),
    "utf8",
  );

  try {
    const first = configureClients({ clients: ["cursor"], homeDirectory: home, platform: "win32" });
    assert.equal(first[0].status, "configured");
    assert.ok(fs.existsSync(`${configPath}.backup`));
    // biome-ignore lint/suspicious/noExplicitAny: this test intentionally probes an untyped external JSON config
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, any>;
    assert.equal(config.setting, true);
    assert.equal(config.mcpServers.existing.command, "existing-server");
    assert.equal(config.mcpServers.fixmind.command, "cmd");

    const second = configureClients({
      clients: ["cursor"],
      homeDirectory: home,
      platform: "win32",
    });
    assert.equal(second[0].status, "already_configured");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("uses official CLI registration commands for Codex and Claude", () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const run = (command: string, args: string[]): string => {
    calls.push({ command, args });
    if (args[1] === "get") throw new Error("not configured");
    return "";
  };
  const results = configureClients({
    clients: ["codex", "claude"],
    platform: "linux",
    run,
  });

  assert.equal(
    results.every((result) => result.status === "configured"),
    true,
  );
  assert.deepEqual(calls[1], {
    command: "codex",
    args: ["mcp", "add", "fixmind", "--", "npx", "-y", "fixmind", "mcp"],
  });
  assert.deepEqual(calls[3], {
    command: "claude",
    args: ["mcp", "add", "--scope", "user", "fixmind", "--", "npx", "-y", "fixmind", "mcp"],
  });
});

test("reports unavailable CLI clients instead of crashing when the binary is missing", () => {
  const run = (command: string, args: string[]): string => {
    if (args[1] === "get") {
      const error = new Error("spawnSync codex ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return command;
  };

  const results = configureClients({
    clients: ["codex"],
    platform: "linux",
    run,
  });

  assert.equal(results[0].status, "unavailable");
  assert.match(results[0].detail, /not available on PATH/);
});

test("injects instructions into Claude, Codex, and Cursor files", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-instructions-"));
  try {
    const results = configureInstructions({
      clients: ["claude", "codex", "cursor"],
      homeDirectory: home,
    });
    assert.equal(results.length, 3);
    assert.equal(
      results.every((r) => r.status === "written"),
      true,
    );

    const claudeMd = fs.readFileSync(path.join(home, ".claude", "CLAUDE.md"), "utf8");
    assert.ok(claudeMd.includes("fixmind:instructions:start"));
    assert.ok(claudeMd.includes("save_lesson"));

    const agentsMd = fs.readFileSync(path.join(home, "AGENTS.md"), "utf8");
    assert.ok(agentsMd.includes("fixmind:instructions:start"));

    const cursorMdc = fs.readFileSync(path.join(home, ".cursor", "rules", "fixmind.mdc"), "utf8");
    assert.ok(cursorMdc.includes("alwaysApply: true"));
    assert.ok(cursorMdc.includes("save_lesson"));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("instruction injection is idempotent", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-instructions-idem-"));
  try {
    configureInstructions({ clients: ["claude"], homeDirectory: home });
    const first = fs.readFileSync(path.join(home, ".claude", "CLAUDE.md"), "utf8");

    const second = configureInstructions({ clients: ["claude"], homeDirectory: home });
    assert.equal(second[0].status, "already_configured");
    const after = fs.readFileSync(path.join(home, ".claude", "CLAUDE.md"), "utf8");
    assert.equal(first, after);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("instruction injection appends to existing CLAUDE.md without overwriting it", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-instructions-append-"));
  const claudeDir = path.join(home, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, "CLAUDE.md"), "# My rules\n\nDo something.\n", "utf8");
  try {
    configureInstructions({ clients: ["claude"], homeDirectory: home });
    const content = fs.readFileSync(path.join(claudeDir, "CLAUDE.md"), "utf8");
    assert.ok(content.startsWith("# My rules"));
    assert.ok(content.includes("fixmind:instructions:start"));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("configures OpenCode by editing the user config file without deleting other servers", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-opencode-"));
  const configDir = path.join(home, ".config", "opencode");
  const configPath = path.join(configDir, "opencode.json");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      mcp: { existing: { type: "local", command: ["node", "server.js"] } },
    }),
    "utf8",
  );
  try {
    const first = configureClients({
      clients: ["opencode"],
      homeDirectory: home,
      platform: "linux",
    });
    assert.equal(first[0].status, "configured");

    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as unknown as {
      model: string;
      mcp: Record<string, { type: string; command: string[]; enabled: boolean }>;
    };
    assert.equal(config.model, "anthropic/claude-sonnet-4-5");
    assert.deepEqual(config.mcp.fixmind, {
      type: "local",
      command: ["npx", "-y", "fixmind", "mcp"],
      enabled: true,
    });
    assert.deepEqual(config.mcp.existing.command, ["node", "server.js"]);

    const second = configureClients({
      clients: ["opencode"],
      homeDirectory: home,
      platform: "linux",
    });
    assert.equal(second[0].status, "already_configured");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("writes OpenCode project scope next to the project instead of the home config", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-opencode-proj-"));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-opencode-prj2-"));
  try {
    const results = configureClients({
      clients: ["opencode"],
      homeDirectory: home,
      projectDirectory: project,
      scope: "project",
      platform: "linux",
    });
    assert.equal(results[0].status, "configured");
    assert.ok(!fs.existsSync(path.join(home, ".config", "opencode", "opencode.json")));
    const config = fs.readFileSync(path.join(project, "opencode.json"), "utf8");
    assert.match(config, /"fixmind"/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("configures VS Code, Copilot CLI, and Pi config files", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-json-clients-"));
  try {
    const [vscode, copilot, pi] = configureClients({
      clients: ["vscode", "copilot", "pi"],
      homeDirectory: home,
      platform: "linux",
    });

    assert.equal(vscode.status, "configured");
    const vscodeConfigPath = path.join(home, ".config", "Code", "User", "mcp.json");
    const vscodeConfig = JSON.parse(fs.readFileSync(vscodeConfigPath, "utf8")) as unknown as {
      servers: Record<string, { type: string; command: string; args: string[] }>;
    };
    assert.equal(vscodeConfig.servers.fixmind.type, "stdio");
    assert.equal(vscodeConfig.servers.fixmind.command, "npx");

    assert.equal(copilot.status, "configured");
    const copilotConfigPath = path.join(home, ".copilot", "mcp-config.json");
    const copilotConfig = JSON.parse(fs.readFileSync(copilotConfigPath, "utf8")) as unknown as {
      mcpServers: Record<string, { command: string; args: string[] }>;
    };
    assert.deepEqual(copilotConfig.mcpServers.fixmind.args, ["-y", "fixmind", "mcp"]);

    assert.equal(pi.status, "configured");
    const piConfigPath = path.join(home, ".pi", "agent", "mcp.json");
    const piConfig = JSON.parse(fs.readFileSync(piConfigPath, "utf8")) as unknown as {
      mcpServers: Record<string, { command: string }>;
    };
    assert.equal(piConfig.mcpServers.fixmind.command, "npx");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("writes VS Code project scope into .vscode/mcp.json and resolves the Windows user profile path", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-vscode-"));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-vscode-prj-"));
  try {
    const userResults = configureClients({
      clients: ["vscode"],
      homeDirectory: home,
      platform: "win32",
    });
    assert.equal(
      userResults[0].detail,
      `Updated ${path.join(home, "AppData", "Roaming", "Code", "User", "mcp.json")}`,
    );

    const projectResults = configureClients({
      clients: ["vscode"],
      homeDirectory: home,
      projectDirectory: project,
      scope: "project",
      platform: "win32",
    });
    assert.equal(projectResults[0].detail, `Updated ${path.join(project, ".vscode", "mcp.json")}`);
    assert.match(fs.readFileSync(path.join(project, ".vscode", "mcp.json"), "utf8"), /"servers"/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("refuses to rewrite JSON config files containing comments", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-jsonc-"));
  const configDir = path.join(home, ".config", "opencode");
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, "opencode.json"),
    '{\n  // my comment\n  "model": "x"\n}\n',
    "utf8",
  );
  try {
    assert.throws(
      () => configureClients({ clients: ["opencode"], homeDirectory: home, platform: "linux" }),
      /JSON comments/,
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("writes OpenCode instructions to the global config directory and skips unsupported user-scope clients", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-new-clients-"));
  try {
    const results = configureInstructions({
      clients: ["opencode", "vscode", "copilot", "pi"],
      homeDirectory: home,
    });
    const [opencode, vscode, copilot, pi] = results;
    assert.equal(opencode.status, "written");
    assert.equal(opencode.filePath, path.join(home, ".config", "opencode", "AGENTS.md"));
    assert.ok(fs.readFileSync(opencode.filePath, "utf8").includes("save_lesson"));

    assert.equal(vscode.status, "not_supported");
    assert.match(vscode.detail ?? "", /copilot-instructions\.md|project scope/i);
    assert.equal(copilot.status, "not_supported");
    assert.equal(pi.status, "not_supported");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("writes project-scope instructions for VS Code, Copilot CLI, and Pi", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-project-instr-"));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-project-instr2-"));
  try {
    const results = configureInstructions({
      clients: ["vscode", "copilot", "pi"],
      homeDirectory: home,
      projectDirectory: project,
      scope: "project",
    });
    assert.equal(results[0].filePath, path.join(project, ".github", "copilot-instructions.md"));
    assert.equal(results[1].filePath, path.join(project, ".github", "copilot-instructions.md"));
    assert.equal(results[2].filePath, path.join(project, "AGENTS.md"));
    // VS Code and Copilot share the same instruction file, so the second write is a no-op.
    assert.equal(results[1].status, "already_configured");
    const content = fs.readFileSync(results[0].filePath, "utf8");
    assert.ok(content.includes("fixmind:instructions:start"));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test("refuses to overwrite malformed Cursor JSON", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-setup-invalid-"));
  const cursorDirectory = path.join(home, ".cursor");
  fs.mkdirSync(cursorDirectory, { recursive: true });
  fs.writeFileSync(path.join(cursorDirectory, "mcp.json"), "{ invalid", "utf8");
  try {
    assert.throws(
      () => configureClients({ clients: ["cursor"], homeDirectory: home }),
      /contains invalid JSON/,
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("configures Claude permissions in a fresh settings.json", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-permissions-"));
  try {
    const results = configurePermissions({ clients: ["claude"], homeDirectory: home });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, "configured");
    const filePath = path.join(home, ".claude", "settings.json");
    // biome-ignore lint/suspicious/noExplicitAny: this test intentionally probes an untyped external JSON config
    const config = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, any>;
    assert.deepEqual(config.permissions.allow, ["mcp__fixmind__save_lesson"]);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("Claude permission configuration is idempotent", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-permissions-idem-"));
  try {
    configurePermissions({ clients: ["claude"], homeDirectory: home });
    const filePath = path.join(home, ".claude", "settings.json");
    const first = fs.readFileSync(filePath, "utf8");

    const second = configurePermissions({ clients: ["claude"], homeDirectory: home });
    assert.equal(second[0].status, "already_configured");
    assert.equal(fs.readFileSync(filePath, "utf8"), first);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("merges Claude permissions without clobbering existing settings", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-permissions-merge-"));
  const claudeDir = path.join(home, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  const filePath = path.join(claudeDir, "settings.json");
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      enabledPlugins: { "rust-analyzer-lsp@claude-plugins-official": true },
      autoUpdatesChannel: "latest",
      mcpServers: {
        context7: {
          type: "stdio",
          command: "cmd",
          args: ["/c", "npx", "-y", "@upstash/context7-mcp@latest"],
        },
      },
      theme: "dark-daltonized",
      permissions: {
        allow: ["mcp__context7__resolve-library-id"],
        deny: ["Bash(rm -rf *)"],
      },
    }),
    "utf8",
  );

  try {
    const results = configurePermissions({ clients: ["claude"], homeDirectory: home });
    assert.equal(results[0].status, "configured");
    assert.ok(fs.existsSync(`${filePath}.backup`));

    // biome-ignore lint/suspicious/noExplicitAny: this test intentionally probes an untyped external JSON config
    const config = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, any>;
    assert.equal(config.autoUpdatesChannel, "latest");
    assert.equal(config.theme, "dark-daltonized");
    assert.deepEqual(config.mcpServers.context7.args, [
      "/c",
      "npx",
      "-y",
      "@upstash/context7-mcp@latest",
    ]);
    assert.deepEqual(config.permissions.allow, [
      "mcp__context7__resolve-library-id",
      "mcp__fixmind__save_lesson",
    ]);
    assert.deepEqual(config.permissions.deny, ["Bash(rm -rf *)"]);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("refuses to overwrite malformed Claude settings.json", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-permissions-invalid-"));
  const claudeDir = path.join(home, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, "settings.json"), "{ invalid", "utf8");
  try {
    assert.throws(
      () => configurePermissions({ clients: ["claude"], homeDirectory: home }),
      /contains invalid JSON/,
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("does not configure permissions for codex or cursor", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-permissions-skip-"));
  try {
    const results = configurePermissions({ clients: ["codex", "cursor"], homeDirectory: home });
    assert.equal(results.length, 0);
    assert.ok(!fs.existsSync(path.join(home, ".claude", "settings.json")));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});
