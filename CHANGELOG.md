# Changelog

All notable changes to the `fixmind` package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
