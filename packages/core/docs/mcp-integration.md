# MCP Integration

## Supported clients

![Claude Code](/logos/claude.svg) ![Cursor](/logos/cursor.svg) ![Codex](/logos/codex.svg)

`fixmind setup` detects and configures Claude Code, Cursor, and Codex. Other MCP-compatible clients work too. See [Other MCP clients](#other-mcp-clients).

Fixmind exposes a local stdio MCP server with two tools:

- `memory` retrieves a small set of reviewed, active lessons related to the current task.
- `save_lesson` records a new learning lesson after a meaningful coding fix.

Everything stays local. The MCP server does not call an AI API, upload code, or expose your lesson history in bulk. Opt-in encrypted sync is a separate feature; it is not part of an MCP tool call. For what gets stored and how it is reviewed afterward, see [Lesson Schema](./lesson-schema.md). For the `fixmind setup` flags used below, see [CLI reference](./cli-reference.md#fixmind-setup).

If you want client-specific setup notes for Claude Code, Codex, Cursor, VS Code, Copilot CLI, OpenCode, Pi, or another MCP client, see [MCP Clients](./mcp-clients.md).

## Guided setup

Run:

```powershell
npx fixmind setup
```

The setup command detects Codex, Claude Code, and Cursor, asks which clients to configure, initializes local storage, and registers this stdio command:

```powershell
npx -y fixmind mcp
```

On Windows, clients receive the compatible equivalent using `cmd /c`.

Non-interactive examples:

```powershell
npx fixmind setup --client codex,claude,cursor
npx fixmind setup --client cursor --dry-run
```

Setup is idempotent. Existing MCP entries are preserved. Before changing Cursor's JSON configuration, the previous file is copied to `mcp.json.backup`.

For Claude Code, setup also pre-approves the `mcp__fixmind__save_lesson` tool by adding it to `permissions.allow` in `~/.claude/settings.json`, so the agent is not blocked by a runtime permission prompt when saving a lesson. Existing settings and other permission entries are preserved, and a `.backup` copy of `settings.json` is made before the first change.

## Other MCP clients

If no supported client is detected, `fixmind setup` prints a generic MCP configuration you can paste into any stdio-compatible client:

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

## How it works

1. Your MCP client starts `fixmind mcp` as a local stdio process and receives the server instructions plus both tool schemas.
2. For a task that resembles a previous mistake, the agent can call `memory` and apply the returned guidance.
3. After a qualifying fix, the agent can call `save_lesson`. If `projectPath` is available, Fixmind fills omitted changed-file, source-diff, concept, mistake-pattern, and code-example context from the current Git working tree.
4. Fixmind validates the lesson and its learning quality locally, then stores accepted lessons in its local SQLite database. If sync is configured, the normal post-save sync path runs separately.

Tool use is best-effort: the MCP client and agent decide whether to call either tool.

## Agent behavior

The MCP server tells the agent to save a lesson after a meaningful coding fix and skip formatting-only, rename-only, generated-file, and mechanical changes. The current capture mode comes from `~/.fixmind/config.json`: `strict` is the default, while `balanced` tells the agent to be more willing to save borderline-but-useful lessons. Restart your AI client after changing the mode so it picks up the new instructions.

The prompt also includes a few lesson shapes for common bug patterns, like architecture boundary mistakes, stale state, async timing, off-by-one, and null-guard cases, so the agent can stay consistent without becoming verbose.

When a new task looks like a past mistake, the agent should call `memory` first and use the returned takeaway and scope notes as guidance for the response.

If a client is not consistently saving lessons, you can ask it directly: "save a learning lesson after the fix."

If a save does not meet the quality bar, `save_lesson` returns an error explaining what is missing or too generic. The agent can revise the payload and retry; no lesson is stored until validation succeeds.

If a client is not consistently calling `save_lesson`, or you want to know why a save was rejected, see [FAQ & Troubleshooting](./faq.md).

## Tool input

### `memory`

```json
{
  "query": "hydration mismatch",
  "limit": 5
}
```

`query` is optional. `limit` defaults to `5`.

The `save_lesson` tool accepts:

```json
{
  "projectPath": "/path/to/project",
  "title": "Short learning-oriented title",
  "originalPrompt": "The user's original request",
  "problem": "What behavior was broken",
  "mistake": "The specific mistake",
  "rootCause": "Why the mistake caused the behavior, including the runtime or package boundary when relevant",
  "fixSummary": "What changed and why it works",
  "takeaway": "One plain sentence the developer should remember",
  "whenNotApplicable": "When this advice needs a different approach",
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
      "question": "A transfer question that applies the rule elsewhere",
      "expectedAnswer": "A concise expected answer"
    }
  ],
  "understanding": "unknown",
  "tags": [
    { "name": "MDN: fetch()", "url": "https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch" }
  ]
}
```

`tool`, `projectPath`, `filesChanged`, `sourceDiff`, `concepts`, `mistakePattern`, code examples, tags, and supersession fields are optional. Fixmind reads `tool` from the connected MCP client's `clientInfo.name` during the initialize handshake. Each `tags` entry is `{ name, url? }`; only set `url` when it points to real official documentation. Otherwise omit it and the tag is shown as a plain label.

If Git is available at `projectPath`, omitted changed files, source diff, concepts, mistake pattern, and code example fields are collected from the current working tree when they can be inferred.

To replace a previously saved lesson that turned out to be wrong or incomplete, include `supersedesLessonId` and `supersedeReason`. The previous lesson remains in history but is hidden from normal search and review.
