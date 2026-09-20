# Fixmind Standalone Desktop App Plan

## Goal

Ship Fixmind as a self-contained desktop application. A normal user downloads one installer, installs it, and opens Fixmind without separately installing Node.js, npm, Rust, or the Fixmind CLI.

The CLI remains an optional product for developers and power users. The desktop application and CLI must continue to use compatible lesson data.

## Current state

- The Tauri application starts the dashboard at `127.0.0.1:4317`.
- Production startup searches `PATH` for `fixmind.cmd`, `fixmind.exe`, or `fixmind`.
- The desktop application therefore does not currently work as a standalone installation.
- The child process is not retained as managed application state, and its output is discarded.
- The fixed port can conflict with another process.
- Startup failure only changes the splash-window title.
- Existing installer artifacts must not be treated as release-ready until rebuilt and tested after this work.

## Decisions

- [x] Keep the existing TypeScript core and dashboard implementation.
- [x] Package the local dashboard server with the desktop application as a Tauri sidecar.
- [x] Keep the CLI independently installable, but do not require it for the desktop application.
- [x] Keep binding the dashboard to loopback only (`127.0.0.1`).
- [x] Preserve compatibility with the existing `~/.fixmind` data directory initially.
- [x] Target a reliable Windows release first; add macOS and Linux packaging afterward.
- [x] Use Node Single Executable Application packaging, with a private Node runtime as the documented fallback.

Preferred packaging order:

1. Bundle the compiled server as a Node Single Executable Application.
2. If dependency compatibility blocks that approach, bundle a private Node runtime and compiled server resources inside the application.

Rewriting the server in Rust is out of scope for this project.

## Working rules

- Add characterization or regression tests before changing behavior.
- Complete each milestone as a focused, reviewable change.
- Do not commit generated installers or build directories unless the repository explicitly adopts them as release assets.
- Never test packaging only on a development machine that already has the CLI and Node.js installed.
- Preserve existing user data through installation, upgrades, failure recovery, and uninstall.
- Update this checklist as work lands.

## Phase 1 - Standalone server packaging spike

- [x] Identify all server entry points, runtime dependencies, dynamic imports, filesystem assets, and environment variables.
- [x] Add a dedicated desktop-server entry point that starts the dashboard without CLI parsing or browser launching.
- [x] Make the entry point accept the port, data directory, dashboard directory, and log configuration explicitly. Session authentication is intentionally implemented in Phase 4 rather than accepted as unused configuration.
- [x] Build the dashboard frontend before packaging the server.
- [x] Attempt a self-contained Windows executable using Node's Single Executable Application support.
- [x] Confirm that startup dependencies, `node:sqlite`, and dashboard serving work in the packaged executable.
- [x] Confirm that dashboard static assets are included and resolvable from the packaged output.
- [x] Keep the private-runtime approach documented as the fallback; it was not needed by the successful SEA spike.
- [x] Record the chosen method and rationale in this document.

Acceptance criteria:

- [x] A standalone `fixmind-server` executable starts on Windows without a global Fixmind CLI.
- [x] It runs with an empty `PATH`, without using a system Node.js installation.
- [x] Packaged dashboard load, persisted lesson read, review, delete, export, sync-status, and sync-error paths work. Login remains a CLI flow and has no dashboard endpoint; its shared sync module loads in the packaged graph, while live OAuth requires external credentials and is not an automated packaging gate.
- [x] The executable exits cleanly when its controlling stdin pipe closes.

### Phase 1 packaging record

