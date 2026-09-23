import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: directory,
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(directory, "src"),
    },
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(directory, "dist"),
    emptyOutDir: true,
    cssMinify: false,
  },
  server: { proxy: { "/api": "http://127.0.0.1:4317" } },
});
