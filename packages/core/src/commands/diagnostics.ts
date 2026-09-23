import { buildDiagnosticsReport } from "../diagnostics.js";
import type { CommandDefinition } from "./registry.js";

export const diagnosticsCommand: CommandDefinition = {
  names: ["diagnose", "diagnostics"],
  usage: ["  fixmind diagnose", "  fixmind diagnostics"],
  kind: "store",
  run: () => {
    console.log(buildDiagnosticsReport().join("\n"));
  },
};
