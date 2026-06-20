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

## Recording the demo GIF

`docs/demo.gif`, linked from the root README, isn't recorded yet. If you're picking this up:

1. Record a terminal session that shows the actual loop, not just commands running:
   - `fixmind setup` detecting a client and registering the MCP server.
   - An agent (any MCP client) calling `save_lesson` after a real fix — the saved-lesson confirmation message is the payoff shot.
   - `fixmind review` answering one recall question.
2. Keep it under ~15 seconds and under a few MB — GitHub renders inline GIFs, but large files load slowly on the repo's front page.
3. Tools that work well for this: [vhs](https://github.com/charmbracelet/vhs) (scripted, reproducible) or `asciinema` + `agg` (real recording, converted to GIF). Either is fine; scripted is easier to redo when the CLI's output changes.
4. Drop the file at `docs/demo.gif` — the README link already points there.
