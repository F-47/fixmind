import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildDiagnosticsReport } from "../src/diagnostics.js";

function runGit(cwd: string, args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function initGitRepo(repoDir: string): void {
  runGit(repoDir, ["init"]);
  runGit(repoDir, ["config", "user.email", "fixmind@example.com"]);
  runGit(repoDir, ["config", "user.name", "Fixmind Test"]);
}

test("buildDiagnosticsReport explains when git autofill and Claude permissions are ready", () => {
  const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-diagnostics-home-"));
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-diagnostics-repo-"));
  try {
    initGitRepo(projectDirectory);

    fs.mkdirSync(path.join(homeDirectory, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(homeDirectory, ".claude", "CLAUDE.md"),
      "<!-- fixmind:instructions:start -->\nFixmind instructions.\n<!-- fixmind:instructions:end -->\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(homeDirectory, ".claude", "settings.json"),
      JSON.stringify({
        permissions: { allow: ["mcp__fixmind__save_lesson"] },
      }),
      "utf8",
    );

    fs.mkdirSync(path.join(projectDirectory, "app"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDirectory, "app", "theme.tsx"),
      [
        "export function ThemeToggle() {",
        "  const theme = 'light';",
        "  return <div>{theme}</div>;",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );
    runGit(projectDirectory, ["add", "app/theme.tsx"]);
    runGit(projectDirectory, ["commit", "-m", "initial theme"]);
    fs.writeFileSync(
      path.join(projectDirectory, "app", "theme.tsx"),
      [
        "export function ThemeToggle() {",
        "  const theme = localStorage.getItem('theme');",
        "  return <div>{theme}</div>;",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const report = buildDiagnosticsReport(projectDirectory, homeDirectory).join("\n");

    assert.match(report, /Git repository: yes/);
    assert.match(report, /Current diff: 1 changed file\(s\)/);
    assert.match(report, /Git autofill: filesChanged=yes, concepts=yes, mistakePattern=yes, codeExample=yes/);
    assert.match(report, /Claude save permission: enabled/);
    assert.match(report, /No obvious local blocker found/);
  } finally {
    fs.rmSync(homeDirectory, { recursive: true, force: true });
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});

test("buildDiagnosticsReport explains missing local blockers when no repo or setup exists", () => {
  const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-diagnostics-empty-home-"));
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "fixmind-diagnostics-empty-project-"));
  try {
    const report = buildDiagnosticsReport(projectDirectory, homeDirectory).join("\n");

    assert.match(report, /Git repository: no/);
    assert.match(report, /No Git repository is available at the current path/);
    assert.match(report, /No Fixmind instructions were found in either the user or project scope/);
  } finally {
    fs.rmSync(homeDirectory, { recursive: true, force: true });
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  }
});
