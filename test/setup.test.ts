import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { configureClients, genericMcpConfiguration, mcpServerCommand } from "../src/setup.js";

test("builds a Windows-compatible local MCP command", () => {
  assert.deepEqual(mcpServerCommand("win32"), {
    command: "cmd",
    args: ["/c", "npx", "-y", "fixmind", "mcp"],
  });
  assert.deepEqual(genericMcpConfiguration("linux"), {
    mcpServers: {
      "fixmind": {
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
  fs.writeFileSync(configPath, JSON.stringify({
    mcpServers: { existing: { command: "existing-server" } },
    setting: true,
  }), "utf8");

  try {
    const first = configureClients({ clients: ["cursor"], homeDirectory: home, platform: "win32" });
    assert.equal(first[0].status, "configured");
    assert.ok(fs.existsSync(`${configPath}.backup`));
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, any>;
    assert.equal(config.setting, true);
    assert.equal(config.mcpServers.existing.command, "existing-server");
    assert.equal(config.mcpServers["fixmind"].command, "cmd");

    const second = configureClients({ clients: ["cursor"], homeDirectory: home, platform: "win32" });
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

  assert.equal(results.every((result) => result.status === "configured"), true);
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
