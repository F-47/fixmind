import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: directory,
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(directory, "dist"),
    emptyOutDir: true,
    cssMinify: false,
  },
  server: { proxy: { "/api": "http://127.0.0.1:4317" } },
});
