import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: directory,
  envDir: path.resolve(directory, "..", ".."),
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@docs": path.resolve(directory, "..", "..", "docs"),
      "@root": path.resolve(directory, "..", ".."),
    },
  },
  build: {
    outDir: path.resolve(directory, "dist"),
    emptyOutDir: true,
    cssMinify: false,
  },
});
