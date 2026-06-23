# Quickstart

**Requirements:** Node.js 22.13+

Fixmind uses Node's built-in `node:sqlite` module. If setup fails with
`ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`, upgrade Node
to 22.13 or newer.

```bash
npx fixmind setup
```

`npx fixmind setup` detects Claude Code, Cursor, and Codex, and registers the fixmind MCP server with whichever ones you pick — globally on this device, or scoped to a single project with `--scope project`. It defaults to strict capture mode; pick `balanced` during setup or later with `fixmind settings` if you want the agent to save borderline-but-useful fixes more often. Restart your AI client after setup finishes. Full flag reference: [Commands](cli-reference.md#fixmind-setup). No supported client installed? See [MCP Integration](../packages/core/docs/mcp-integration.md#other-mcp-clients) for a generic config.

## What happens next

1. **Fix bugs like normal.** Hand a bug to your agent through Claude Code, Cursor, or Codex. It patches it.
2. **The agent saves a lesson.** If the fix involved real learning — not a rename, a formatting pass, or a pure refactor — the agent calls the `save_lesson` MCP tool to log the problem, the mistake, the root cause, and the fix. Fixmind's quality gate rejects anything that doesn't clear that bar; see [Lesson Schema](lesson-schema.md#quality-gate).
3. **It's stored locally.** Everything lands in `~/.fixmind/learning.db`, a SQLite file on your machine. No account, no cloud, no telemetry.
4. **You review it later.** `fixmind review` resurfaces the lesson on a spaced schedule (1, 3, 7+ days) with a real question, not just the diff, so you actually retain it. Run `fixmind list` or `fixmind status` any time to see what's saved and what's due.

No AI client at all? `fixmind save-manual` logs a lesson yourself, interactively or fully scripted.

## Where to go next

- [Commands](cli-reference.md) — every CLI command and flag.
- [MCP Integration](../packages/core/docs/mcp-integration.md) — how the MCP server and tool actually work, token overhead, manual client config.
- [Lesson Schema](lesson-schema.md) — what gets stored and how spaced repetition timing works.
- [FAQ & Troubleshooting](faq.md) — agent not saving lessons, backups, resets, per-client quirks.
