# fixmind

[![License: MIT](https://img.shields.io/badge/license-MIT-7c5cff.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.13-339933.svg)](https://nodejs.org)

A local-first CLI and MCP server that turns every AI-assisted bug fix into a lesson you actually remember, then reuses the strongest lessons as memory in later tasks. No paid AI API, no account required — everything lives in a SQLite database on your machine. Encrypted sync across machines is available as an opt-in Pro feature.

## Installation

Recommended:

```bash
npx fixmind setup
```

`npx fixmind setup` runs Fixmind without requiring a global install. It detects Claude Code, Cursor, and Codex, then wires the MCP server into whichever ones you pick - globally on this device, or scoped to a single project with `--scope project`. It also initializes Fixmind's local data and config files. Full usage lives in [packages/core/README.md](packages/core/README.md).

Optional, for frequent terminal use:

```bash
npm install -g fixmind
```

If you install the CLI globally, you can run `fixmind setup`, `fixmind review`, and the other commands directly from your terminal.

## Documentation

| Doc | Covers |
|---|---|
| [docs/quickstart.md](docs/quickstart.md) | Install, setup, and what happens on your first fix. |
| [docs/cli-reference.md](docs/cli-reference.md) | Every command and flag — setup, capture, browse, review, edit, export. |
| [docs/lesson-schema.md](docs/lesson-schema.md) | What a lesson contains, the quality gate that rejects shallow ones, the spaced-repetition schedule, and where it's all stored. |
| [docs/faq.md](docs/faq.md) | Troubleshooting: agents not saving lessons, backups, resets, scope quirks per client. |
| [docs/mcp-integration.md](docs/mcp-integration.md) | The MCP server itself - the tool schema, memory retrieval, token overhead, and manual client setup. |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes to the published `fixmind` package. |

## Repository layout

This is an npm workspaces monorepo.

| Path | What it is |
|---|---|
| [`packages/core`](packages/core) | The published `fixmind` package - the CLI and MCP server. |
| [`packages/dashboard`](packages/dashboard) | `@fixmind/dashboard`, the React dashboard SPA bundled into `packages/core`'s build. |
| [`apps/website`](apps/website) | `@fixmind/website`, the marketing site (Vite + React + Tailwind). |
| [`apps/desktop`](apps/desktop) | `@fixmind/desktop`, the native Tauri shell for local lessons, review, and Pro sync. |

## Working in this repo

```bash
npm install        # install all workspaces
npm run build      # build dashboard, core, and the website
npm test           # run packages/core's test suite
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full setup, the per-workspace commands, and how to submit a change.

## License

MIT - see [LICENSE](LICENSE).
