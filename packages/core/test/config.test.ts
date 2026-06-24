import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildMcpInstructions } from "../src/mcp.js";
import { readConfig, writeConfig } from "../src/config.js";

test("config defaults to strict capture mode", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-config-"));
  const filePath = path.join(home, "config.json");
  try {
    const config = readConfig(filePath);
    assert.equal(config.captureMode, "strict");
    assert.equal(config.reviewIntervalsDays.understood, 7);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("config writes and reads balanced capture mode", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-config-balanced-"));
  const filePath = path.join(home, "config.json");
  try {
    writeConfig({
      version: 1,
      reviewIntervalsDays: { understood: 7, partial: 3, copied_blindly: 1 },
      captureMode: "balanced",
    }, filePath);
    assert.equal(readConfig(filePath).captureMode, "balanced");
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test("MCP instructions include the selected capture mode", () => {
  const strict = buildMcpInstructions("strict");
  const balanced = buildMcpInstructions("balanced");
  assert.match(strict, /Capture mode: strict/);
  assert.match(balanced, /Capture mode: balanced/);
  assert.notEqual(strict, balanced);
});

test("MCP instructions require architectural context for boundary failures", () => {
  const instructions = buildMcpInstructions("strict");
  assert.match(instructions, /ARCHITECTURAL BOUNDARY/);
  assert.match(instructions, /Expo app runs in a Metro device bundle/);
  assert.match(instructions, /typed API\s+client/);
});
