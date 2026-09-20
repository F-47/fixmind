import { isAddressInUseError, optionalPort } from "../cli-utils.js";
import type { CommandDefinition } from "./registry.js";

export const dashboardCommand: CommandDefinition = {
  names: ["dashboard"],
  usage: ["  fixmind dashboard [--port 4317] [--no-open]"],
  kind: "standalone",
  run: async ({ options }) => {
    const { startDashboard } = await import("../dashboard.js");
    try {
      const handle = await startDashboard({
        port: optionalPort(options.port),
        open: !options["no-open"],
      });
      console.log(`Fixmind dashboard: ${handle.url}`);
      console.log("Press Ctrl+C to stop.");
    } catch (error) {
      if (isAddressInUseError(error)) {
        throw new Error(
          `Dashboard port is already in use. Run \`npx fixmind dashboard --port <different-port>\` or stop the process using 127.0.0.1:${optionalPort(options.port) ?? 4317}.`,
        );
      }
      throw error;
    }
  },
};
