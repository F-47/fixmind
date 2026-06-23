# MCP Clients

Fixmind's installer knows how to wire up **Claude Code**, **Codex**, and **Cursor** automatically. For every other MCP-capable client, the core idea is the same: add a stdio server named `fixmind` that runs `npx -y fixmind mcp`.

If your client supports a registry, workspace config, or a command palette flow for MCP servers, use that to add Fixmind. The exact file or menu varies by client, but the server command stays the same.

## Claude Code

Claude Code supports MCP servers directly. The easiest path is still:

```bash
fixmind setup
```

That registers the server and writes the Fixmind instruction block for you.

If you want to add it manually, Claude Code supports stdio servers through its MCP command flow. Use the same server command Fixmind uses everywhere:

```bash
npx -y fixmind mcp
```

Claude Code keeps MCP settings in its own Claude configuration, and it supports separate user and project scopes.

## Codex

Codex stores MCP servers in `config.toml` and supports both CLI and IDE-extension setup.

The quickest path is:

```bash
fixmind setup
```

If you want to add the server by hand, use the Codex CLI:

```bash
codex mcp add fixmind -- npx -y fixmind mcp
```

For project-local setup, Codex can also use a trusted project-scoped `.codex/config.toml`.

## Cursor

Cursor is also handled automatically by `fixmind setup`.

If you prefer manual setup, add a server named `fixmind` to Cursor's `mcp.json` file. Workspace configs live in `.cursor/mcp.json`, and user configs live in Cursor's user profile. Fixmind uses the same stdio command there too:

```bash
npx -y fixmind mcp
```

Cursor also supports project-local rules files, which is how Fixmind adds the learning instructions during setup.

## Visual Studio Code

VS Code supports MCP servers through its MCP configuration flow. You can add Fixmind by using the **MCP: Add Server** command or by editing `.vscode/mcp.json` directly.

The server entry should point to the same stdio launcher:

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

Use the `/mcp add` slash command, then add a server named `fixmind` that runs:

```bash
npx -y fixmind mcp
```

Copilot CLI stores the result in its MCP config under `~/.copilot` by default.

## OpenCode

OpenCode supports both local and remote MCP servers. Add Fixmind from the `opencode mcp add` flow, or put it in your `opencode.json` configuration.

The stdio command is the same:

```bash
npx -y fixmind mcp
```

OpenCode keeps MCP servers under its `mcp` config option.

## Other MCP clients

If you use Pi or any other MCP client that can launch a local stdio server, register a server named `fixmind` with this command:

```bash
npx -y fixmind mcp
```

On Windows, if your client needs an explicit shell wrapper, use:

```bash
cmd /c npx -y fixmind mcp
```

If the client only accepts a JSON config, the shape is usually the same: a server name, a command, and an argument list that starts `-y fixmind mcp`.
