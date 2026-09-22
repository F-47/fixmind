import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readConfig } from "./config.js";
import { readGitContext } from "./git.js";
import { buildGitAutofill } from "./git-autofill.js";
import { configPath } from "./paths.js";
import { detectClients } from "./setup.js";
import { isRecord } from "./utils.js";

const FIXMIND_SAVE_TOOL = "mcp__fixmind__save_lesson";

interface SetupScopeStatus {
  anyInstructions: boolean;
  claudeInstructions: boolean;
  codexInstructions: boolean;
  cursorInstructions: boolean;
  claudePermission: "enabled" | "missing" | "invalid";
}

export function buildDiagnosticsReport(
  cwd = process.cwd(),
  homeDirectory = os.homedir(),
): string[] {
  const git = readGitContext(cwd);
  const autofill = git.isRepo ? buildGitAutofill(git) : undefined;
  const configFile = configPath();
  const config = readConfig(configFile);
  const detectedClients = detectClients(homeDirectory);
  const userScope = inspectSetupScope(homeDirectory);
  const projectScope = inspectSetupScope(cwd);

  const lines: string[] = [
    "Fixmind diagnostics",
    `Current directory: ${cwd}`,
    `Detected CLI clients on PATH: ${detectedClients.length ? detectedClients.join(", ") : "none"}`,
    `Git repository: ${git.isRepo ? "yes" : "no"}`,
  ];

  if (git.isRepo) {
    lines.push(
      git.filesChanged.length > 0
        ? `Current diff: ${git.filesChanged.length} changed file(s)${autofill?.codeExample ? " with a readable code example" : ""}`
        : "Current diff: clean working tree",
    );
    lines.push(
      `Git autofill: filesChanged=${git.filesChanged.length > 0 ? "yes" : "no"}, concepts=${autofill?.concepts.length ? "yes" : "no"}, mistakePattern=${autofill?.mistakePattern ? "yes" : "no"}, codeExample=${autofill?.codeExample ? "yes" : "no"}`,
    );
  } else {
    lines.push("Current diff: unavailable because this directory is not inside a Git repository.");
  }

  lines.push(`Capture mode: ${config.captureMode}`);
  lines.push(
    `Config file: ${fs.existsSync(configFile) ? configFile : `${configFile} (missing, using defaults)`}`,
  );
  lines.push(formatScopeStatus("User scope", userScope));
  lines.push(formatScopeStatus("Project scope", projectScope));
  lines.push("");
  lines.push("Likely reasons a lesson did not save:");

  const blockers = collectBlockers(
    git.isRepo,
    git.filesChanged.length > 0,
    userScope,
    projectScope,
  );
  if (blockers.length === 0) {
    lines.push(
      "- No obvious local blocker found. The agent may have rejected the lesson during the quality gate.",
    );
  } else {
    for (const blocker of blockers) lines.push(`- ${blocker}`);
  }

  return lines;
}

function inspectSetupScope(scopeDirectory: string): SetupScopeStatus {
  const claudeInstructions =
    hasFixmindMarker(
      path.join(scopeDirectory, ".claude", "CLAUDE.md"),
      "fixmind:instructions:start",
    ) || hasFixmindMarker(path.join(scopeDirectory, "CLAUDE.md"), "fixmind:instructions:start");
  const codexInstructions = hasFixmindMarker(
    path.join(scopeDirectory, "AGENTS.md"),
    "fixmind:instructions:start",
  );
  const cursorInstructions = hasFixmindMarker(
    path.join(scopeDirectory, ".cursor", "rules", "fixmind.mdc"),
    "alwaysApply: true",
  );
  return {
    anyInstructions: claudeInstructions || codexInstructions || cursorInstructions,
    claudeInstructions,
    codexInstructions,
    cursorInstructions,
    claudePermission: inspectClaudePermission(scopeDirectory),
  };
}

function inspectClaudePermission(scopeDirectory: string): SetupScopeStatus["claudePermission"] {
  const settingsPath = path.join(scopeDirectory, ".claude", "settings.json");
  if (!fs.existsSync(settingsPath)) return "missing";

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    const permissions = isRecord(parsed.permissions) ? parsed.permissions : undefined;
    const allow = Array.isArray(permissions?.allow) ? permissions.allow : [];
    return allow.includes(FIXMIND_SAVE_TOOL) ? "enabled" : "missing";
  } catch {
    return "invalid";
  }
}

function hasFixmindMarker(filePath: string, marker: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    return fs.readFileSync(filePath, "utf8").includes(marker);
  } catch {
    return false;
  }
}

function formatScopeStatus(label: string, status: SetupScopeStatus): string {
  return [
    `${label}:`,
    `  Claude instructions: ${status.claudeInstructions ? "present" : "missing"}`,
    `  Claude save permission: ${status.claudePermission}`,
    `  Codex instructions: ${status.codexInstructions ? "present" : "missing"}`,
    `  Cursor instructions: ${status.cursorInstructions ? "present" : "missing"}`,
  ].join("\n");
}

function collectBlockers(
  gitRepo: boolean,
  hasChanges: boolean,
  userScope: SetupScopeStatus,
  projectScope: SetupScopeStatus,
): string[] {
  const blockers: string[] = [];

  if (!gitRepo) {
    blockers.push(
      "No Git repository is available at the current path, so Fixmind cannot mine the diff for autofill.",
    );
  } else if (!hasChanges) {
    blockers.push("The working tree is clean, so there is no diff to capture.");
  }

  if (!userScope.anyInstructions && !projectScope.anyInstructions) {
    blockers.push("No Fixmind instructions were found in either the user or project scope.");
  }

  if (
    (userScope.claudeInstructions || projectScope.claudeInstructions) &&
    userScope.claudePermission !== "enabled" &&
    projectScope.claudePermission !== "enabled"
  ) {
    blockers.push(
      "Claude Code does not appear to allow the mcp__fixmind__save_lesson tool in this scope.",
    );
  }

  return blockers;
}
