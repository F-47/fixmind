import assert from "node:assert/strict";
import test from "node:test";
import {
  nodeVersionSatisfiesMinimum,
  shouldRunLauncher,
  unsupportedNodeMessage,
} from "../src/launcher.js";

test("launcher rejects Node versions without unflagged node:sqlite", () => {
  assert.equal(nodeVersionSatisfiesMinimum("v22.12.0"), false);
  assert.equal(nodeVersionSatisfiesMinimum("22.12.9"), false);
  assert.equal(nodeVersionSatisfiesMinimum("v22.13.0"), true);
  assert.equal(nodeVersionSatisfiesMinimum("v22.14.0"), true);
  assert.equal(nodeVersionSatisfiesMinimum("v23.0.0"), true);
  assert.equal(nodeVersionSatisfiesMinimum("v24.0.0"), true);
});

test("unsupported Node message explains how to recover", () => {
  const message = unsupportedNodeMessage("v22.12.0");
  assert.match(message, /requires Node\.js 22\.13\.0 or newer/);
  assert.match(message, /You are using v22\.12\.0/);
  assert.match(message, /npx fixmind setup/);
});

test("launcher runs for npm shim entrypoints", () => {
  assert.equal(shouldRunLauncher("/usr/local/bin/fixmind"), true);
  assert.equal(shouldRunLauncher("/usr/local/bin/fixmind.cmd"), true);
  assert.equal(shouldRunLauncher("/home/user/project/dist/src/launcher.js"), true);
  assert.equal(shouldRunLauncher("/tmp/node-test-runner"), false);
});
