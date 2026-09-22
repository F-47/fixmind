# Changelog

All notable changes to the `fixmind` package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.29]

- Cleared the monorepo's Biome warning debt and restored the affected lint rules to error severity.

### Added

- `fixmind inject` and `fixmind hooks <claude|cursor>`: recall lessons automatically at session start instead of only when the agent asks. Claude Code sessions receive the current project's most relevant reviewed lessons as context; Cursor gets a memory rule. Both are offered during `fixmind setup` and can be installed any time.
- `fixmind export --format anki`: every review question becomes an Anki-importable note (question on the front, expected answer plus the takeaway on the back, concepts and mistake pattern as tags).
- `fixmind insights --weekly` plus a dashboard "This week" card summarizing the last 7 days of lessons, top patterns, and concepts still being learned.
- The desktop app now sends an OS notification when lessons become due for review while it is running.
- `fixmind setup --starter-pack`: 15 curated example lessons, tagged `fixmind-starter` and excluded from stats and insights, so reviews and memory have content from day one.

### Changed

- Windows releases now require Tauri-signed update artifacts but defer paid Authenticode publisher signing; installers can show Windows Unknown publisher or SmartScreen warnings until publisher signing is added.
- The dashboard API now answers unchanged lesson requests with an HTTP 304, so reopening or refreshing the dashboard skips rebuilding and re-downloading the lesson list (about 130x faster with no transfer on a 5,000-lesson history). The endpoint also accepts `?limit=` and `?offset=` to page through lessons.
- Review scheduling is now adaptive. Each lesson tracks an SM-2-style ease factor, so lessons you consistently understand stretch toward the 60-day ceiling faster, while a shaky or blind-copied lesson resurfaces after 1 day and climbs back slowly. Existing lessons keep their current position in the schedule when the database migrates.
- Saving a lesson no longer waits for encrypted sync. The MCP `save_lesson` tool and the dashboard schedule a debounced background push, and CLI saves hand the push to a detached background process, so saves return as soon as the lesson is stored locally. Pending lessons upload on the next save, dashboard open, or `fixmind sync push`, and failures still surface in `fixmind sync status` and the dashboard sync panel.
- `fixmind search`, the dashboard search API, and MCP memory retrieval are now backed by an SQLite FTS5 trigram index instead of a full table scan. Results and ranking are unchanged, and short queries keep the previous behavior.
- The lessons database migrates itself on startup. Existing databases are copied to `lessons.db.bak` before the first migration runs.
- The MCP `memory` tool's default listing (no query) now uses an indexed query, making it roughly an order of magnitude faster on large lesson histories.

### Fixed

- Packaged desktop builds now provide a valid empty updater configuration until release CI injects the production endpoint and public key, preventing startup failure in locally built installers.
- The MCP server now reports the installed `fixmind` package version instead of a hardcoded placeholder, so MCP clients see the real version.

## [1.0.26]

### Added

- `fixmind diagnose` / `fixmind diagnostics`, a read-only command that explains likely local blockers when a lesson did not save, including Git diff state, setup markers, and Claude save permissions.
- `fixmind insights`, a read-only command that surfaces the last 30 days of mistake patterns, fragile concepts, and recurring files/tools.
- The dashboard now has a dedicated review inbox for due lessons, so the next action is visible immediately instead of being buried in the full lesson list.
- The dashboard now adds Practice mode for due lessons, with free response, MCQ, and mixed drills.
- The dashboard now adds lesson search and advanced filters, including learning state, understanding level, status, client, concept, mistake pattern, file, and date filters.
- The dashboard lesson page now warns about the most relevant prior lesson before you review the current one, with a short explanation of why it matched.
- The dashboard now shows structured lesson-quality feedback with field-level hints for weak lessons and optional autofill suggestions when the next attempt could be improved.
- The dashboard and MCP now share reusable lesson templates for common bug shapes: architecture boundary, stale state, async timing, off-by-one, and null guard.

### Changed

- Memory ranking now returns ranked lessons with matched fields, matched terms, and a short "why this matched" explanation for each result.
- Memory match metadata now uses a closed `MemoryMatchField` union instead of loose strings, which keeps typoed field names out of relevance explanations.
- Added best-effort Git autofill for `fixmind save-manual` and the MCP `save_lesson` path, including template seeding plus diff-based `filesChanged`, `mistakePattern`, `concepts`, and `codeExample` inference when available.
- Updated the CLI, README, and MCP docs to describe the new autofill behavior accurately.
- Kept due lessons in the main dashboard flow but limited the preview so the progress section appears sooner and the page scrolls less.
- The dashboard advanced filters now stay user-controlled, so Clear filters resets the values and closes the accordion instead of forcing it open.
- The Model filter now uses the same interactive select as the other advanced filters, and the empty review inbox no longer takes up space when there are no due lessons.
- The dashboard now loads the full local lesson corpus once and filters it in-app for faster client-side searching and filtering.

### Fixed

- Proactive memory warnings now compare lessons using mistake pattern, changed files, concepts, tags, tool, and overlapping terms while excluding the current and inactive lessons, so the panel does not self-match.
- Practice mode now prefers believable distractors from similar lessons and falls back to free response when it cannot build a strong multiple-choice question.
- Practice analytics now record why a question was accepted or downgraded, which makes weak questions easier to debug and improve later.

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
