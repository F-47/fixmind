# Desktop release procedure

Desktop releases are tag-driven. The tag version must match `apps/desktop/src-tauri/tauri.conf.json` exactly.

## Before tagging

1. Update the desktop version in `apps/desktop/package.json` and `apps/desktop/src-tauri/tauri.conf.json`.
2. Run the Phase 7 validation commands and `npm run package -w @fixmind/desktop` locally.
3. Configure the Tauri updater signing secrets described in [`PHASE-10-UPDATER-CHECKLIST.md`](../PHASE-10-UPDATER-CHECKLIST.md).
4. Create and push a matching tag, for example `v0.1.1`.

The release workflow refuses to publish when the updater private or public key is missing. It creates a Tauri-signed update bundle, an unsigned Windows NSIS installer, `latest.json`, and `SHA256SUMS.txt`. Until a trusted Authenticode service is added, Windows can show an Unknown publisher or SmartScreen warning for the installer.

The NSIS package embeds the WebView2 offline installer, so a fresh Windows machine does not need Node.js, the CLI, or a separate WebView2 download. MSI remains an explicit enterprise-only build via `npm run package:msi -w @fixmind/desktop`.

## Rollback

If a release is defective, mark the GitHub release as a pre-release or delete it, then point the website back to the last known-good tag. Do not reuse a published version: increment the desktop version and tag a new release. User lesson data lives outside the install directory and must not be removed during rollback or reinstall.

The website download button targets the repository's `/releases/latest` page, so publishing a corrected release makes it available without a website code change.
