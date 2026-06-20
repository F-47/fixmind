Reserved for a future Tauri desktop shell wrapping `@fixmind/dashboard`.

Will point Tauri's `frontendDist` at `packages/dashboard/dist` (built independently — see `packages/dashboard/package.json`). Integration with `packages/core`'s storage/MCP logic is a separate design decision for when this work starts.

To wire this app into the workspace, add a `package.json` here — the root `workspaces` glob (`apps/*`) already covers it.
