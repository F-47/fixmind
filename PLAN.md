# Fixmind Improvement Plan

Ordered so each phase makes the next one safer. Tasks are numbered for reference; effort is S (<2h) / M (half-day) / L (1-2d) / XL (multi-day).

Standing rules per phase: run `npm run build && npm test`; changelog entry; each phase lands as its own PR-sized series so CI guards every step.

## Implementation status

- **Status:** All phases (0-6) and follow-up 1.4 are complete and verified (168/168 tests, lint clean, `cargo check` clean, website builds). The remaining performance follow-up is 2.6 (degenerate memory queries); team insights implementation remains design-gated.
- **Tests run against compiled output:** `npm test` builds first (tests execute `dist/test/*.test.js`). If the build fails, test output is stale - always check the build exit code before trusting test results. Run a single suite with `node --no-warnings --test dist/test/<name>.test.js` from `packages/core`.
- **Behavior-parity pattern:** refactors are proven safe by tests captured *before* the change (see `test/cli.test.ts` golden help output, and the unchanged memory/MCP tests across the Phase 2 rewrite). Keep doing this.
- **Test isolation:** set `FIXMIND_DATA_DIR` to a temp dir for any test or script that touches the store, and inject `SyncBackend` fakes for sync tests (`test/sync.test.ts` has `FakeBackend`).
- **Key files:** `src/commands/registry.ts` (command registry + generated help), `src/migrations.ts` (schema versions; next migration is v3 for the Phase 4 `ease` column), `src/storage.ts` (`reviewIntervalDays` at the bottom is what Phase 4 replaces), `src/memory.ts` + `src/sync.ts`, `scripts/bench-search.mjs` (perf bench, build first).
- **Docs to keep in sync:** `README.md`, `docs/cli-reference.md`, `docs/lesson-schema.md` (covers the review schedule - Phase 4 must update it), `CHANGELOG.md` `[Unreleased]`.

## Phase 0 - Safety net & cleanup (do first, protects everything after)

- [x] **0.1 Add CI** (M) - `.github/workflows/ci.yml`: matrix `windows/macos/ubuntu` x Node 22 -> `npm ci && npm run build && npm test` (tests run against `dist/`, so build must precede). Add a website build+lint job.
- [x] **0.2 Add lint/format** (M) - one tool for the monorepo (biome): config, one-time format pass, `npm run lint` / `format:check` scripts, wire into CI.
- [x] **0.3 Version single-sourcing** (S) - `mcp.ts` hardcodes `"0.2.0"`; read from package.json instead.
- [x] **0.4 Doc drift** (S) - CONTRIBUTING: desktop is no longer "a placeholder"; Node `>=22.13` everywhere; remove unused `@tauri-apps/api` from dashboard deps.
- [x] **0.5 Dedupe polar-webhook** (S) - keep root `supabase/` as canonical, delete the byte-identical copy in `packages/core/supabase/` (or add a CI hash check).

Verify: green CI on all 3 OS; `npm run lint` clean; no behavior change.

## Phase 1 - Core refactor (unblocks adding new commands later)

- [x] **1.1 Finish `cli-utils` extraction** (M) - delete the 7 duplicated helpers in `cli.ts`, collapse the two `parseArgs` implementations, unify `formatDate` (x3) and `isRecord` (x2).
- [x] **1.2 Split `cli.ts` (890 lines) into `src/commands/*.ts`** (L) - command registry (name, aliases, run, help); help text generated from it. No CLI behavior changes.
- [x] **1.3 CLI smoke tests** (M) - `packages/core/test/cli.test.ts` spawns the built CLI against an isolated `FIXMIND_DATA_DIR`: byte-exact golden `--help`, version, exit codes, and a save -> list -> search -> export -> delete pipeline. Captured before 1.2 and passing byte-identical after it.
- [x] **1.4 Clear the biome warning debt** (M) - cleared the baseline warning set, preserved intentional state-reset effects with documented exceptions, and restored the affected rules to `error` severity in `biome.json`.

Verify: `npm test` passes; golden help output unchanged; changelog entry.

## Phase 2 - Data-layer performance (the biggest efficiency win)

- [x] **2.1 Spike: FTS5 in `node:sqlite`** (S) - verified FTS5 + trigram tokenizer + external-content tables + triggers all work; substring semantics match the JS scorer (mid-word matches included).
- [x] **2.2 Migration runner** (M) - `src/migrations.ts`: `PRAGMA user_version` migrations in transactions, `.bak` backup before migrating an existing DB, existing pre-versioning DBs baselined at v1, FTS creation is best-effort with runtime fallback.
- [x] **2.3 Indexes + FTS5 table** (M) - `idx_lessons_updated_at`, `idx_lessons_status`; `lessons_fts` trigram external-content table + insert/update/delete triggers + `rebuild` for pre-existing rows.
- [x] **2.4 Rewrite `memory.ts`** (L) - no-query path uses the new indexed `topReviewed`; query path uses `textCandidates` (FTS rowids -> exact SQL LIKE filter -> the unchanged JS scorer as re-rank, so match metadata and ranking are byte-identical). Guard falls back to the legacy scan when a degenerate query matches most lessons.
- [x] **2.5 `search` -> FTS** (S) - FTS rowids + the exact old LIKE WHERE restricted to matched rows; legacy path kept for sub-3-char queries and FTS-unavailable builds.
- [x] **Bench** - `packages/core/scripts/bench-search.mjs` (run `npm run build:server -w fixmind` first): at 5k lessons, default memory 181 -> 13 ms, query memory ~200 -> ~60 ms, search on par or better.
- [ ] **2.6 Follow-up: degenerate memory queries** (M) - queries whose terms match most lessons still score every lesson in JS (`scoreLesson` + `fromDb` dominate at ~30 ms/625 rows). Next step: two-phase scoring against a light column projection, materializing full lessons only for the top-N.

