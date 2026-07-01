# CLI reference

This page lists every `fixmind` command and flag. If you're new here, start with [Quickstart](quickstart.md) first. For the MCP tool an agent calls automatically, see [MCP Integration](mcp-integration.md). For what a lesson actually contains, see [Lesson Schema](lesson-schema.md).

## Setup

### `fixmind setup`

Sets up Claude Code, Cursor, and Codex, then registers the MCP server with whichever ones you pick.

```bash
fixmind setup
fixmind setup --client codex,claude,cursor
fixmind setup --capture-mode balanced
fixmind setup --client cursor --dry-run
fixmind setup --scope project
```

| Flag | Default | Meaning |
|---|---|---|
| `--client <list>` | autodetected | Comma-separated clients to configure: `codex`, `claude`, `cursor`. Skips the interactive picker. |
| `--scope <user\|project>` | `user` | `user` configures the client globally (every project on this device). `project` scopes Cursor's config, instruction files, and Claude's permissions to the current directory instead. Codex has no project-scope flag, so a project-scoped request for it still registers globally. |
| `--capture-mode <strict\|balanced>` | `strict` | `strict` keeps capture conservative. `balanced` lets the agent save more borderline-but-useful lessons. |
| `--dry-run` | off | Print what would change without writing anything. |

If no supported client is found and you do not pass `--client`, Fixmind prints a generic MCP server config you can paste into any other stdio-compatible client.

### `fixmind settings`

```bash
fixmind settings
fixmind settings --capture-mode balanced
```

| Flag | Default | Meaning |
|---|---|---|
| `--capture-mode <strict\|balanced>` | current value | Updates the local capture mode without re-running setup. `strict` is the default; `balanced` captures more borderline-but-useful fixes. |

After changing the mode, restart your AI client so it picks up the updated MCP instructions.

### `fixmind memory`

```bash
fixmind memory
fixmind memory hydration
fixmind memory stale closure --limit 3
```

Returns the small set of reviewed, active lessons that are most relevant to the query. This is the memory view the agent uses when it wants to reuse a past lesson as guidance instead of just keeping history.

### `fixmind mcp`

Starts the MCP server on stdio. You usually do not run this yourself - the AI client you configured with `fixmind setup` launches it for you.

## Reviewing

### `fixmind review`

Interactive. Walks through every lesson that's currently due, one at a time. It shows the problem and takeaway, asks each question, shows the expected answer after you respond (or type `skip`), then asks how well you understood it (`understood` / `partial` / `copied_blindly`). Requires a real terminal (TTY) - see [Lesson Schema](lesson-schema.md#spaced-repetition) for how your answer changes the next review date. No flags.

## Dashboard

### `fixmind dashboard`

```bash
fixmind dashboard
fixmind dashboard --port 8080
fixmind dashboard --no-open
```

Opens the visual dashboard on `127.0.0.1` only. `--port <n>` picks the port (default `4317`); `--no-open` skips auto-opening the browser.

## Browsing lessons

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

Prints two tables: how often each concept shows up, and how often each mistake pattern shows up. No flags.

### `fixmind insights`

Summarizes the last 30 days of recent saves and reviews: top mistake patterns, concepts that are still marked as learning after review, and recurring files/tools. No flags.

### `fixmind status`

One line: how many lessons are due for review right now, or that none are. Useful for shells or prompts that want a quick due-count check. No flags.

### `fixmind diagnose` (alias: `fixmind diagnostics`)

Explains the most likely local reasons a lesson did not save. It checks whether the current directory is inside a Git repo, whether the working tree has changes to mine, whether Fixmind instructions are present in the current user or project scope, and whether Claude Code appears to allow the `mcp__fixmind__save_lesson` permission entry.

```bash
fixmind diagnose
fixmind diagnostics
```

## Capturing lessons

### `fixmind save-manual` (alias: `fixmind save`)

Interactive prompts for every field, for logging a lesson yourself without going through an agent. Every field also has a flag, so you can script it non-interactively too:

