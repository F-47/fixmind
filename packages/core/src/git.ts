import { execFileSync } from "node:child_process";

export interface GitContext {
  filesChanged: string[];
  sourceDiff?: string;
  stat?: string;
}

export function readGitContext(cwd = process.cwd()): GitContext {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd,
      stdio: "ignore",
      timeout: 2_000,
    });
  } catch {
    return { filesChanged: [] };
  }

  try {
    const files = runGit(["diff", "--name-only"], cwd)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      filesChanged: files,
      stat: runGit(["diff", "--stat"], cwd).trim() || undefined,
      sourceDiff:
        runGit(["diff", "--no-ext-diff", "--unified=3"], cwd).trim() ||
        undefined,
    };
  } catch {
    return { filesChanged: [] };
  }
}

function runGit(args: string[], cwd: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    timeout: 5_000,
  });
}
