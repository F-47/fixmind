# What a lesson actually contains

This page shows the shape of a Fixmind lesson. Every lesson saved by an AI agent through [MCP](mcp-integration.md), by `fixmind save-manual`, or by piping JSON into `fixmind save-ai-summary` uses the same structure and ends up in the same local SQLite table. For the commands mentioned below, see [CLI reference](cli-reference.md).

## Fields

| Field | Required | Purpose |
|---|---|---|
| `title` | yes | Short title that describes the lesson in plain language. |
| `problem` | yes | The visible symptom. What broke, or what the user saw. |
| `mistake` | yes | The wrong assumption or approach that caused the problem. |
| `rootCause` | yes | Why the mistake led to the symptom. This should add new information, not repeat `problem` or `mistake`. For package, runtime, build, or deployment failures, explain the architectural boundary: where each side runs, what belongs in the client bundle, and the supported interface between them. |
| `fixSummary` | yes | Why the fix works. Do not just restate the code change. |
| `takeaway` | yes | One sentence worth remembering later. |
| `whenNotApplicable` | yes | When this lesson does not apply. This keeps the scope honest. |
| `concepts` | yes (>=1) | Reusable concept tags, such as `"Next.js hydration"`. Used for stats and search. |
| `reviewQuestions` | yes (>=1) | Transfer questions that ask how to apply the idea elsewhere. Do not use simple recall questions. |
| `originalPrompt` | no | The original user request. |
| `mistakePattern` | no | A short reusable category, such as `"Stale closure"`. |
| `filesChanged` | no | Defaults to the files in the current git diff, if git is available. Fixmind also uses that diff to seed `mistakePattern`, `concepts`, and `codeExample` when it can infer them. |
| `codeExample`, `badCodeExample`, `goodCodeExample` | no | Short code snippets. The bad and good examples should be a pair. |
| `codeExplanation` | no | The important difference between the broken and corrected code. |
| `practiceTask` | no | A small exercise that applies the idea without copying the fix. |
| `tags` | no | `{ name, url? }[]`. Only set `url` when it points to official documentation. |
| `understanding` | no | `understood`, `partial`, `copied_blindly`, or `unknown`. This is usually set during review. |
| `supersedesLessonId`, `supersedeReason` | no | See [Superseding](#superseding). |

Fields not listed above (`id`, `createdAt`, `updatedAt`, `tool`, `nextReviewAt`, `reviewCount`, `ease`, `lastIntervalDays`, `status`) are assigned by Fixmind, not by the caller.

## Quality gate

Before an AI-saved lesson or `save-ai-summary` entry is stored, Fixmind checks whether it is actually worth keeping.

It rejects lessons outright when they are just:

- a styling-only change with no behavior bug
- a generic "fixed the bug" answer with no real explanation
- a recall-only review question with no transfer question
- a pure move/rename/extract refactor with no behavior signal

It saves with a warning when `rootCause` or `fixSummary` mostly repeats another field instead of adding the missing why.

For example, a native app failing to resolve a database package is not only a module-resolution error. The lesson should explain that Expo/Metro builds code for the device while the database package is server-only, and that the typed API client is the supported client-to-server boundary. The local enum mirror is the fix; the runtime and bundle boundary are the reusable lesson.

`strict` versus `balanced` only changes how aggressively the agent is asked to save lessons. It does not weaken this quality gate.

`fixmind save-manual` does not run the gate, because a human typing the lesson is already making that judgment.

## Spaced repetition

When you review a lesson with `fixmind review`, Fixmind sets the next review date with an adaptive, SM-2-style schedule. Each lesson tracks an ease factor that reflects how consistently you have known it:

| Understanding | First pass | After that |
|---|---|---|
| `understood` | 7 days | last interval x ease, capped at 60 days. |
| `partial` | 3 days | last interval x ease, capped at 14 days. |
| `copied_blindly` | Always 1 day, and the interval ladder resets. | |

The ease factor starts at 2.5, moves up 0.1 for `understood`, down 0.14 for `partial`, and down 0.54 for `copied_blindly`, and never drops below 1.3. Because a lapse resets the interval ladder and lowers the ease factor, a lesson that once burned you climbs back to long intervals more slowly than one you consistently nail. A newly saved lesson is always due the next day.

## Superseding

If a fix turns out to be wrong or incomplete, `fixmind supersede <oldId> <newId>` or `supersedesLessonId` on a fresh save links the old lesson to the corrected one instead of deleting it.

- The old lesson's `status` becomes `superseded`, with `supersededBy` pointing at the new one.
- The new lesson gets `supersedes` pointing back.
- Superseded lessons are hidden from `list`, `search`, and `review` by default, but you can show them with `--include-superseded`.

If the first lesson was based on an incorrect or incomplete fix, do not overwrite it by hand. Save the corrected lesson, then supersede the older one so review and search use the right version while the original attempt stays traceable.

## Where it lives

Everything above is stored in one `lessons` table in `~/.fixmind/learning.db` (override with `FIXMIND_DATA_DIR`).

There is no separate database, no cloud sync, and no telemetry. `fixmind export` is the only way data leaves that file.
