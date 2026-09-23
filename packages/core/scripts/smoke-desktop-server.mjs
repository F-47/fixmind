import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLessonStore } from "../dist/src/storage.js";
import { validateLessonInput } from "../dist/src/validation.js";

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(packageDirectory, "dist", "desktop-server");
const executablePath = path.join(
  outputDirectory,
  process.platform === "win32" ? "fixmind-server.exe" : "fixmind-server",
);
const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-sea-smoke-"));
const logFile = path.join(dataDirectory, "desktop.log");
const sessionToken = "packaged-smoke-session-token";
const lessonId = seedLesson(dataDirectory);
const child = spawn(
  executablePath,
  [
    "--port",
    "0",
    "--data-dir",
    dataDirectory,
    "--dashboard-dir",
    path.join(outputDirectory, "dashboard"),
    "--log-file",
    logFile,
    "--session-token",
    sessionToken,
  ],
  {
    env: { ...process.env, PATH: "" },
    stdio: ["pipe", "pipe", "pipe"],
  },
);

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  const ready = JSON.parse(await readLine(child.stdout));
  await expectStatus(ready.url, 200);
  await expectStatus(`${ready.url}/api/sync/status`, 200);
  await expectStatus(`${ready.url}/api/sync/run`, 400, { method: "POST" });
  await expectStatus(`${ready.url}/api/export?format=json`, 200);
  await expectStatus(`${ready.url}/api/lessons/${lessonId}/review`, 200, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ understanding: "understood", answers: {} }),
  });
  await expectStatus(`${ready.url}/api/lessons/${lessonId}`, 200, { method: "DELETE" });

  child.stdin.end();
  const exitCode = await childExitCode(child);
  if (exitCode !== 0) throw new Error(`Sidecar exited with ${exitCode}: ${stderr}`);

  const log = fs.readFileSync(logFile, "utf8");
  if (!log.includes("starting") || !log.includes("ready") || !log.includes("stopping")) {
    throw new Error("Sidecar log did not contain the expected lifecycle events.");
  }
  console.log("Standalone desktop server smoke passed with an empty PATH.");
} finally {
  if (child.exitCode === null) child.kill();
  fs.rmSync(dataDirectory, { recursive: true, force: true });
}

function seedLesson(directory) {
  const store = createLessonStore(path.join(directory, "learning.db"));
  try {
    return store.save(
      validateLessonInput({
        tool: "codex",
        title: "Packaged desktop smoke lesson",
        problem: "The packaged application needs a real persistence check.",
        mistake: "Only the dashboard shell was checked.",
        rootCause: "Static asset loading does not exercise SQLite or mutation routes.",
        fixSummary: "Exercise the packaged API against a temporary real store.",
        takeaway: "Test packaged behavior across its actual process boundary.",
        whenNotApplicable: "A unit that has no packaging or process boundary can use a unit test.",
        concepts: ["desktop packaging"],
        reviewQuestions: [
          {
            question: "Why test the packaged process?",
            expectedAnswer: "It catches bundling and runtime dependency failures.",
          },
        ],
      }),
    ).id;
  } finally {
    store.close();
  }
}

async function expectStatus(url, expectedStatus, init) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${sessionToken}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status !== expectedStatus) {
    throw new Error(`${init?.method ?? "GET"} ${url} returned ${response.status}.`);
  }
}

async function readLine(stream) {
  let buffered = "";
  for await (const chunk of stream) {
    buffered += chunk.toString();
    const newline = buffered.indexOf("\n");
    if (newline !== -1) return buffered.slice(0, newline);
  }
  throw new Error(`Sidecar exited before readiness: ${stderr}`);
}

async function childExitCode(serverProcess) {
  if (serverProcess.exitCode !== null) return serverProcess.exitCode;
  return new Promise((resolve, reject) => {
    serverProcess.once("error", reject);
    serverProcess.once("exit", resolve);
  });
}
