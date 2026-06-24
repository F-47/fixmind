import fs from "node:fs";
import path from "node:path";
import { configPath } from "./paths.js";

export type CaptureMode = "strict" | "balanced";

export interface FixmindConfig {
  version: number;
  reviewIntervalsDays: {
    understood: number;
    partial: number;
    copied_blindly: number;
  };
  captureMode: CaptureMode;
}

export const DEFAULT_CONFIG: FixmindConfig = {
  version: 1,
  reviewIntervalsDays: {
    understood: 7,
    partial: 3,
    copied_blindly: 1,
  },
  captureMode: "strict",
};

export function readConfig(filePath = configPath()): FixmindConfig {
  if (!fs.existsSync(filePath)) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<FixmindConfig>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : DEFAULT_CONFIG.version,
      reviewIntervalsDays: {
        understood: parsed.reviewIntervalsDays?.understood ?? DEFAULT_CONFIG.reviewIntervalsDays.understood,
        partial: parsed.reviewIntervalsDays?.partial ?? DEFAULT_CONFIG.reviewIntervalsDays.partial,
        copied_blindly: parsed.reviewIntervalsDays?.copied_blindly ?? DEFAULT_CONFIG.reviewIntervalsDays.copied_blindly,
      },
      captureMode: parsed.captureMode === "balanced" ? "balanced" : "strict",
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: FixmindConfig, filePath = configPath()): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
