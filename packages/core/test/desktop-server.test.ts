import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SERVER_PATH = fileURLToPath(new URL("../src/desktop-server.js", import.meta.url));
const DASHBOARD_PATH = fileURLToPath(new URL("../dashboard", import.meta.url));

test("desktop server starts with explicit resources and shuts down cleanly", async () => {
  const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-desktop-server-"));
  const child = spawn(
    process.execPath,
    [SERVER_PATH, "--port", "0", "--data-dir", dataDirectory, "--dashboard-dir", DASHBOARD_PATH],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  try {
    const readyLine = await readLine(child.stdout);
    const ready = JSON.parse(readyLine) as { event: string; url: string };
    assert.equal(ready.event, "ready");
    assert.ok(fs.existsSync(path.join(dataDirectory, "learning.db")));

    const response = await fetch(ready.url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root"><\/div>/);

    child.stdin.write("shutdown\n");
    assert.equal(await exitCode(child), 0);
  } finally {
    if (child.exitCode === null) child.kill();
    fs.rmSync(dataDirectory, { recursive: true, force: true });
  }
});

async function readLine(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const onData = (chunk: Buffer) => {
      output += chunk.toString();
      const newline = output.indexOf("\n");
      if (newline === -1) return;
      cleanup();
      resolve(output.slice(0, newline));
    };
    const onEnd = () => {
      cleanup();
      reject(new Error(`Desktop server exited before readiness: ${output}`));
    };
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
    };
    stream.on("data", onData);
    stream.on("end", onEnd);
  });
}

async function exitCode(child: ReturnType<typeof spawn>): Promise<number | null> {
  if (child.exitCode !== null) return child.exitCode;
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
}