Verify: new bench script (seed 1k/5k lessons, time `memory` + `search`) shows order-of-magnitude improvement; existing memory tests pass unchanged.

## Phase 3 - Non-blocking sync (MCP save latency)

- [x] **3.1 Outbox pattern** (M) - `save_lesson` returns as soon as the lesson is stored: the MCP server and dashboard use `scheduleAutoPush` (2s debounce, serialized background flush), and CLI saves hand the push to a detached background `fixmind sync push` process. Pending lessons were already derivable (`updatedSince(lastPushedAt)` minus remote snapshots), so the outbox needed no new table; `pendingPushCount` keeps surfacing in `sync status` and the dashboard sync panel.
- [x] **3.2 Tests** (M) - `sync.test.ts`: background push flushes pending lessons, rapid saves coalesce into one push, unentitled accounts skip without network, a failed push records `lastSyncError` and retries successfully, and pending pushes survive a store restart. Conflict/pull paths unchanged and still covered by the existing two-machine tests.

Verify: `save_lesson` p95 latency drops from up-to-10s to local-disk speed; sync eventually consistent.

## Phase 4 - Adaptive spaced repetition

- [x] **4.1 SM-2-style scheduler** (L) - `src/review-schedule.ts`: per-lesson ease (starts 2.5, +0.1 understood / -0.14 partial / -0.54 copied_blindly, floor 1.3) + `last_interval_days` ladder. First pass anchors keep the old 7/3/1 days; growth is `last interval x ease` capped at 60 (understood) / 14 (partial); a lapse resets the ladder to 1 day. Migration v3 adds both columns and seeds existing lessons from the legacy formula so no one's schedule regresses. `next_review_at` semantics unchanged; dashboard review inbox untouched; sync stays compatible with older clients both directions.
- [x] **4.2 Scheduler tests** (M) - `test/review-schedule.test.ts` (progression, lapse reset, slower recovery after lapses, ease floor, unknown handling, store persistence) + `test/migrations.test.ts` (v3 seeding via a simulated pre-v3 database, continuity after seeding, old remote JSON without ease fields).

Verify: weak-graded lessons resurface sooner in tests; dashboard review flow untouched.

## Phase 5 - Dashboard API performance

- [x] **5.1 ETag/304 on `/api/dashboard`** (M) - `store.contentVersion(now)` = row count + sum of epoch-ms `updated_at` + the next due boundary (so the `due` list rolling over with time also invalidates the cache, and sync updates to non-newest lessons are caught by the sum). Unchanged requests get a 304 with `Cache-Control: no-cache`; `?limit&offset=` pages the lessons array as an escape hatch (never ETag-cached). Bench: `scripts/bench-dashboard.mjs` - at 5k lessons, 186 ms + 6.8 MB becomes 1.4 ms + 0 bytes on revalidation.

## Phase 6 - Product features (usability & benefit)

- [x] **6.1 Session-start memory injection** (M) - `fixmind inject` prints the current project's most relevant reviewed lessons (project-path match with Windows casing tolerance, top-reviewed fallback, silent when empty); `fixmind hooks claude` writes an idempotent `SessionStart` hook into `.claude/settings.json` (with `.backup`, command prefers a `fixmind` binary on PATH and falls back to `npx`); `fixmind hooks cursor` writes a memory rule. Both offered during `fixmind setup` (`--session-start-hook` forces it).
- [x] **6.2 Anki export** (M) - `fixmind export --format anki` emits a tab-separated file with `#separator:Tab`/`#html:true` headers: one note per review question, answer + takeaway + scope on the back, concept/pattern tags including a per-lesson `fixmind-<id>` tag for dedupe.
- [x] **6.3 Weekly digest** (S->M) - `fixmind insights --weekly` (7-day window, period-aware labels, due count appended) and a dashboard "This week" sidebar card fed by a new `weeklyDigest` field on `/api/dashboard`. Starter lessons excluded.
- [x] **6.4 Desktop review notifications** (M) - the Tauri shell registers `tauri-plugin-notification` (capability: `notification:default`) and a background thread polls `/api/dashboard?limit=1` (raw HTTP over the existing TCP probe) after 60s and then every 15 minutes, notifying when the due count rises above the last-seen value.
- [x] **6.5 Starter lessons pack** (M) - 15 curated lessons shipped in `src/starter-lessons.ts` (all pass the quality gate, asserted in tests), tagged `fixmind-starter`, staggered due over the first day, excluded from `stats`/`insights`, idempotent install. Offered interactively during `fixmind setup` and via `--starter-pack`.
- [x] **6.6 Team insights design doc** - `docs/team-insights-design.md`: rejects team-key and per-lesson sharing as defaults, proposes opt-in anonymized pattern aggregates (`team_pattern_stats`), states residual risks and a 3-step rollout. No code, per plan.

## Release mapping

| Release | Contents |
|---|---|
| 1.0.27 | Phases 0-1 (quality/CI release) |
| 1.1.0 | Phases 2-5 (performance + adaptive engine) |
| 1.2.0 | 6.1-6.5 (product release) |
| later | 6.6 team tier |

Total: roughly 3-4 weeks of focused work through Phase 6.5, with 6.6 as a separate design-first track.
