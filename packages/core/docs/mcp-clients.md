# MCP Clients

Fixmind's installer can set up Claude Code, Codex, Cursor, OpenCode, VS Code, Copilot CLI, and Pi for you. For any other MCP-capable client, use the same pattern:

1. Add a server named `fixmind`.
2. Point it at the same stdio launcher.
3. Let the client store that config wherever it normally keeps MCP servers.

## Shared launcher

Use this command anywhere you need to add Fixmind manually:

```bash
npx -y fixmind mcp
```

If your client needs an explicit shell wrapper on Windows, use:

```bash
cmd /c npx -y fixmind mcp
```

## Claude Code

The easiest path is still:

```bash
npx fixmind setup
```

That registers the server and writes the Fixmind instruction block for you.

If you want to add it manually, use the shared launcher above through Claude Code's MCP command flow. Claude Code stores MCP settings in its own configuration and supports separate user and project scopes.

## Codex

The easiest path is still:

```bash
npx fixmind setup
```

If you want to add the server by hand, use the Codex CLI:

```bash
codex mcp add fixmind -- npx -y fixmind mcp
```

Codex stores MCP servers in `config.toml` and supports both CLI and IDE-extension setup. For project-local setup, it can also use a trusted project-scoped `.codex/config.toml`.

## Cursor

The easiest path is still:

```bash
npx fixmind setup
```

If you prefer manual setup, add a server named `fixmind` to Cursor's `mcp.json` file and point it at the shared launcher. Workspace configs live in `.cursor/mcp.json`, and user configs live in Cursor's user profile.

Cursor also supports project-local rules files, which is how Fixmind adds the learning instructions during setup.

## Visual Studio Code

The easiest path is still:

```bash
npx fixmind setup
```

That writes a `fixmind` entry into `.vscode/mcp.json` (project scope) or your user profile's `mcp.json` (user scope). Server entries live in a top-level `servers` object and look like this:

```json
{
  "servers": {
    "fixmind": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "fixmind", "mcp"]
    }
  }
}
```

VS Code reads Fixmind instructions from `.github/copilot-instructions.md`, which setup writes at project scope.

## GitHub Copilot CLI

The easiest path is still:

```bash
npx fixmind setup
```

User scope writes to `~/.copilot/mcp-config.json`, and project scope writes a portable `.mcp.json` at the project root. Both keep servers in a top-level `mcpServers` object; you can also add the server by hand with the `/mcp add` slash command.

Copilot also reads Fixmind instructions from `.github/copilot-instructions.md`, which setup writes at project scope.

## OpenCode

The easiest path is still:

```bash
npx fixmind setup
```

Setup writes a `fixmind` entry into `opencode.json` — globally at `~/.config/opencode/opencode.json`, or in the project root for project scope:

```json
{
  "mcp": {
    "fixmind": {
      "type": "local",
      "command": ["npx", "-y", "fixmind", "mcp"],
      "enabled": true
    }
  }
}
```

OpenCode keeps MCP servers under its `mcp` config option, and reads instructions from `AGENTS.md` (global: `~/.config/opencode/AGENTS.md`; project: `AGENTS.md`).

## Pi

The easiest path is still:

```bash
npx fixmind setup
```

Pi reads user-level servers from `~/.pi/agent/mcp.json` and project servers from `.pi/mcp.json`:

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

Pi reads instructions from `AGENTS.md`, which setup writes at project scope.

## Other MCP clients

If you use any other MCP client that can launch a local stdio server, register a server named `fixmind` with the shared launcher.

If the client only accepts JSON config, the shape is usually the same: a server name, a command, and an argument list that starts `-y fixmind mcp`.