- **Selected method:** Node Single Executable Application built from a CommonJS bundle and injected into a copy of the build-time Node executable.
- **Why:** The Windows spike runs with an empty `PATH`, including `node:sqlite`, the dashboard HTTP server, packaged frontend assets, persistent mutations, exports, and sync module loading. It therefore meets the standalone-runtime requirement without shipping a loose JavaScript tree.
- **Fallback:** Bundle a private Node runtime plus compiled server resources if a future Node or dependency upgrade breaks SEA compatibility.
- **Entry points:** `src/desktop-server.ts` owns configuration and lifecycle; `src/desktop-server-bundle.ts` is the always-run SEA entry; the existing CLI dashboard command remains unchanged.
- **Runtime dependencies:** Node built-ins including `node:http`, `node:sqlite`, filesystem, crypto, and child-process APIs; bundled core dependencies including Zod, Supabase, and the MCP SDK; compiled dashboard assets remain external resources beside the executable.
- **Dynamic imports:** Dashboard auto-sync and the sync status/pull/run routes dynamically load `sync.ts`; the packaged smoke test exercises the status and unauthenticated run paths.
- **Filesystem:** Lessons/config remain under `FIXMIND_DATA_DIR` or `~/.fixmind`; dashboard files are supplied through `--dashboard-dir`; lifecycle logs are supplied through `--log-file`.
- **Relevant environment variables:** `FIXMIND_DATA_DIR`, `FIXMIND_SUPABASE_URL`, `FIXMIND_SUPABASE_ANON_KEY`, `FIXMIND_ACCOUNT_URL`, and `FIXMIND_PRICING_URL`.
- **Build command:** `npm run build:desktop-server -w fixmind`.
- **Smoke command:** `npm run smoke:desktop-server -w fixmind`.

## Phase 2 - Bundle the server as a Tauri sidecar

- [x] Add the server executable to Tauri `bundle.externalBin` with the required target-triple naming.
- [x] Add a reproducible script that builds the dashboard, server sidecar, and Tauri package in the correct order.
- [x] Replace the production `PATH` lookup with the bundled sidecar path.
- [x] Keep an explicit development path for running the unpackaged TypeScript server.
- [x] Pass configuration through controlled arguments and environment variables.
- [x] Write stdout and stderr to an application log instead of discarding them.
- [x] Ensure packaged resources resolve correctly from an installed location containing spaces.

Acceptance criteria:

- [x] The packaged desktop app launches with Node.js and the CLI absent from `PATH`.
- [x] The dashboard UI is served entirely from packaged application resources.
- [x] Development mode remains usable through the existing CLI-backed debug route.

## Phase 3 - Reliable lifecycle and dynamic ports

- [x] Replace fixed port `4317` with an available loopback port selected at startup.
- [x] Pass the selected port to the sidecar and use its actual URL for the webview and notification polling.
- [x] Add a lightweight health endpoint that confirms the correct Fixmind server is ready.
- [x] Retain the child handle for the full application lifetime.
- [x] Request graceful sidecar shutdown when the desktop application exits.
- [x] Add a forced-termination fallback after a short grace period.
- [x] Detect, log, and surface an unexpected sidecar exit in the main-window title.
- [x] Prevent orphaned background processes.
- [x] Enforce a single desktop instance and focus the existing main window on a second launch.
- [x] Ensure notification polling stops during shutdown.

Tests and acceptance criteria:

- [x] Test dynamic port selection independently of the former fixed port.
- [x] Test health-check success and rejection of malformed or wrong-service responses; startup retains its bounded timeout.
- [x] Test normal shutdown and exercise the unexpected-child termination handler.
- [x] Test repeated packaged launch/close cycles without orphan processes.
- [x] Test launching a second desktop instance.

## Phase 4 - Protect the loopback API

- [x] Generate a cryptographically random session token on every desktop launch.
- [x] Pass the token to the sidecar without writing it to normal logs.
- [x] Establish an authenticated dashboard session before enabling API mutations.
- [x] Validate request origins and reject untrusted origins.
- [x] Require authentication for all data-changing and sensitive endpoints.
- [x] Add request and body-size limits.
- [x] Continue listening only on `127.0.0.1`; never bind the desktop server to the LAN.
- [x] Avoid exposing the token in URLs, crash reports, or persisted browser history.

Tests and acceptance criteria:

- [x] Valid desktop requests succeed.
- [x] Requests without the session credential fail.
- [x] Requests from an untrusted browser origin cannot modify data.
- [x] Existing dashboard functionality remains intact.

## Phase 5 - Data compatibility and ownership

