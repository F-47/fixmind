import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { configPath, databasePath, dataDirectory } from "../src/paths.js";

test("CLI and desktop share the default Fixmind data directory", () => {
  const previous = process.env.FIXMIND_DATA_DIR;
  delete process.env.FIXMIND_DATA_DIR;

  try {
    const directory = path.join(os.homedir(), ".fixmind");
    assert.equal(dataDirectory(), directory);
    assert.equal(databasePath(), path.join(directory, "learning.db"));
    assert.equal(configPath(), path.join(directory, "config.json"));
  } finally {
    if (previous === undefined) delete process.env.FIXMIND_DATA_DIR;
    else process.env.FIXMIND_DATA_DIR = previous;
  }
});

test("CLI and desktop honor the same explicit data directory override", () => {
  const previous = process.env.FIXMIND_DATA_DIR;
  process.env.FIXMIND_DATA_DIR = path.join("relative", "fixmind-data");

  try {
    const directory = path.resolve("relative", "fixmind-data");
    assert.equal(dataDirectory(), directory);
    assert.equal(databasePath(), path.join(directory, "learning.db"));
    assert.equal(configPath(), path.join(directory, "config.json"));
  } finally {
    if (previous === undefined) delete process.env.FIXMIND_DATA_DIR;
    else process.env.FIXMIND_DATA_DIR = previous;
  }
});
