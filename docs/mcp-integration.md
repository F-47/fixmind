# MCP Integration

Fixmind exposes a local stdio MCP server. Any MCP-compatible AI coding client can start it and call one tool:

`save_learning_lesson`

The tool stores a lesson locally. It does not call an AI API, upload code, or expose lesson history to the agent.

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

The MCP server sends instructions asking the agent to create a lesson after a meaningful coding fix and skip formatting-only, rename-only, generated-file, and mechanical changes.

Automatic use is best-effort because each MCP client decides when to call available tools. The human can explicitly say "save a learning lesson after the fix" if a client does not consistently follow server instructions.

## Tool input

The MCP tool accepts:

```json
{
  "tool": "any-ai-tool-name",
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
  "tags": ["topic"]
}
```

If Git is available at `projectPath`, omitted changed files and source diff are collected from the current working tree.
