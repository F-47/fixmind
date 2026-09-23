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
