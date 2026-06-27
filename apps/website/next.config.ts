import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: path.resolve(directory, "../.."),
  images: {
    unoptimized: true,
  },
  webpack(config) {
    config.module.rules.push({
      resourceQuery: /raw/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
