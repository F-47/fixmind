import { runDesktopServer } from "./desktop-server.js";

runDesktopServer().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
