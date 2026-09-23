import path from "node:path";

const publicRootFiles = new Set([
  ".gitattributes",
  ".gitignore",
  "biome.json",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "OPEN_SOURCE_BOUNDARY.json",
  "package-lock.json",
  "package.json",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  "tsconfig.base.json",
]);

const privateRootFiles = new Set([
  "OPEN-SOURCE-COMMERCIAL-PLAN.md",
  "PHASE-10-UPDATER-CHECKLIST.md",
  "PHASE-9-RELEASE-CHECKLIST.md",
  "PLAN-Destkop-App.md",
  "PLAN.md",
]);

const privateDocs = new Set([
  "docs/open-source-boundary-inventory.md",
  "docs/open-source-security-audit.md",
  "docs/team-insights-design.md",
]);

const removedToolingFiles = new Set([
  "apps/website/AGENTS.md",
  "apps/website/CLAUDE.md",
  ".fixmind-public-manifest.json",
  "skills-lock.json",
]);

const requiredPublicPaths = [
  ".gitattributes",
  ".github/workflows/ci.yml",
  ".github/workflows/desktop-release.yml",
  ".gitignore",
  "apps/desktop/package.json",
  "apps/website/package.json",
  "biome.json",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "docs/commercial-service-boundary.md",
  "LICENSE",
  "OPEN_SOURCE_BOUNDARY.json",
  "package-lock.json",
  "package.json",
  "packages/core/package.json",
  "packages/dashboard/package.json",
  "README.md",
  "scripts/export-public.mjs",
  "scripts/public-export-policy.mjs",
  "scripts/public-export.test.mjs",
  "SECURITY.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  "tsconfig.base.json",
];

export function assertSafeRepositoryPath(candidatePath) {
  if (
    !candidatePath ||
    candidatePath.includes("\\") ||
    path.posix.isAbsolute(candidatePath) ||
    path.posix.normalize(candidatePath) !== candidatePath ||
    candidatePath === ".." ||
    candidatePath.startsWith("../")
  ) {
    throw new Error(`Unsafe path: ${candidatePath}`);
  }
}

export function classifyPublicExportPath(candidatePath) {
  assertSafeRepositoryPath(candidatePath);

  if (removedToolingFiles.has(candidatePath)) return "remove";
  if (privateRootFiles.has(candidatePath) || privateDocs.has(candidatePath)) return "private";
  if (candidatePath.startsWith("supabase/")) return "private";
  if (publicRootFiles.has(candidatePath)) return "public";
  if (
    candidatePath.startsWith(".github/") ||
    candidatePath.startsWith("apps/") ||
    candidatePath.startsWith("docs/") ||
    candidatePath.startsWith("packages/") ||
    candidatePath.startsWith("scripts/")
  ) {
    return "public";
  }
  return "unclassified";
}

export function validateCandidatePaths(candidatePaths) {
  const classifications = new Map();
  for (const candidatePath of candidatePaths) {
    const classification = classifyPublicExportPath(candidatePath);
    if (classification === "unclassified") {
      throw new Error(`Unclassified path: ${candidatePath}`);
    }
    classifications.set(candidatePath, classification);
  }
  return classifications;
}

export function requirePublicPaths(candidatePaths) {
  const candidates = new Set(candidatePaths);
  const missing = requiredPublicPaths.filter((requiredPath) => !candidates.has(requiredPath));
  if (missing.length > 0) throw new Error(`Missing required public paths: ${missing.join(", ")}`);
}

export function createPublicPackageManifest(sourceManifest) {
  const publicManifest = {
    ...sourceManifest,
    scripts: { ...sourceManifest.scripts },
  };
  delete publicManifest.scripts["test:sync-policy"];
  return publicManifest;
}
