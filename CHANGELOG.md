# Changelog

All notable changes to the `fixmind` package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