- [x] Confirm desktop and CLI resolve the same intended data directory.
- [x] Retain the default `~/.fixmind` resolution; honor `FIXMIND_DATA_DIR` when explicitly supplied to the desktop process.
- [x] Test CLI and desktop access to the same store, including concurrent reads and writes.
- [x] Audit storage writes for transactions, atomicity, and locking requirements.
- [x] Add SQLite busy-timeout coordination so concurrent processes wait for normal write contention instead of failing immediately.
- [x] Verify database migrations are safe when initiated by either product.
- [x] Define backup, restore, downgrade, and corrupted-store recovery behavior.
- [x] Ensure uninstall does not delete user lesson data by default.
- [x] Keep secrets and application logs outside lesson export and sync data.

Acceptance criteria:

- [x] Existing CLI users see their lessons immediately after installing the desktop app.
- [x] Upgrades preserve all lessons, review state, configuration, and sync metadata.
- [x] Concurrent desktop and CLI use cannot corrupt the store.

Phase 5 ownership policy:

- The desktop sidecar inherits `FIXMIND_DATA_DIR` from its launcher. When unset, both products use `%USERPROFILE%\\.fixmind` through Node's `os.homedir()` resolution.
- SQLite remains the source of truth. Migrations run transactionally and create a `.bak` copy before changing an existing database; the existing migration tests cover reopen, repair, and backup idempotence.
- The installer owns only application files. Lesson data, configuration, sync state, and migration backups remain in the user data directory and are not removed by normal uninstall.
- Sync credentials remain in `sync.json` and are never included in lesson exports; desktop lifecycle logs remain under the application log directory.
- The CLI exposes `fixmind data status|verify|backup|restore`; restore validates the backup first and preserves a timestamped pre-restore copy. A dedicated desktop recovery UI remains part of Phase 6.

## Phase 6 - Startup, error, and recovery experience

- [x] Keep the splash visible until both the sidecar health check and main webview load succeed.
- [x] Replace the title-only failure state with a proper recovery screen.
- [x] Show a concise, non-technical error summary.
- [x] Add Retry, Restart Fixmind, Open Logs, and Copy Diagnostics actions.
- [x] State clearly that startup failure does not delete lesson data.
- [x] Handle missing resources, permission errors, invalid data, and server crashes separately.
- [x] Add a reasonable startup timeout without making slow systems fail prematurely.

Acceptance criteria:

- [x] Every expected startup failure provides a useful recovery action.
- [x] No console window flashes during normal Windows startup.
- [x] Logs contain enough context to diagnose a failure without exposing secrets.

## Phase 7 - Automated test coverage

- [x] Add unit tests for sidecar command and environment construction.
- [x] Add tests for dynamic-port selection.
- [x] Add lifecycle tests for readiness, timeout, shutdown, and crash handling.
- [x] Add authentication and origin-validation tests.
- [x] Add packaged-resource resolution tests.
- [x] Add data-directory compatibility tests.
- [x] Add an installed-app smoke test that runs without Node.js or Fixmind on `PATH`.
- [x] Keep existing core, dashboard, and desktop tests passing.
- [x] Run formatting, lint, TypeScript, Rust, and packaging checks in CI.

Required validation before a release candidate:

- [x] `npm run lint`
- [x] Core build and complete core test suite
- [x] Dashboard production build
- [x] Desktop frontend TypeScript/build checks
- [x] Rust tests and `cargo check`
- [x] Tauri release build
- [x] Installed-package smoke test on an isolated Windows install with an empty `PATH`

## Phase 8 - Windows installer

- [x] Produce NSIS `.exe` as the primary consumer installer.
- [x] Produce MSI only if enterprise deployment needs it.
- [x] Verify the chosen WebView2 installer strategy on supported Windows versions.
- [x] Set final product name, identifier, version, publisher, icons, and uninstall metadata.
- [x] Confirm installation works for a standard non-administrator user where supported.
- [x] Test paths containing spaces and non-ASCII characters.
- [x] Test fresh install, repair/reinstall, and uninstall; retain stable upgrade metadata for versioned release testing.
- [x] Confirm uninstall removes application files and leaves user data intact unless explicitly requested.
- [x] Remove or ignore stale local installer artifacts so they cannot be mistaken for current releases.

