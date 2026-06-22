# Fixmind

A local-first CLI and MCP server that records short learning lessons after AI-assisted coding fixes. It stores everything on the developer's machine and calls no external or paid AI API.

## Requirements

- Node.js 22.5 or newer
- An MCP-compatible AI coding tool, optional for manual use
- Git, optional for automatic diff capture

## Install

```bash
npm install -g fixmind
fixmind setup
```

For local development against this repo instead of the published package:

```bash
npm install
npm run build
npm link
fixmind setup
```

`fixmind setup` initializes storage and configures detected Codex, Claude Code, and Cursor installations. Restart configured clients afterward.

Data remains local:

- Database: `~/.fixmind/learning.db`
- Config: `~/.fixmind/config.json`

Set `FIXMIND_DATA_DIR` to override the data directory.

## How it works

```text
AI coding client
      |
      | MCP: save_lesson
      v
Local Fixmind server
      |
      v
~/.fixmind/learning.db
      |
      v
Human runs fixmind review
```

The MCP server instructs agents to save lessons after meaningful fixes while skipping formatting, renames, and mechanical edits. Invocation remains best-effort because the AI client controls tool selection.

## MCP setup

```powershell
fixmind setup
fixmind setup --client codex,claude,cursor
fixmind setup --client cursor --dry-run
```

For Claude Code, setup also adds `mcp__fixmind__save_lesson` to `permissions.allow` in `~/.claude/settings.json` (with a `.backup` copy of any prior file), so the agent can save lessons without a permission prompt.

The MCP process can also be started directly:

```powershell
fixmind mcp
```

Humans normally do not run that command themselves; the configured AI client launches it over stdio. See [docs/mcp-integration.md](docs/mcp-integration.md) for configuration details and the tool schema.

## Human commands

```powershell
fixmind save-manual
fixmind list
fixmind list --limit 5
fixmind search "hydration"
fixmind stats
fixmind review
```

## Local dashboard

Open the visual dashboard with:

```powershell
fixmind dashboard
```

It runs only on `127.0.0.1`, opens the browser automatically, and provides a learning library with filters, due reviews, progress signals, recurring concepts, detailed root-cause lessons, wrong-versus-correct code examples, practice tasks, previous answers, and interactive recall reviews.

The dashboard is built with React, Vite, and Tailwind CSS, but published packages contain prebuilt static assets. End users still run only `fixmind dashboard` and do not need to install or run the frontend toolchain.

```powershell
fixmind dashboard --port 8080
fixmind dashboard --no-open
```

`fixmind save-manual` is available as a shorthand for interactive manual lessons, and `fixmind save-ai-summary` as a shorthand for piping in AI-generated summaries (scripts and integrations).

## Sync (Pro, optional)

Fixmind is local-first by default — no account needed. If you want your lessons available on more than one machine, `fixmind login` signs in (GitHub or email/password) and encrypts lessons on your machine before syncing them through a Supabase project, so the server only ever sees ciphertext:

```powershell
fixmind login
fixmind sync push
fixmind sync pull
fixmind sync status
fixmind logout
```

Saving a lesson auto-pushes, and opening `fixmind dashboard` auto-pulls, once you're logged in. See the [full CLI reference](../../docs/cli-reference.md#sync-pro) and [sync-setup.md](docs/sync-setup.md) for details.

## Next.js hydration example

After fixing a hydration mismatch, the AI calls `save_lesson` with content similar to (the `tool` field is optional and auto-detected from the connected MCP client, so it's normally omitted):

```json
{
  "projectPath": "C:/projects/example",
  "title": "Keep initial server and client renders deterministic",
  "originalPrompt": "Fix the hydration mismatch on the theme toggle",
  "problem": "The server rendered a light label while the browser initially rendered a dark label.",
  "mistake": "The component read localStorage during its initial render.",
  "rootCause": "Server rendering cannot access localStorage, so the initial server and browser markup differed.",
  "fixSummary": "Render a stable initial value and read the saved theme in useEffect after hydration.",
  "takeaway": "Keep the server render and browser's first render identical.",
  "mistakePattern": "Hydration timing",
  "concepts": ["Next.js hydration", "SSR/browser APIs"],
  "filesChanged": ["app/components/ThemeToggle.tsx"],
  "codeExample": "const [theme, setTheme] = useState('light');\nuseEffect(() => setTheme(localStorage.getItem('theme') ?? 'light'), []);",
  "badCodeExample": "const theme = localStorage.getItem('theme');",
  "goodCodeExample": "const [theme, setTheme] = useState('light');\nuseEffect(() => setTheme(localStorage.getItem('theme') ?? 'light'), []);",
  "codeExplanation": "The corrected version waits until hydration before reading browser-only storage.",
  "practiceTask": "Build a theme label whose initial markup is identical on the server and browser.",
  "reviewQuestions": [
    {
      "question": "What must be true about the server render and browser's first render?",
      "expectedAnswer": "They must produce matching markup before client-only state is loaded."
    }
  ],
  "understanding": "unknown",
  "tags": [
    { "name": "React: Hydration Mismatch", "url": "https://react.dev/link/hydration-mismatch" }
  ]
}
```

New lessons are due the next day. Review them with:

```text
> fixmind review
What must be true about the server render and browser's first render?
Your answer: They need matching initial markup.
Expected: They must produce matching markup before client-only state is loaded.
Understanding (understood, partial, copied_blindly): understood
Review saved.
```

## More documentation

- [Full CLI reference](../../docs/cli-reference.md) — every command and flag, including `edit`, `delete`, `supersede`, and `export`, which aren't covered above.
- [What a lesson contains](../../docs/lesson-schema.md) — required vs. optional fields, the quality gate that rejects shallow lessons, and the exact spaced-repetition schedule.
- [FAQ / troubleshooting](../../docs/faq.md) — agents not saving lessons, backups, resets, per-client scope quirks.
- [MCP integration](docs/mcp-integration.md) — the tool schema in full, token/context overhead, configuring clients fixmind doesn't autodetect.

## Scope

Local-first by default — no account required to use any of the above. Accounts and encrypted sync (above) are opt-in for Pro/Team. There's no team-shared library, public sharing, browser extension, or bundled AI client yet. The dashboard is local-only, and MCP is write-only for agents; lesson history and reviews remain controlled by the human.
