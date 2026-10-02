import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** HYPERFRAMES_BROWSER_PATH, else the newest Playwright chrome-headless-shell. */
export function resolveBrowserPath() {
  const fromEnv = process.env.HYPERFRAMES_BROWSER_PATH;
  if (fromEnv) return fromEnv;
  const cache = join(homedir(), ".cache/ms-playwright");
  const dirs = existsSync(cache)
    ? readdirSync(cache).filter((name) => name.startsWith("chromium_headless_shell-")).sort().reverse()
    : [];
  for (const dir of dirs) {
    const binary = join(cache, dir, "chrome-headless-shell-linux64/chrome-headless-shell");
    if (existsSync(binary)) return binary;
  }
  throw new Error("No chrome-headless-shell found; set HYPERFRAMES_BROWSER_PATH.");
}
