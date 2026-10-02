// Runs the HyperFrames CLI with the local chrome-headless-shell, since
// `hyperframes browser ensure` downloads slowly here.
import { spawnSync } from "node:child_process";
import { resolveBrowserPath } from "./browser-path.mjs";

const result = spawnSync("npx", ["hyperframes", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, HYPERFRAMES_BROWSER_PATH: resolveBrowserPath() },
});
process.exit(result.status ?? 1);
