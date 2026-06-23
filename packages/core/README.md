# Fixmind

> **Bug fixed. You learned nothing.** <br />
> Your agent patches the code, you accept the diff, and the lesson evaporates. Fixmind catches it on the way out — a local MCP server that turns every AI-assisted fix into a lesson you actually remember.

Fixmind is a local-first CLI and MCP server that records short learning lessons after meaningful coding fixes. It stores everything securely on your machine, integrating natively with your AI agents via the Model Context Protocol (MCP).

## Features

- **Local by Default:** Lessons live in `~/.fixmind/learning.db`. No account needed, no external APIs.
- **Speaks MCP:** Works seamlessly with Claude Code, Cursor, and Codex.
- **Spaced Recall:** New lessons resurface on a schedule (1, 3, 7 days) with a real question to test your understanding before showing the answer.
- **Real Diffs:** Captures the actual bad and good code from your git diff, not just a vague summary.

---

## Quickstart

**Requirements:** Node.js 22.13+

Fixmind uses Node's built-in `node:sqlite` module. If setup fails with
`ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`, upgrade Node
to 22.13 or newer.

```sh
npx fixmind setup
```

`npx fixmind setup` initializes local storage and automatically configures detected installations of Cursor, Claude Code, and Codex. _Restart your AI clients after running setup._

## How It Works

1. **Fix bugs like normal:** Hand a bug to your agent. It patches it.
2. **Agent saves the lesson:** If the fix involved actual learning (not just formatting/renaming), the agent automatically calls the MCP tool to log the problem, root cause, and the bad/good code.
3. **Stored locally:** The lesson lands safely in your local SQLite database.
4. **Browse & Review:** Fixmind quizzes you on the lesson in 1, 3, and 7 days so you actually retain the knowledge.

## The Quality Gate

The MCP server doesn't just blindly accept data; it acts as a strict teacher for your AI agent. Before any lesson is stored, Fixmind runs it through a local validation gate:

- **No Garbage:** If the agent tries to save a formatting change, a pure refactor, or a UI tweak without a behavioral break, the server **rejects the save outright** and forces the agent to skip it.
- **Enforcing the "Why":** If the agent repeats the symptom as the root cause, the server throws an error and demands a deeper explanation.
- **Transfer, Not Recall:** The server instructs the agent to write _transfer questions_ (e.g., "How would this apply to a different framework?") instead of basic recall questions (e.g., "What line did you change?").
- **Superseding Mistakes:** If an agent saves a lesson for a fix that turns out to be wrong, it can link the corrected lesson to the old one to supersede it, keeping your library clean.

## CLI Usage

Manage your learning library straight from the terminal.

```sh
# Setup & MCP
fixmind setup                 # Configure detected AI clients
fixmind setup --scope project # Scope MCP to the current directory
fixmind mcp                   # Start the MCP server manually (agents do this automatically)

# Browse Lessons
fixmind list                  # View recent lessons
fixmind list --limit 5        # Show the last 5 lessons
fixmind search "hydration"    # Find lessons by keyword or concept
fixmind stats                 # View recurring mistake patterns

# Review & Learn
fixmind review                # Answer recall questions for due lessons
```

## Local Dashboard

Prefer a GUI? Fixmind comes with a beautiful, local-only web dashboard to view your progress, review lessons, and browse your knowledge base.

```sh
fixmind dashboard
```

_Runs locally on `127.0.0.1`. Use `--port 8080` to specify a port or `--no-open` to prevent auto-opening the browser._

## Sync (Pro)

Fixmind is fiercely local-first. But if you want your lessons available across multiple machines, you can opt-in to end-to-end encrypted sync. The server only ever sees ciphertext.

```sh
fixmind login
fixmind sync push
fixmind sync pull
```

---

**License:** MIT  
**Privacy:** No telemetry. Your data stays on your machine.
