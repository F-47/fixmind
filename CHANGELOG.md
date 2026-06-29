# Changelog

All notable changes to the `fixmind` package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.25]

### Changed
- Republished the existing `1.0.24` release under a new package version after npm rejected the old version number.

## [1.0.24]

### Changed
- The MCP `memory` tool now returns structured match reasons alongside each lesson, so the agent can see why a lesson ranked highly instead of treating retrieval as a black box.
- Memory ranking now prefers stronger signals like title and pattern matches, and the CLI/dashboard output explains which fields matched.
- The dashboard now shows a dedicated review inbox for due lessons, so the next action is visible immediately instead of being buried in the general lesson list.
- The single lesson page now has an explicit back button to return to the dashboard, instead of relying on browser history.

### Fixed
- Memory match metadata now uses a closed `MemoryMatchField` union instead of `string[]`, which prevents typoed or invalid field names from slipping into relevance explanations.

## [1.0.23]

### Added
- The local dashboard now renders Markdown in lesson prose and review questions, including inline code, headings, lists, links, blockquotes, and fenced code blocks.

### Changed
- Lessons about package, runtime, build, or deployment failures now require the underlying architectural boundary: where code runs, what can enter the client bundle, and the supported interface between systems.

### Changed
- `fixmind setup` now defaults to strict capture mode, and `fixmind settings` lets users switch to balanced capture mode later without re-running setup.
- The MCP server now reads capture mode from local config so the agent can be more or less aggressive about saving borderline-but-useful lessons.
- Added `fixmind memory` plus an MCP `memory` tool so the agent can retrieve reviewed lessons and reuse them as guidance in new tasks.

## [1.0.22]

### Fixed
- The global `fixmind` launcher now runs correctly through npm shims, so `fixmind -v` and `fixmind setup` no longer silently exit after a global install.

## [1.0.21]

### Fixed
- Removed the experimental browser-to-account session handoff and kept CLI sync login separate from website account sign-in.
- Clarified the account and CLI copy so the website manages plan status while `npx fixmind login` handles encrypted sync on a device.
- Raised the minimum Node requirement to 22.13 and added a launcher guard so older Node versions show a clear upgrade message instead of crashing on `node:sqlite`.

## [1.0.20]

### Changed
- The CLI login prompt now says `Waiting for authentication...` and prints the Fixmind account URL explicitly, which makes the browser-first flow feel closer to a device login wait state.

## [1.0.19]

### Changed
- The CLI login flow now opens the Fixmind website first and waits for the browser session to hand back tokens through a localhost callback, which matches the browser-first auth pattern users expect.

## [1.0.18]

### Fixed
- The CLI login callback now does a full same-origin reload to `/account` after applying the Supabase session, so the account page reads the persisted session instead of inheriting a transient SPA state.

## [1.0.17]

### Fixed
- The CLI login now retries in the same terminal when the sync passphrase is wrong instead of exiting immediately.
- The website account handoff now uses a dedicated callback route before showing the account page, which avoids flashing the sign-in form while the CLI session is being applied.

## [1.0.16]

### Fixed
- The CLI login handoff now points to the canonical `www.fixmind.dev` account page, and the website waits for the redirect session to hydrate before falling back to the sign-in form.

## [1.0.15]

### Fixed
- The CLI login now opens the website account page with the active session, and the account page can hydrate that session from the URL hash so it no longer asks you to log in again.

## [1.0.14]

### Fixed
- The sync passphrase prompt now warns and asks again when it is left blank instead of exiting the login flow.

## [1.0.13]

### Fixed
- `fixmind setup` no longer exits when a prompt is cancelled, and the login branch now starts in a fresh CLI process so the passphrase prompt is clean.

## [1.0.12]

### Changed
- `npx fixmind setup` is now the primary onboarding path, and setup asks whether you want to open the dashboard or sign in before it does anything else.
- The dashboard no longer nags logged-out or free users to visit the account page; it stays local-first and only shows last sync when encrypted sync is active.
- The GitHub login success page now offers an account button after sign-in.

## [1.0.11]

### Fixed
- `fixmind -v` now reads the installed package version instead of printing a stale hardcoded value.

## [1.0.10]

### Fixed
- Homepage and account copy now explain that `npx fixmind setup` does not install a persistent CLI, and show the global install step for `fixmind login` and sync commands.

## [1.0.9]

### Fixed
- Dashboard sync status now validates the live session and shows a re-login prompt when the saved refresh token is no longer valid.
- CLI sync status now reports an expired session separately from a never-logged-in state.

## [1.0.8]

### Fixed
- Dashboard now uses a plain account link and no longer depends on a React Router provider.
- Removed external Google Fonts loading so the dashboard and website work under the local CSP.

## [1.0.7]

### Fixed
- Sync login now rejects blank encryption passphrases before key setup.
- Dashboard now shows a small sync-off banner for free or logged-out users instead of a heavy login lecture.

## [1.0.6]

### Added
- React Router-based website navigation and cleaner route resets.
- A simpler Windows-friendly setup command using `npx fixmind setup`.
- Account UX that separates local-only and synced Pro views more clearly.
- Jun 22 release logs:
  - `update account ui`
  - `account updated`
  - `fixed cli issue`
  - `updated package`
  - `fixed launcher issue and make lesson as page`

### Changed
- Account UI and account flow updates from the Jun 22 work.
- Launcher and lesson page updates from the Jun 22 work.

### Fixed
- CLI issue fixes from the Jun 22 work.

## [1.0.2]

Previous tracked baseline. Entries before this point were not tracked here; see `git log` for history.
