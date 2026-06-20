# Contributing to fixmind

Thanks for considering a contribution. This is an npm workspaces monorepo — `packages/*` holds the published CLI/MCP server and the dashboard it bundles, `apps/*` holds the marketing site and a reserved desktop shell.

## Setup

Requires Node.js 22.5+.

```bash
git clone https://github.com/F-47/fixmind.git
cd fixmind
npm install
npm run build
```

## Working on a piece of it

| You're changing... | Workspace | Commands |
|---|---|---|
| The CLI or MCP server | `packages/core` | `npm test -w fixmind` (builds, then runs `node --test`) |
| The dashboard UI | `packages/dashboard` | `npm run dev -w @fixmind/dashboard` (proxies `/api` to `127.0.0.1:4317` — run `fixmind dashboard` from `packages/core` alongside it) |
| The marketing site | `apps/website` | `npm run dev:website` from the repo root |

`npm run build` and `npm test` from the repo root run everything; use the scoped commands above while iterating so you're not rebuilding the whole tree on every change.

### packages/core specifics

- Tests live in `packages/core/test/*.test.ts` and run against the **built** output (`npm test` builds first, then runs `node --test dist/test/*.test.js`). There's no separate watch mode — rebuild and rerun.
- `src/mcp.ts` defines the `save_lesson` tool and the instructions sent to the connected AI client. If you change the quality bar in `validation.ts`, update the matching guidance in `MCP_INSTRUCTIONS` so the agent and the validator agree on what's rejected.
- `src/setup.ts` writes real files on a developer's machine (`~/.claude`, `~/.cursor`, instruction files, etc.). Tests pass a fake `homeDirectory`/`run` to avoid touching the real filesystem — follow that pattern for new setup logic.

### apps/website specifics

The site is a small client-side-routed SPA (`src/router.tsx` — no router dependency, just `pushState` + a context). Adding a page means: a new component, a route check in `src/main.tsx`, and a `Link` in `src/shared.tsx`'s `Nav`. Deploying it as static files requires the host to rewrite unknown paths to `index.html` (a Netlify-style `public/_redirects` is already included; other hosts need their own rewrite rule).

## Before opening a PR

- `npm run build` and `npm test` pass.
- New behavior in `packages/core` has a test in `packages/core/test/`.
- If you touched user-facing copy or commands, check `apps/website` for anything that now describes the old behavior.

## Commit style

This repo uses short, conventional-ish commit subjects: `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`. Describe the *why* in the body if it's not obvious from the subject.

## Re-recording the demo GIF

`docs/demo.gif` (linked from the root README) is a real, scripted terminal session — not staged screenshots — showing: `fixmind setup --scope project --dry-run` registering the MCP server, `fixmind list` showing a saved lesson, and `fixmind review` answering its recall question end to end.

If the CLI's output changes enough that the GIF looks stale, re-record it:

1. Seed one due lesson in a scratch `FIXMIND_DATA_DIR` (`fixmind save-from-summary --file lesson.json`, then back-date `next_review_at` directly in the SQLite file with `node:sqlite` so it's due — a freshly-saved lesson is due the next day, not immediately).
2. Drive the real CLI through a pty (`node-pty`) with a small driver script that fake-types each command (so it reads as a typed session) and then runs it for real via `execFileSync({ stdio: "inherit" })`, scripting the interactive `review` prompts (the recall answer, then an up-arrow + enter to pick "I understand it").
3. Record that driver with [terminalizer](https://github.com/faressoft/terminalizer) — note its `record` command needs its *own* stdin to be a real TTY (it calls `setRawMode`), so drive `terminalizer record` itself through an outer `node-pty`, not a plain pipe. It auto-stops and saves once the inner command process exits.
4. Render with `terminalizer render demo -o demo.gif --step 2` — `--step 2` roughly halves both file size and runtime by dropping every other frame, which also makes the typing read a bit snappier.
5. Sanity-check the rendered file before trusting it: parse its Graphic Control Extension blocks to sum real frame delays (`frames: N, seconds: ...`) rather than assuming the renderer's logged "completed" timing matches what got flushed to disk — the gif-encoding stream can still be writing after that log line prints.