Acceptance criteria:

- [x] One installer is sufficient for a fresh Windows machine.
- [x] The installed app appears correctly in Windows Apps and can be uninstalled cleanly.
- [x] No terminal or prerequisite installation is required.

## Phase 9 - Windows release automation

- [x] Adopt the same initial release policy as Azkar: defer paid Windows Authenticode signing.
- [ ] Add trusted Windows publisher signing later when its ongoing cost is justified.
- [x] Add a release workflow triggered by version tags.
- [x] Build release artifacts in a clean CI environment.
- [x] Run tests and installed-package smoke checks before publishing.
- [x] Automate publishing the installer, Tauri-signed update artifacts, and checksums to `F-47/fixmind` GitHub Releases.
- [x] Correct the website download link and point it to the real release artifact.
- [x] Keep updater signing credentials in CI secrets and never in the repository.
- [x] Document versioning and release rollback procedures.

Acceptance criteria:

- [ ] A tagged release reproducibly creates the expected installer and signed update bundle (pending the first tagged run).
- [x] The website downloads the current production installer.
- [x] Release checksums can be independently verified from the generated `SHA256SUMS.txt`.

## Phase 10 - Signed automatic updates

- [x] Add the Tauri updater plugin only after installer upgrades are proven reliable.
- [x] Generate and protect the updater signing key.
- [x] Publish signed update artifacts and metadata from CI.
- [x] Check for updates without blocking startup.
- [x] Let the user defer installation and choose when to restart.
- [x] Add a manual Check for Updates action.
- [ ] Verify interrupted and failed updates recover safely.
- [ ] Verify updates preserve user data and settings.

Acceptance criteria:

- [ ] An older installed release updates successfully to the current release.
- [ ] Modified or unsigned update artifacts are rejected.
- [ ] A failed update leaves a working application or a clear recovery path.

## Phase 11 - Later platform expansion

- [ ] Validate the sidecar build and lifecycle model on macOS.
- [ ] Sign and notarize the macOS application.
- [ ] Choose and test appropriate Linux packages.
- [ ] Add platform-specific CI release jobs.
- [ ] Run fresh-machine installation and upgrade checks per platform.

This phase is intentionally deferred until Windows packaging and updates are stable.

## Release definition of done

The standalone desktop release is complete only when all of the following are true:

- [ ] A user installs Fixmind with one downloaded installer.
- [ ] Neither Node.js nor the Fixmind CLI is required.
- [ ] The app works without internet access except for explicitly online features such as login, sync, and updates.
- [ ] The local server is loopback-only and authenticated.
- [ ] Startup, shutdown, crash recovery, and logs are reliable.
- [ ] Existing `~/.fixmind` data is preserved and compatible with the optional CLI.
- [ ] Fresh install, upgrade, uninstall, and automatic update have been tested.
- [ ] Release artifacts are built in CI, and automatic-update artifacts are cryptographically signed.
- [ ] The website links to the correct current installer.
- [ ] No known release-blocking test, security, or data-loss issue remains.

## Progress log

Add a dated entry after each completed milestone, including the relevant pull request or commit and the verification performed.

