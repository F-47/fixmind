# MCP Clients

Fixmind's installer can set up Claude Code, Codex, and Cursor for you. For every other MCP-capable client, use the same pattern:

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

VS Code supports MCP servers through its MCP configuration flow. Add Fixmind by using the **MCP: Add Server** command or by editing `.vscode/mcp.json` directly.

The server entry should look like this:

```json
{
  "servers": {
    "fixmind": {
      "command": "npx",
      "args": ["-y", "fixmind", "mcp"]
    }
  }
}
```

VS Code can store MCP servers in either workspace settings or your user profile.

## GitHub Copilot CLI

Copilot CLI has a built-in GitHub MCP server, and it also lets you add your own servers.

Use the `/mcp add` slash command, then add a server named `fixmind` that runs the shared launcher.

Copilot CLI stores the result in its MCP config under `~/.copilot` by default.

## OpenCode

OpenCode supports both local and remote MCP servers. Add Fixmind from the `opencode mcp add` flow, or put it in your `opencode.json` configuration.

Point the server at the shared launcher.

OpenCode keeps MCP servers under its `mcp` config option.

## Other MCP clients

If you use Pi or another MCP client that can launch a local stdio server, register a server named `fixmind` with the shared launcher.

If the client only accepts JSON config, the shape is usually the same: a server name, a command, and an argument list that starts `-y fixmind mcp`.
