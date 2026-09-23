import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  configureCursorMemoryRule,
  configureSessionStartHook,
  formatSessionInjection,
  injectionHookCommand,
  selectInjectionLessons,
} from "../src/session-injection.js";
import { createLessonStore } from "../src/storage.js";
import { validateLessonInput } from "../src/validation.js";

function lessonInput(overrides: Record<string, unknown> = {}) {
  return validateLessonInput({
    tool: "test",
    title: "Injection target lesson",
    problem: "The dependency was resolved at the wrong time",
    mistake: "Assumed the module was available in the target runtime",
    rootCause: "The module belongs to a runtime the target bundle never includes",
    fixSummary: "Import the typed client instead of the implementation module",
    takeaway: "Target-bundle code must import the supported client, not the runtime.",
    mistakePattern: "Wrong runtime boundary",
    whenNotApplicable: "Does not apply to server-only code paths.",
    concepts: ["runtime boundaries"],
    filesChanged: ["src/client.ts"],
    badCodeExample: "import { db } from 'server/db';",
    goodCodeExample: "import { api } from './api-client';",
    codeExplanation: "The fixed version stays inside the target runtime's boundaries.",
    practiceTask: "Check one import against the target runtime.",
    reviewQuestions: [
      {
        question: "What marks an import as unsafe for a bundle?",
        expectedAnswer: "It reaches a runtime the bundle never includes.",
      },
    ],
    understanding: "understood",
    tags: [],
    ...overrides,
  });
}

function tempDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-inject-"));
}

test("injection prefers reviewed lessons from the current project", () => {
  const directory = tempDirectory();
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    const here = store.save(lessonInput({ projectPath: directory }));
    store.updateReview(here.id, [], "understood");
    const elsewhere = store.save(
      lessonInput({ title: "Other project lesson", projectPath: "/somewhere/else" }),
    );
    store.updateReview(elsewhere.id, [], "understood");

    const lessons = selectInjectionLessons(store, {
      projectDirectory: directory,
      platform: "linux",
    });
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].id, here.id);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("injection falls back to top reviewed lessons for unseen projects", () => {
  const directory = tempDirectory();
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    const other = store.save(
      lessonInput({ title: "Global lesson", projectPath: "/unrelated/project" }),
    );
    store.updateReview(other.id, [], "understood");

    const lessons = selectInjectionLessons(store, {
      projectDirectory: directory,
      platform: "linux",
    });
    assert.equal(lessons.length, 1);
    assert.equal(lessons[0].id, other.id);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("project matching handles windows path casing and separators", () => {
  const directory = tempDirectory();
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    const saved = store.save(lessonInput({ projectPath: `${directory}\\Nested` }));
    store.updateReview(saved.id, [], "understood");

    const lessons = selectInjectionLessons(store, {
      projectDirectory: `${directory}\\nested`,
      platform: "win32",
    });
    assert.equal(lessons.length, 1);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("injection text renders takeaways and stays empty without lessons", () => {
  const directory = tempDirectory();
  const store = createLessonStore(path.join(directory, "test.db"));
  try {
    assert.equal(formatSessionInjection(selectInjectionLessons(store, { platform: "linux" })), "");

    const saved = store.save(lessonInput());
    store.updateReview(saved.id, [], "understood");
    const text = formatSessionInjection(
      selectInjectionLessons(store, { projectDirectory: directory, platform: "linux" }),
    );
    assert.match(text, /## Fixmind lessons for this project/);
    assert.match(text, /\*\*Injection target lesson\*\*/);
    assert.match(text, /Target-bundle code must import the supported client/);
    assert.match(text, /Scope: Does not apply to server-only code paths\./);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("the session-start hook edits claude settings idempotently", () => {
  const home = tempDirectory();
  const settingsPath = path.join(home, ".claude", "settings.json");

  const first = configureSessionStartHook({ homeDirectory: home, platform: "linux" });
  assert.equal(first.status, "configured");

  const config = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
    hooks: { SessionStart: Array<{ hooks: Array<{ type: string; command: string }> }> };
    permissions: { allow: string[] };
  };
  assert.equal(config.hooks.SessionStart.length, 1);
  assert.equal(config.hooks.SessionStart[0].hooks[0].type, "command");
  assert.match(config.hooks.SessionStart[0].hooks[0].command, /fixmind inject/);

  fs.writeFileSync(
    settingsPath,
    JSON.stringify({ permissions: { allow: ["mcp__other__tool"] } }, null, 2),
    "utf8",
  );

  const second = configureSessionStartHook({ homeDirectory: home, platform: "linux" });
  assert.equal(second.status, "configured");
  const merged = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as {
    hooks: unknown;
    permissions: { allow: string[] };
  };
  assert.deepEqual(merged.permissions.allow, ["mcp__other__tool"]);
  assert.ok(merged.hooks);

  const third = configureSessionStartHook({ homeDirectory: home, platform: "linux" });
  assert.equal(third.status, "already_configured");

  const dryRunHome = `${home}-dry`;
  const dryRun = configureSessionStartHook({
    homeDirectory: dryRunHome,
    dryRun: true,
    platform: "linux",
  });
  assert.equal(dryRun.status, "dry_run");
  assert.ok(!fs.existsSync(path.join(dryRunHome, ".claude", "settings.json")));
});

test("the cursor memory rule is written once with a stable marker", () => {
  const project = tempDirectory();
  const first = configureCursorMemoryRule({ projectDirectory: project });
  assert.equal(first.status, "written");

  const filePath = path.join(project, ".cursor", "rules", "fixmind-memory.mdc");
  const content = fs.readFileSync(filePath, "utf8");
  assert.match(content, /alwaysApply: true/);
  assert.match(content, /fixmind `memory` tool/);

  const second = configureCursorMemoryRule({ projectDirectory: project });
  assert.equal(second.status, "already_configured");

  const dryRun = configureCursorMemoryRule({
    projectDirectory: `${project}-dry`,
    dryRun: true,
  });
  assert.equal(dryRun.status, "dry_run");
  assert.ok(!fs.existsSync(path.join(`${project}-dry`, ".cursor")));
});

test("the injection hook command prefers a fixmind binary on PATH", () => {
  const command = injectionHookCommand("linux");
  assert.match(command, /fixmind inject/);
});