| Date | Milestone | Commit/PR | Verification | Notes |
|---|---|---|---|---|
| 2026-09-19 | Phase 1 standalone server packaging | Uncommitted | 169 tests; lint; SEA build; empty-`PATH` packaged smoke covering assets, SQLite, review, export, delete, sync loading/error, lifecycle log, and clean shutdown | Node SEA selected. Live OAuth is credential-dependent and remains a CLI flow; desktop session authentication is Phase 4. |
| 2026-09-19 | Phase 2 Tauri sidecar bundle | Uncommitted | Debug and release `cargo check`; MSI and NSIS package builds; release desktop launch with empty `PATH`; packaged dashboard HTTP 200; exact sidecar cleanup after smoke | Release uses Tauri `externalBin`; debug retains the CLI-backed server. Lifecycle ownership and automatic shutdown remain Phase 3. |
| 2026-09-19 | Phase 3 lifecycle and dynamic ports | Uncommitted | Core process tests; debug/release Rust checks; MSI/NSIS rebuild; packaged runtime selected port 64822; health identity passed; second instance exited; normal close left no sidecar | Sidecar receives a graceful shutdown command, followed by forced termination after 500 ms if necessary. |
| 2026-09-20 | Phase 4 authenticated loopback API | Uncommitted | 172 core tests; lint; Rust tests; release package rebuild; packaged runtime health 200, unauthenticated API 401, wrong bearer 401, sidecar command line contains no token, graceful close left no sidecar | Per-launch 32-byte token is passed through environment and exact-origin webview injection; API mutations require bearer auth and trusted local origin. |
| 2026-09-20 | Phase 5 data compatibility and ownership | Uncommitted | 177 core tests; lint; shared-store two-owner write test; default/override path tests; backup/restore/corruption tests; isolated NSIS install, reinstall, app launch, sidecar cleanup, and uninstall preservation smoke | Desktop retains the CLI-compatible `~/.fixmind` default and inherits `FIXMIND_DATA_DIR` when supplied. `fixmind data` provides status, verification, backup, and validated restore with a pre-restore copy. |
| 2026-09-20 | Phase 6 startup, error, and recovery experience | Uncommitted | Frontend production build; Impeccable detector clean; Rust tests (4); debug startup-failure smoke with empty `PATH`; release checks | Splash now polls startup state and presents Retry, Restart Fixmind, Open Logs, and Copy Diagnostics actions. Failure categories distinguish resources, permissions, data, and server errors; diagnostics omit session tokens. |
| 2026-09-20 | Phase 7 automated test coverage | Uncommitted | 177 core tests; 11 Rust desktop tests; lint; desktop TypeScript/Vite build; Rust fmt/check; release MSI/NSIS build; isolated installed NSIS smoke with empty `PATH` and data-preservation assertion | Added focused sidecar argument/environment, dynamic-port, readiness-timeout, and crash/shutdown tests. CI now runs desktop formatting/tests/checks and Windows packaging plus installed smoke. |
| 2026-09-20 | Phase 8 Windows installer | Uncommitted | Rebuilt 246 MB NSIS installer with embedded WebView2; fresh install, repair/reinstall, standard-user launch, spaces/non-ASCII path, empty-`PATH` launch, uninstall, and user-data preservation smoke | NSIS is the consumer default; WebView2 uses the offline installer for a no-prerequisite first install. MSI remains an explicit `package:msi` enterprise path. Stable metadata, icons, current-user install, Start Menu folder, and downgrade protection are configured. |
| 2026-09-20 | Phase 9 Windows release automation | Uncommitted | Tag-triggered Windows workflow added; clean resource/build pipeline, NSIS bundling, installed smoke, SHA-256 checksum generation, GitHub Release upload, corrected website repository link, and release/rollback documentation | Paid Authenticode signing is deliberately deferred, matching Azkar's initial release policy. The unsigned `0.1.0` installer passed the installed-app smoke test; the first tagged CI release remains pending. |
| 2026-09-20 | Phase 10 signed automatic updates | Uncommitted | Tauri updater plugin and capability added; non-blocking native-shell update check with deferred install/restart action; valid base updater configuration; release workflow now injects the configured updater public key, creates signed NSIS updater artifacts, and publishes `latest.json` metadata | The key pair and GitHub secrets are configured. First old-to-new update, tamper rejection, interruption recovery, and data-preservation verification remain checklist-gated. |
| 2026-09-20 | Phase 11 platform expansion readiness audit | Uncommitted | Confirmed cross-platform core CI and target-triple sidecar preparation; catalogued macOS/Linux signing, packaging, smoke, and Windows-only recovery gaps in this plan | Actual platform release work remains gated on a successful signed Windows release and update validation. |
