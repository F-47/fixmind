# FAQ / troubleshooting

## Fixmind isn't saving any lessons

Saving is best-effort: the MCP server only *instructs* the connected client to call `save_lesson` after a meaningful fix (see [MCP Integration](../packages/core/docs/mcp-integration.md#agent-behavior)) — it can't force the call, because the client decides which tools to invoke. If a client isn't consistently following the instructions, just ask it directly: "save a learning lesson after this fix."

If it's calling the tool but nothing's showing up in `fixmind list`, the lesson is probably being rejected by the quality gate, not silently dropped — check the agent's tool-call result in your AI client's transcript. It explains exactly which field needs more substance (see [Lesson Schema](lesson-schema.md#quality-gate)).

## Where is my data?

`~/.fixmind/learning.db` (a SQLite file) and `~/.fixmind/config.json` (local config for review timing and capture mode). Override the directory with `FIXMIND_DATA_DIR` before running any `fixmind` command, including `fixmind setup`.

Nothing is ever uploaded anywhere. `fixmind export` (or the dashboard's Backup & export panel) is the only thing that writes a copy of your data outside that directory.

## What's `config.json` for?

It's written by `fixmind setup` and `fixmind settings`, and fixmind reads it back on startup. It records the version, the spaced-repetition intervals, and the current capture mode. Editing it manually is possible, but `fixmind settings` is the supported way to switch between `strict` and `balanced`.

## How do I back up or move my lessons to another machine?

```bash
fixmind export --format json --output lessons.json
```

On the new machine, there's no `import` command yet — restoring means copying `learning.db` itself (with `FIXMIND_DATA_DIR` pointed at the right place) rather than the export, since the export is for reading/archiving, not round-tripping.

## How do I wipe everything and start over?

There's no CLI command for this on purpose (it's the one truly irreversible action, so it's gated behind a confirmation dialog). Open `fixmind dashboard` → Backup & export → Reset all data. Export a backup first if you might want any of it back.

## `fixmind review` says nothing is due, but I just saved a lesson

That's expected — a freshly-saved lesson's first review is the next day, not immediately (see [Lesson Schema](lesson-schema.md#spaced-repetition)). Check with `fixmind status` or `fixmind list` (which shows each lesson's next review date) rather than assuming it should appear right away.

## Setup says a client is "unavailable"

`fixmind setup` configures Codex and Claude Code by shelling out to their own CLIs (`codex`, `claude`) — if those aren't on your `PATH`, setup reports the client as unavailable rather than silently skipping it. Cursor doesn't need this since fixmind writes its config file directly. Install the missing CLI, or pass `--client` with only the ones you actually have.

## Does `--scope project` work for every client?

Cursor and Claude Code, yes — Cursor gets a project-local `.cursor/mcp.json`, Claude Code uses its own `--scope project` flag. Codex's CLI has no equivalent flag, so a project-scoped `setup` for Codex still registers globally and says so in the output, rather than silently doing nothing or guessing a flag that doesn't exist.

## Can I use fixmind without any AI client at all?

Yes — `fixmind save-manual` is a fully interactive way to log a lesson yourself, with no MCP server or agent involved. Everything else (`review`, `list`, `search`, `stats`, `dashboard`) works the same regardless of how a lesson was saved.
