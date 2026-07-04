# Fixmind

> **Bug fixed. You learned nothing.** <br />
> Your agent patches the code, you accept the diff, and the lesson disappears. Fixmind catches it on the way out - a local MCP server that turns every AI-assisted fix into a lesson you can review later.

Fixmind is a local-first CLI and MCP server. It records short learning lessons after meaningful coding fixes, then reuses reviewed lessons as memory when a new task looks familiar. Everything stays on your machine and connects to your AI agents through the Model Context Protocol (MCP).

## What's new in 1.0.26

- The dashboard now has a dedicated review inbox for due lessons, so the next action is visible without digging through the full lesson list.
- Memory retrieval now returns ranked lessons with matched fields, matched terms, and a short explanation for why each result matched.
- Lesson quality feedback now includes field-level hints and autofill suggestions when a lesson is weak.
- Reusable lesson templates now cover architecture boundary, stale state, async timing, off-by-one, and null guard bugs.
- Practice mode now prefers believable MCQ distractors from similar lessons and falls back to free response when it cannot build a strong question.
- Proactive memory warnings now compare mistake pattern, changed files, concepts, tags, tool, and overlapping terms while excluding the current and inactive lessons.

## Features

- **Local by Default:** Lessons live in `~/.fixmind/learning.db`. No account needed, no external API calls.
- **Speaks MCP:** Works with Claude Code, Cursor, and Codex.
- **Spaced Recall:** New lessons come back on a schedule with a real question before the answer.
- **Real Diffs:** Captures the actual bad and good code from your git diff, not just a vague summary.
- **Memory Retrieval:** Reviewed lessons can be pulled back into context later, so the agent can reuse the rule instead of relearning the same mistake.

---

## Quickstart

**Requirements:** Node.js 22.13+

Fixmind uses Node's built-in `node:sqlite` module. If setup fails with
`ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: node:sqlite`, upgrade Node
to 22.13 or newer.

```sh
npx fixmind setup
```

`npx fixmind setup` initializes local storage and automatically configures detected installations of Cursor, Claude Code, and Codex. Restart your AI clients after setup finishes.

## How It Works

1. **Fix bugs like normal:** Hand a bug to your agent. It patches it.
2. **Agent saves the lesson:** If the fix involved actual learning, the agent calls the MCP tool to log the problem, root cause, and the bad/good code.
3. **Stored locally:** The lesson lands safely in your local SQLite database.
4. **Browse & review:** Fixmind quizzes you on the lesson over time so you actually retain the knowledge.

## The Quality Gate

The MCP server doesn't just blindly accept data; it acts as a strict teacher for your AI agent. Before any lesson is stored, Fixmind runs it through a local validation gate:

- **No junk:** If the agent tries to save a formatting change, a pure refactor, or a UI tweak without a behavior break, the server rejects it.
- **Explain the why:** If the agent repeats the symptom as the root cause, the server asks for a deeper explanation. For package or runtime failures, it also requires the boundary behind the error: where code runs, what belongs in the client bundle, and the supported interface between systems.
- **Transfer, not recall:** The server asks the agent to write transfer questions instead of simple recall questions.
- **Superseding mistakes:** If a saved lesson turns out to be wrong, the corrected lesson can supersede the old one instead of replacing history.

## CLI Usage

Manage your learning library from the terminal.

```sh
# Setup & MCP
npx fixmind setup             # Configure detected AI clients
npx fixmind setup --scope project # Scope MCP to the current directory
fixmind mcp                   # Start the MCP server manually (agents do this automatically)
fixmind memory hydration       # Show reviewed lessons relevant to a topic

# Browse Lessons
fixmind list                  # View recent lessons
fixmind list --limit 5        # Show the last 5 lessons
fixmind search "hydration"    # Find lessons by keyword or concept
fixmind stats                 # View recurring mistake patterns
fixmind insights              # View recent learning signals from the last 30 days
fixmind diagnose              # Explain why a lesson probably didn't save

# Review & Learn
fixmind review                # Answer recall questions for due lessons
```

`fixmind save-manual` starts with a template picker for common bug shapes: architecture boundary mistakes, stale state, async timing, off-by-one, and null-guard cases. When Git is available, Fixmind also seeds the lesson from the current diff when it can infer the changed files, mistake pattern, concepts, and a compact code example. Pick blank when you want to write a lesson from scratch.

## Local Dashboard

Prefer a GUI? Fixmind comes with a beautiful, local-only web dashboard to view your progress, review lessons, and browse your knowledge base. Lesson prose and review questions support Markdown, including inline code and fenced code blocks.

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
