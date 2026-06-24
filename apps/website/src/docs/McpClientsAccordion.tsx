import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const MCP_CLIENTS = [
  { id: "claude-code", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
  { id: "visual-studio-code", label: "Visual Studio Code" },
  { id: "github-copilot-cli", label: "GitHub Copilot CLI" },
  { id: "opencode", label: "OpenCode" },
  { id: "other-mcp-clients", label: "Other MCP clients" },
] as const;

export function McpClientsAccordion() {
  const location = useLocation();
  const [selected, setSelected] = useState<(typeof MCP_CLIENTS)[number]["id"]>(MCP_CLIENTS[0].id);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (MCP_CLIENTS.some((client) => client.id === hash)) {
      setSelected(hash as (typeof MCP_CLIENTS)[number]["id"]);
    }
  }, [location.hash]);

  return (
    <div className="mt-1 space-y-1 pl-3">
      {MCP_CLIENTS.map((client) => {
        const isActive = selected === client.id;

        return (
          <Link
            key={client.id}
            to={`/docs/mcp-clients#${client.id}`}
            onClick={() => setSelected(client.id)}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive ? "bg-accent/5 font-medium text-ink" : "text-muted hover:bg-surface/50 hover:text-ink"
            }`}
          >
            {client.label}
          </Link>
        );
      })}
    </div>
  );
}
