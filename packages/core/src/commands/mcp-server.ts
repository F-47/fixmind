import type { CommandDefinition } from "./registry.js";

export const mcpCommand: CommandDefinition = {
  names: ["mcp"],
  usage: ["  fixmind mcp"],
  kind: "standalone",
  run: async () => {
    const { startMcpServer } = await import("../mcp.js");
    await startMcpServer();
  },
};