In interactive mode, `fixmind save-manual` starts with a template picker for common bug shapes: architecture boundary mistakes, stale state, async timing, off-by-one, and null-guard cases. When Git is available, Fixmind also seeds `files-changed`, `mistake-pattern`, `concepts`, and `code-example` from the current diff when it can infer them. Pick **Blank** if you want to start from scratch.

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
| `--title`, `--problem`, `--mistake`, `--root-cause`, `--fix-summary`, `--takeaway`, `--when-not-applicable`, `--concepts` | Required fields - see [Lesson Schema](lesson-schema.md). |
| `--original-prompt` | What you originally asked for. |
| `--mistake-pattern` | Short reusable category, e.g. "Stale closure". |
| `--concepts`, `--files-changed`, `--tags` | Comma-separated lists. When Git is available, `--files-changed` is seeded from the current diff if omitted, and the interactive prompts may prefill `mistake-pattern`, `concepts`, and `code-example` from the same diff. |
| `--code-example`, `--bad-code-example`, `--good-code-example`, `--code-explanation` | Code comparison. |
| `--practice-task` | A small exercise to apply the concept. |
| `--review-question`, `--expected-answer` | One recall question (required). |
| `--tool` | Defaults to `manual`. |
| `--understanding` | `understood` \| `partial` \| `copied_blindly` \| `unknown` (default). |

Any field's flag can be omitted in an interactive terminal - you'll be prompted instead. Outside a terminal (for example, when piped into a script), omitted fields fall back to empty and required ones will fail validation.

### `fixmind save-ai-summary` (alias: `fixmind save-from-summary`)

Pipes a JSON lesson payload - the same shape the MCP tool accepts - into storage, for scripts and integrations that are not live MCP clients.

```bash
fixmind save-ai-summary --file lesson.json
cat lesson.json | fixmind save-ai-summary
```

Rejects the input with a list of reasons if it does not meet the same quality bar the MCP tool enforces (see [Lesson Schema](lesson-schema.md#quality-gate)).

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

Asks for confirmation interactively. Outside a terminal, requires `--yes` (or `-y`) or it refuses to delete. Permanent - there's no undo beyond restoring from an export.

### `fixmind supersede <oldId> <newId>`

```bash
fixmind supersede 8d7571ed a3f9c021 --reason "The first fix didn't handle the SSR case"
```

Marks `oldId` as superseded by `newId` - linked, not deleted. Superseded lessons drop out of `list`, `search`, and `review` by default (pass `--include-superseded` to see them), but stay in your history with a link to the corrected lesson. Use this when a fix turned out to be wrong or incomplete, not for simple rewording.

## Sync (Pro)

Sync is an optional Pro feature for keeping the same lessons on more than one machine. See [Sync setup](sync-setup.md) for the user flow and what to expect after you sign in.

### `fixmind login`

```bash
fixmind login
fixmind login --password-login --email you@example.com --password ... --passphrase ...
```

By default this opens your browser to sign in. Pass `--password-login` to use email/password instead. Either way it stores a session locally at `~/.fixmind/sync.json` and asks for an encryption passphrase. Fixmind encrypts lesson content on your machine before it ever leaves the device, so use the **same passphrase on every machine**. It cannot be recovered or changed without losing access to already-synced data.

`fixmind login` succeeds and saves your session even without an active Pro/Team plan - it just tells you sync isn't active yet. That way subscribing later only requires `fixmind sync push`, not a second sign-in.

| Flag | Default | Meaning |
|---|---|---|
| `--url <url>` | `$FIXMIND_SUPABASE_URL` | Sync service URL. |
| `--key <key>` | `$FIXMIND_SUPABASE_ANON_KEY` | Sync service public key. |
| `--passphrase` | prompted | Required outside an interactive terminal. |
| `--password-login` | off | Use email/password instead of the browser sign-in flow. |
| `--email`, `--password` | prompted | Only used with `--password-login`; required outside an interactive terminal. |

### `fixmind sync push`

Encrypts and uploads every lesson changed since the last push.

### `fixmind sync pull`

Downloads and decrypts lessons changed on other machines since the last pull, then applies them locally. If a lesson was also edited locally, the newer `updatedAt` wins - the local edit is kept even if an older remote version arrives.

### Automatic sync

If you're logged in (`fixmind login` has been run), two things happen without needing the explicit commands above:

- Saving a lesson - via `fixmind save`, `fixmind save-from-summary`, or the AI agent's `save_lesson` MCP tool call - automatically pushes it.
- Opening `fixmind dashboard` automatically pulls first, so it shows lessons synced from other machines.

Both are best-effort: a failed auto-push or auto-pull (offline, timeout) logs a one-line warning but never blocks the save or the dashboard from loading. If you're not logged in, neither does anything.

### `fixmind sync status`

Prints whether you're logged in, and the last push/pull times.

### `fixmind logout`

Removes the local session at `~/.fixmind/sync.json`. It does not delete anything from the sync service.

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

You can also export from the dashboard (`fixmind dashboard` -> Backup & export) if you want a point-and-click download.
