# fixmind monorepo

npm workspaces monorepo for fixmind.

- `packages/core` — the published `fixmind` CLI/MCP server. See [packages/core/README.md](packages/core/README.md) for usage.
- `packages/dashboard` — `@fixmind/dashboard`, the dashboard SPA consumed by `packages/core`'s build.
- `apps/website` — `@fixmind/website`, the marketing/commercial site (Astro). See [apps/website/README.md](apps/website/README.md).
- `apps/desktop` — reserved for a future Tauri desktop shell wrapping the dashboard (not yet built).

Run `npm run build` / `npm test` from the repo root.
