# MCP Integration

## Supported clients

![Claude Code](/logos/claude.svg) ![Cursor](/logos/cursor.svg) ![Codex](/logos/codex.svg)

`fixmind setup` detects and configures all three. Any other MCP-compatible client works too — see [Other MCP clients](#other-mcp-clients).

Fixmind exposes a local stdio MCP server. Any MCP-compatible AI coding client can start it and call one tool:

`save_lesson`

The tool stores a lesson locally. It does not call an AI API, upload code, or expose lesson history to the agent. For what gets stored and how it's reviewed afterward, see [Lesson Schema](../../../docs/lesson-schema.md). For the `fixmind setup` flags used below, see [Commands](../../../docs/cli-reference.md#fixmind-setup).

## Guided setup

After installing the package globally, run:

```powershell
fixmind setup
```

The setup command detects Codex, Claude Code, and Cursor, asks which clients to configure, initializes local storage, and registers this stdio command:

```powershell
npx -y fixmind mcp
```

On Windows, clients receive the compatible equivalent using `cmd /c`.

Non-interactive examples:

```powershell
fixmind setup --client codex,claude,cursor
fixmind setup --client cursor --dry-run
```

Setup is idempotent. Existing MCP entries are preserved. Before changing Cursor's JSON configuration, the previous file is copied to `mcp.json.backup`.

For Claude Code, setup additionally pre-approves the `mcp__fixmind__save_lesson` tool by adding it to `permissions.allow` in `~/.claude/settings.json`, so the agent isn't blocked by a runtime permission prompt when saving a lesson. Existing settings and other permission entries are preserved, and a `.backup` copy of `settings.json` is made before the first change.

## Other MCP clients

Run `fixmind setup` on a machine where no supported client is detected to print a generic MCP configuration. The equivalent configuration is:

```json
{
  "mcpServers": {
    "fixmind": {
      "command": "npx",
      "args": ["-y", "fixmind", "mcp"]
    }
  }
}
```

## Agent behavior

The MCP server sends instructions asking the agent to create a lesson after a meaningful coding fix and skip formatting-only, rename-only, generated-file, and mechanical changes. The current capture mode comes from `~/.fixmind/config.json`: `strict` is the default, while `balanced` tells the agent to be more willing to save borderline-but-useful lessons. Restart your AI client after changing the mode so it receives the updated instructions.

Automatic use is best-effort because each MCP client decides when to call available tools. The human can explicitly say "save a learning lesson after the fix" if a client does not consistently follow server instructions.

## Token and context overhead

Connecting the fixmind MCP server adds a small, mostly one-time cost to an agent's context:

- The server's instructions and the `save_lesson` tool schema are sent once when the client connects. Clients that support prompt caching reuse this across subsequent turns in the same session.
- `save_lesson` is called only when the agent determines a meaningful fix occurred, per the checklist in its instructions — not on every turn. Sessions with no qualifying fixes add nothing beyond the initial connection cost.
- When a lesson is saved, the generated payload (problem, root cause, fix summary, takeaway, code examples, review questions) is comparable in size to a short commit message or code review comment.

In practice, this overhead is negligible relative to the tokens used by the coding work itself.

If a client isn't consistently calling `save_lesson`, or you want to know why a save was rejected, see [FAQ & Troubleshooting](../../../docs/faq.md).

## Tool input

The MCP tool accepts:

```json
{
  "projectPath": "/path/to/project",
  "title": "Short learning-oriented title",
  "originalPrompt": "The user's original request",
  "problem": "What behavior was broken",
  "mistake": "The specific mistake",
  "rootCause": "Why the mistake caused the behavior",
  "fixSummary": "What changed and why it works",
  "takeaway": "One plain sentence the developer should remember",
  "mistakePattern": "A short reusable category",
  "concepts": ["Reusable concept"],
  "filesChanged": ["src/example.ts"],
  "codeExample": "A small focused example",
  "badCodeExample": "A minimal example showing the mistake",
  "goodCodeExample": "A minimal corrected example",
  "codeExplanation": "The important difference between the two examples",
  "practiceTask": "A small exercise to apply the concept",
  "reviewQuestions": [
    {
      "question": "A recall question",
      "expectedAnswer": "A concise expected answer"
    }
  ],
  "understanding": "unknown",
  "tags": [
    { "name": "MDN: fetch()", "url": "https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch" }
  ]
}
```

`tool` is optional and normally omitted: fixmind reads it from the connected MCP client's `clientInfo.name` during the initialize handshake. Each `tags` entry is `{ name, url? }`; only set `url` when it points to real, official documentation (MDN, the framework's docs, etc.) — otherwise omit it and the tag is shown as a plain label.

If Git is available at `projectPath`, omitted changed files and source diff are collected from the current working tree.
