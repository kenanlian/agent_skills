// Bundles each src/episodes/<id>/main.ts into episodes/<id>/assets/app.js and
// copies the imported theme next to it. Usage: node scripts/build-episodes.mjs [id...]
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { build } from "vite";

const root = new URL("../", import.meta.url).pathname;
const requested = process.argv.slice(2);
const all = await readdir(`${root}src/episodes`);
const episodes = requested.length > 0 ? requested : all;

if (!existsSync(`${root}theme/obsidian.css`)) {
  throw new Error("theme/ is missing; run `npm run import:theme` first.");
}

for (const id of episodes) {
  const outDir = `${root}episodes/${id}/assets`;
  await mkdir(outDir, { recursive: true });
  await build({
    configFile: `${root}vite.config.ts`,
    logLevel: "warn",
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: `${root}src/episodes/${id}/main.ts`,
        formats: ["iife"],
        name: "Episode",
        fileName: () => "app.js",
      },
    },
  });
  await cp(`${root}theme/obsidian.css`, `${outDir}/obsidian.css`);
  await cp(`${root}theme/fonts.css`, `${outDir}/fonts.css`);
  await cp(`${root}theme/fonts`, `${outDir}/fonts`, { recursive: true });
  console.log(`Built episodes/${id}`);
}
