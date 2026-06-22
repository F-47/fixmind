# What a lesson actually contains

Every lesson — whether saved by an AI agent through [MCP](../packages/core/docs/mcp-integration.md), by `fixmind save-manual`, or piped in through `fixmind save-ai-summary` — is validated against the same shape and stored in the same local SQLite table. This is that shape, and what fixmind does with it afterward. For the commands referenced below (`save-manual`, `review`, `supersede`, `export`), see [Commands](cli-reference.md).

## Fields

| Field | Required | Purpose |
|---|---|---|
| `title` | yes | Short, learning-oriented title. |
| `problem` | yes | The user-visible **symptom** — what broke or what was observed. The "what happened." |
| `mistake` | yes | The wrong assumption or approach that caused it — the flawed thinking, not just the line that changed. |
| `rootCause` | yes | **Why** the mistake produced the symptom. Meant to add information beyond `problem` and `mistake`, not restate either. |
| `fixSummary` | yes | Why the new code avoids the root cause — not just what changed. |
| `takeaway` | yes | One plain sentence to remember. |
| `whenNotApplicable` | yes | When this advice does **not** apply — a different framework version, or a context where the old code was actually fine. Forces the lesson to state its own scope. |
| `concepts` | yes (≥1) | Reusable concept tags, e.g. `"Next.js hydration"`. Drives "recurring concepts" stats. |
| `reviewQuestions` | yes (≥1) | `{ question, expectedAnswer }` pairs. Meant to be *transfer* questions ("apply this to a different situation"), not recall questions ("what did you change") — the MCP server's instructions reject the latter. |
| `originalPrompt` | no | What you originally asked for. Defaults to empty. |
| `mistakePattern` | no | A 2–4 word reusable category, e.g. "Stale closure". |
| `filesChanged` | no | Defaults to the current git diff's changed files, if git is available at `projectPath`. |
| `codeExample`, `badCodeExample`, `goodCodeExample` | no | Minimal snippets. `badCodeExample` + `goodCodeExample` should pair together. |
| `codeExplanation` | no | The key difference between the broken and corrected snippets. |
| `practiceTask` | no | A small exercise that applies the concept without copying the fix. |
| `tags` | no | `{ name, url? }[]` — `url` should only be set when it points to real official documentation (MDN, framework docs); otherwise the tag shows as a plain label. |
| `understanding` | no | `understood` \| `partial` \| `copied_blindly` \| `unknown` (default). Set by `fixmind review`, not usually at save time. |
| `supersedesLessonId`, `supersedeReason` | no | See [Superseding](#superseding) below. |

Fields not listed above (`id`, `createdAt`, `updatedAt`, `tool`, `nextReviewAt`, `reviewCount`, `status`) are assigned by fixmind, not supplied by the caller.

## Quality gate

Before a lesson from an agent or `save-ai-summary` is stored, `assessLessonQuality` (in `packages/core/src/validation.ts`) checks it for signs that it isn't really learning-worthy — independent of the MCP server's own instructions, which ask the agent not to bother saving these in the first place:

- **Rejected outright** (no lesson is saved): a UI/styling-only change with no described behavior break; `mistake`/`rootCause`/`fixSummary` reduced to a generic placeholder like "fixed the bug"; every review question is recall-only ("what did you change") with no transfer question; a pure refactor (move/rename/extract) with no behavior signal and no code comparison.
- **Saved with a warning**: `rootCause` or `fixSummary` substantially repeats another field instead of adding the missing *why*.

This is the same bar whether the lesson came from an AI agent or a script — `fixmind save-manual`'s interactive flow doesn't run it, since a human typing their own lesson is trusted not to need the gate.

## Spaced repetition

Reviewing a lesson with `fixmind review` sets its next review date based on how well you said you understood it (`packages/core/src/storage.ts`, `reviewIntervalDays`), using the review count *after* this review:

| Understanding | Interval |
|---|---|
| `copied_blindly` | Always 1 day — review again almost immediately. |
| `partial` | `3 × review count` days, capped at 14. |
| `understood` | `7 × 2^(review count − 1)` days, capped at 60. |

So an `understood` lesson is reviewed after 7 days, then 14, then 28, then 56, then every 60. A newly-saved lesson (before its first review) is always due the next day, regardless of who saved it.

## Superseding

If a fix turns out to be wrong or incomplete, `fixmind supersede <oldId> <newId>` (or `supersedesLessonId` on a fresh save) links the old lesson to the corrected one instead of deleting it:

- The old lesson's `status` becomes `superseded`, with `supersededBy` pointing at the new one.
- The new lesson gets `supersedes` pointing back.
- Superseded lessons are hidden from `list`, `search`, and `review` by default (`--include-superseded` to see them), but stay in your exported history.

## Where it lives

Everything above is stored in a single `lessons` table in `~/.fixmind/learning.db` (override with `FIXMIND_DATA_DIR`) — see the `CREATE TABLE` statement in `packages/core/src/storage.ts` for the exact column mapping (camelCase fields become `snake_case` columns). There's no other database, no cloud sync, and no telemetry; `fixmind export` is the only way data leaves that file.
