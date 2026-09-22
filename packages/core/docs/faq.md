# FAQ / troubleshooting

## Fixmind isn't saving lessons

Saving is best-effort. The MCP server tells the connected client to call `save_lesson` after a meaningful fix, but it cannot force the call because the client decides which tools to use. If the client is not following the instruction reliably, say this directly: "save a learning lesson after this fix."

If the tool is being called but nothing shows up in `fixmind list`, the lesson is probably being rejected by the quality gate, not silently dropped. Check the agent's tool-call result in your AI client's transcript. It tells you which field needs more substance (see [Lesson Schema](lesson-schema.md#quality-gate)).

## Where is my data?

Your data lives in `~/.fixmind/learning.db` and `~/.fixmind/config.json`.

- `learning.db` is the SQLite file with your lessons.
- `config.json` stores review timing and capture mode.

You can change the folder with `FIXMIND_DATA_DIR` before running any `fixmind` command, including `fixmind setup`.

Nothing is uploaded anywhere unless you enable sync or run `fixmind export` or use the dashboard's Backup & export panel. Sync pushes encrypted lessons to your account; export is the only way to write a copy of your data outside that folder when you stay local-only.

## What is `config.json` for?

`fixmind setup` and `fixmind settings` write it, and Fixmind reads it on startup. It records the version, the spaced-repetition intervals, and the current capture mode.

You can edit it by hand, but `fixmind settings` is the supported way to switch between `strict` and `balanced`.

## How do I back up or move my lessons to another machine?

```bash
fixmind export --format json --output lessons.json
```

There is no `import` command yet. To restore on a new machine, copy `learning.db` itself and point `FIXMIND_DATA_DIR` at the right folder. The export file is for reading and archiving, not round-tripping.

## How do I wipe everything and start over?

There is no CLI command for this on purpose. It is the one truly irreversible action, so Fixmind keeps it behind a confirmation dialog in the dashboard. Open `fixmind dashboard`, then go to Backup & export and choose Reset all data. Export a backup first if you might want anything back later.

## What if a saved lesson turns out to be wrong?

The old lesson stays in your history unless you supersede it. When the fix is finally correct, save the corrected lesson and run `fixmind supersede <oldId> <newId>` so the wrong lesson is hidden from review and search but still preserved in the archive.

That is the intended recovery path for "we thought it was fixed, but it wasn't yet."

## `fixmind review` says nothing is due, but I just saved a lesson

That is expected. A freshly saved lesson's first review is the next day, not immediately (see [Lesson Schema](lesson-schema.md#spaced-repetition)). Use `fixmind status` or `fixmind list` to check the next review date instead of expecting it to appear right away.

## Setup says a client is "unavailable"

`fixmind setup` configures Codex and Claude Code by calling their own CLIs (`codex`, `claude`). If those commands are not on your `PATH`, setup reports the client as unavailable instead of silently skipping it. Cursor does not need this because Fixmind writes its config file directly.

Install the missing CLI, or pass `--client` with only the ones you actually have.

## Does `--scope project` work for every client?

Cursor and Claude Code, yes. Cursor gets a project-local `.cursor/mcp.json`, and Claude Code uses its own `--scope project` flag. Codex's CLI has no equivalent flag, so a project-scoped `setup` for Codex still registers globally and says so in the output instead of silently doing nothing or guessing a flag that does not exist.

## Can I use Fixmind without any AI client at all?

Yes. `fixmind save-manual` is a fully interactive way to log a lesson yourself, with no MCP server or agent involved. Everything else (`review`, `list`, `search`, `stats`, `dashboard`) works the same regardless of how a lesson was saved.
