# CLI reference

Every `fixmind` command, with every flag it accepts. For the MCP tool an agent calls automatically, see [mcp-integration.md](../packages/core/docs/mcp-integration.md). For what a lesson actually contains, see [lesson-schema.md](lesson-schema.md).

## Setup

### `fixmind setup`

Detects Claude Code, Cursor, and Codex, and registers the MCP server with whichever ones you pick.

```bash
fixmind setup
fixmind setup --client codex,claude,cursor
fixmind setup --client cursor --dry-run
fixmind setup --scope project
```

| Flag | Default | Meaning |
|---|---|---|
| `--client <list>` | autodetected | Comma-separated clients to configure: `codex`, `claude`, `cursor`. Skips the interactive picker. |
| `--scope <user\|project>` | `user` | `user` configures the client globally (every project on this device). `project` scopes Cursor's config, instruction files, and Claude's permissions to the current directory instead. Codex has no project-scope flag, so a project-scoped request for it still registers globally. |
| `--dry-run` | off | Print what would change without writing anything. |

Run with no supported client detected and no `--client` flag to print a generic MCP server config for any other stdio-compatible client.

### `fixmind mcp`

Starts the MCP server on stdio. You don't run this yourself — the AI client you configured with `fixmind setup` launches it.

## Capturing lessons

### `fixmind save-manual` (alias: `fixmind save`)

Interactive prompts for every field, for logging a lesson yourself without going through an agent. Every field also has a flag, so it can be scripted non-interactively:

```bash
fixmind save-manual \
  --title "Keep server and client renders identical" \
  --problem "Theme label flashed on load" \
  --mistake "Read localStorage during the initial render" \
  --root-cause "Server has no access to localStorage" \
  --fix-summary "Render a stable default, then sync in useEffect" \
  --takeaway "Keep server and first client render identical" \
  --when-not-applicable "Doesn't apply to client-only components" \
  --concepts "Next.js hydration" \
  --review-question "What must be true about the first render?" \
  --expected-answer "It must match the server's output exactly"
```

| Flag | Notes |
|---|---|
| `--title`, `--problem`, `--mistake`, `--root-cause`, `--fix-summary`, `--takeaway`, `--when-not-applicable`, `--concepts` | Required fields — see [lesson-schema.md](lesson-schema.md). |
| `--original-prompt` | What you originally asked for. |
| `--mistake-pattern` | Short reusable category, e.g. "Stale closure". |
| `--concepts`, `--files-changed`, `--tags` | Comma-separated lists. `--files-changed` defaults to the current git diff if omitted. |
| `--code-example`, `--bad-code-example`, `--good-code-example`, `--code-explanation` | Code comparison. |
| `--practice-task` | A small exercise to apply the concept. |
| `--review-question`, `--expected-answer` | One recall question (required). |
| `--tool` | Defaults to `manual`. |
| `--understanding` | `understood` \| `partial` \| `copied_blindly` \| `unknown` (default). |

Any field's flag can be omitted in an interactive terminal — you'll be prompted instead. Outside a terminal (e.g. piped into a script), omitted fields fall back to empty and required ones will fail validation.

### `fixmind save-ai-summary` (alias: `fixmind save-from-summary`)

Pipes a JSON lesson payload — the same shape the MCP tool accepts — into storage, for scripts and integrations that aren't a live MCP client.

```bash
fixmind save-ai-summary --file lesson.json
cat lesson.json | fixmind save-ai-summary
```

Rejects the input with a list of reasons if it doesn't clear the same quality bar the MCP tool enforces (see [lesson-schema.md](lesson-schema.md#quality-gate)).

## Browsing

### `fixmind list`

```bash
fixmind list
fixmind list --limit 5
fixmind list --include-superseded
```

| Flag | Default | Meaning |
|---|---|---|
| `--limit <n>` | 20 | Most recent lessons to show. |
| `--include-superseded` | off | Include lessons marked superseded (hidden by default). |

### `fixmind search <query>`

```bash
fixmind search "hydration"
fixmind search "hydration" --include-superseded
```

Matches title, problem, root cause, fix summary, takeaway, mistake pattern, concepts, and tags.

### `fixmind stats`

Prints two tables: how often each concept recurs, and how often each mistake pattern recurs. No flags.

### `fixmind status`

One line: how many lessons are due for review right now, or that none are. Used by shells/prompts that want a quick due-count check. No flags.

## Reviewing

### `fixmind review`

Interactive. Walks through every lesson that's currently due, one at a time: shows the problem and takeaway, asks each recall question, shows the expected answer after you respond (or type `skip`), then asks how well you understood it (`understood` / `partial` / `copied_blindly`). Requires a real terminal (TTY) — see [lesson-schema.md](lesson-schema.md#spaced-repetition) for how your answer changes the next review date. No flags.

## Editing

### `fixmind edit <id>`

```bash
fixmind edit 8d7571ed --title "New title"
fixmind edit 8d7571ed --understanding understood
```

Accepts the same field flags as `save-manual`, except `--review-question`, `--expected-answer`, `--original-prompt`, and `--tool` (those aren't editable this way). `<id>` can be the full id or any unique prefix shown by `fixmind list`. In an interactive terminal, omitted fields prompt with the current value pre-filled; non-interactively, omitted fields are left unchanged.

### `fixmind delete <id>`

```bash
fixmind delete 8d7571ed
fixmind delete 8d7571ed --yes
```

Asks for confirmation interactively. Outside a terminal, requires `--yes` (or `-y`) or it refuses to delete. Permanent — there's no undo beyond restoring from an export.

### `fixmind supersede <oldId> <newId>`

```bash
fixmind supersede 8d7571ed a3f9c021 --reason "The first fix didn't handle the SSR case"
```

Marks `oldId` as superseded by `newId` — linked, not deleted. Superseded lessons drop out of `list`, `search`, and `review` by default (pass `--include-superseded` to see them), but stay in your history with a link to the corrected lesson. Use this when a fix turned out to be wrong or incomplete, not for simple rewording.

## Backup and export

### `fixmind export`

```bash
fixmind export --format json
fixmind export --format md --output lessons.md
fixmind export --id 8d7571ed --format md
```

| Flag | Default | Meaning |
|---|---|---|
| `--format <json\|md>` | `json` | Output format. |
| `--output <file>` | stdout | Write to a file instead of printing. |
| `--id <id>` | all lessons | Export a single lesson instead of the whole library. |

Same export is available from the dashboard (`fixmind dashboard` → Backup & export) for a point-and-click download.

## Dashboard

### `fixmind dashboard`

```bash
fixmind dashboard
fixmind dashboard --port 8080
fixmind dashboard --no-open
```

Opens the visual dashboard, bound to `127.0.0.1` only. `--port <n>` picks the port (default `4317`); `--no-open` skips auto-opening the browser.
