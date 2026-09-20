import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { commandExists, type SetupScope } from "./setup.js";
import type { LessonStore } from "./storage.js";
import type { Lesson } from "./types.js";
import { isRecord } from "./utils.js";

export interface InjectionOptions {
  limit?: number;
  projectDirectory?: string;
  platform?: NodeJS.Platform;
}

function normalizeProjectPath(value: string, platform: NodeJS.Platform): string {
  const unified = value.replace(/\\/g, "/");
  return platform === "win32" ? unified.toLowerCase() : unified;
}

function projectMatches(
  lesson: Lesson,
  projectDirectory: string,
  platform: NodeJS.Platform,
): boolean {
  const lessonPath = normalizeProjectPath(lesson.projectPath, platform);
  const cwd = normalizeProjectPath(projectDirectory, platform);
  if (!lessonPath || !cwd) return false;
  return lessonPath === cwd || lessonPath.startsWith(`${cwd}/`);
}

function lessonRank(lesson: Lesson): number {
  return lesson.reviewCount * 10 + Date.parse(lesson.updatedAt) / 1_000_000_000;
}

export function selectInjectionLessons(
  store: LessonStore,
  options: InjectionOptions = {},
): Lesson[] {
  const limit = Math.max(1, options.limit ?? 5);
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const platform = options.platform ?? process.platform;

  const projectLessons = store
    .list(Number.MAX_SAFE_INTEGER)
    .filter(
      (lesson) =>
        lesson.status === "active" &&
        lesson.reviewCount > 0 &&
        projectMatches(lesson, projectDirectory, platform),
    )
    .sort((a, b) => lessonRank(b) - lessonRank(a));

  if (projectLessons.length > 0) return projectLessons.slice(0, limit);
  return store.topReviewed(limit);
}

export function formatSessionInjection(lessons: Lesson[]): string {
  if (lessons.length === 0) return "";
  const lines = lessons.map((lesson) => {
    const takeaway = lesson.takeaway ?? lesson.fixSummary;
    const scope = lesson.whenNotApplicable ? ` (Scope: ${lesson.whenNotApplicable})` : "";
    return `- **${lesson.title}** - ${takeaway}${scope}`;
  });
  return [
    "## Fixmind lessons for this project",
    "",
    "Recall these lessons from earlier fixes before making changes:",
    "",
    ...lines,
  ].join("\n");
}

export function injectionHookCommand(platform: NodeJS.Platform = process.platform): string {
  if (commandExists("fixmind")) return "fixmind inject";
  if (platform === "win32") return "cmd /c npx -y fixmind inject";
  return "npx -y fixmind inject";
}

export interface SessionStartHookResult {
  status: "configured" | "already_configured" | "dry_run";
  filePath: string;
}

export function configureSessionStartHook(options: {
  homeDirectory?: string;
  projectDirectory?: string;
  scope?: SetupScope;
  dryRun?: boolean;
  platform?: NodeJS.Platform;
}): SessionStartHookResult {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const scope = options.scope ?? "user";
  const dryRun = Boolean(options.dryRun);
  const command = injectionHookCommand(options.platform);

  const directory = path.join(scope === "project" ? projectDirectory : homeDirectory, ".claude");
  const filePath = path.join(directory, "settings.json");
  let config: Record<string, unknown> = {};
  if (fs.existsSync(filePath)) {
    try {
      config = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Cannot configure the session-start hook because ${filePath} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (hasFixmindSessionStartHook(config)) {
    return { status: "already_configured", filePath };
  }

  const hooks = isRecord(config.hooks) ? { ...config.hooks } : {};
  const sessionStart = Array.isArray(hooks.SessionStart)
    ? ([...hooks.SessionStart] as Array<Record<string, unknown>>)
    : [];
  sessionStart.push({
    hooks: [{ type: "command", command }],
  });
  hooks.SessionStart = sessionStart;
  const updated = { ...config, hooks };

  if (!dryRun) {
    fs.mkdirSync(directory, { recursive: true });
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, `${filePath}.backup`);
    }
    fs.writeFileSync(filePath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }

  return { status: dryRun ? "dry_run" : "configured", filePath };
}

function hasFixmindSessionStartHook(config: Record<string, unknown>): boolean {
  if (!isRecord(config.hooks)) return false;
  const entries = config.hooks.SessionStart;
  if (!Array.isArray(entries)) return false;
  for (const entry of entries) {
    if (!isRecord(entry) || !Array.isArray(entry.hooks)) continue;
    for (const hook of entry.hooks) {
      if (
        isRecord(hook) &&
        typeof hook.command === "string" &&
        hook.command.includes("fixmind inject")
      ) {
        return true;
      }
    }
  }
  return false;
}

const CURSOR_MEMORY_RULE_MARKER = "fixmind:memory-rule";

const CURSOR_MEMORY_RULE_BODY = `\
<!-- ${CURSOR_MEMORY_RULE_MARKER} -->
At the start of a task in this repository, and before fixing any bug, call the
fixmind \`memory\` tool with a short query describing the task: the component,
API, or error message involved. Apply the returned lessons' takeaways so the
same mistake is not repeated. After fixing a meaningful bug, save the new lesson
with \`save_lesson\` as usual.`;

export interface CursorMemoryRuleResult {
  status: "written" | "already_configured" | "dry_run";
  filePath: string;
}

export function configureCursorMemoryRule(options: {
  homeDirectory?: string;
  projectDirectory?: string;
  scope?: SetupScope;
  dryRun?: boolean;
}): CursorMemoryRuleResult {
  const homeDirectory = options.homeDirectory ?? os.homedir();
  const projectDirectory = options.projectDirectory ?? process.cwd();
  const scope = options.scope ?? "project";
  const dryRun = Boolean(options.dryRun);

  const baseDirectory = scope === "project" ? projectDirectory : homeDirectory;
  const directory = path.join(baseDirectory, ".cursor", "rules");
  const filePath = path.join(directory, "fixmind-memory.mdc");

  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const content = [
    "---",
    "description: Fixmind - recall lessons before tasks",
    "alwaysApply: true",
    "---",
    "",
    CURSOR_MEMORY_RULE_BODY,
    "",
  ].join("\n");

  if (existing.includes(CURSOR_MEMORY_RULE_MARKER)) {
    return { status: "already_configured", filePath };
  }

  if (!dryRun) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  return { status: dryRun ? "dry_run" : "written", filePath };
}
