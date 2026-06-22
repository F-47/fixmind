# Contributing

Thanks for taking a look.

## Requirements

- Node.js 22.5+
- npm 10+

## Install

From the repo root:

```bash
npm install
```

## Common commands

```bash
npm run build
npm test
npm run dev:website
npm run dev:dashboard
```

## Workspace layout

- `packages/core` is the published `fixmind` package: CLI, MCP server, sync, validation, and tests.
- `packages/dashboard` is the React dashboard bundled into the core package build.
- `apps/website` is the marketing site.
- `apps/desktop` is currently a placeholder for a future desktop shell.

## Making a change

1. Work in the smallest package that owns the behavior.
2. Keep docs in sync when a command, flag, or flow changes.
3. Run the relevant build or test command before opening a PR.
4. If you touch CLI or sync behavior, prefer adding or updating tests in `packages/core/test`.

## Notes

- Do not commit secrets from `.env.local` or any local Supabase session files.
- If a change affects setup or onboarding, update `README.md` and the matching docs page together.
