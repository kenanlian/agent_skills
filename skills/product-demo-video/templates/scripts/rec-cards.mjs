// Renders the full-frame cards of a recorded video with HyperFrames, at the
// clips' frame size: the intro (brand + project.title), one chapter card before
// every clip (part n / total, clip.title, clip.summary), and the outro. Unchanged cards are skipped. Writes work/cards/<name>.mp4, a still
// <name>.png from the hold for review, and work/cards/cards.json for rec-assemble.
// Usage: node scripts/rec-cards.mjs <id> [--only <name>]
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { build } from "vite";
import { fail, hashFile, hashOf, loadProject, outputSize, root, run } from "./recorded-lib.mjs";

const { values: args, positionals } = parseArgs({ options: { only: { type: "string" } }, allowPositionals: true });
const { work, project } = loadProject(positionals[0]);
const size = outputSize(project);
const fps = project.fps ?? 60;
const fade = project.transition ?? 0.4;
if (Math.abs(size.width / size.height - 16 / 9) > 0.01) console.warn(`warning: cards are laid out for 16:9; the clips are ${size.width} x ${size.height}`);
const theme = project.theme ?? {};
const [h, s, l] = theme.accent ?? fail("project.json: set theme.accent to the app's accent as [h, s, l] (see references/recorded.md)");
const font = theme.font ? `"${theme.font}", sans-serif` : "sans-serif";

const stage = `${work}/cards/stage`;
await mkdir(`${stage}/assets`, { recursive: true });
await build({
  configFile: `${root}vite.config.ts`,
  logLevel: "warn",
  build: { outDir: `${stage}/assets`, emptyOutDir: false, lib: { entry: `${root}src/recorded/card.ts`, formats: ["iife"], name: "Card", fileName: () => "app.js" } },
});
if (!existsSync(`${root}theme/fonts.css`)) fail("theme/ is missing; run `npm run import:theme` first");
await cp(`${root}theme/fonts.css`, `${stage}/assets/fonts.css`);
if (!existsSync(`${stage}/assets/fonts`)) await cp(`${root}theme/fonts`, `${stage}/assets/fonts`, { recursive: true });
const template = await readFile(`${root}src/recorded/card.html`, "utf8");
const glyphs = JSON.parse(readFileSync(`${root}src/generated/wordmark.json`, "utf8")).glyphs.length;
const kicker = project.kicker ?? project.title ?? "";
const total = project.clips.length;

const cards = [];
if (project.intro !== false) {
  cards.push({ name: "intro", kind: "intro", title: project.title, sub: project.subtitle ?? "", duration: 3.6, fade });
}
project.clips.forEach((clip, i) => {
  if (project.chapters === false) return;
  if (!clip.title || !clip.summary) fail(`project.json: clip ${clip.id} needs "title" and "summary" for its chapter card`);
  // chapterSeconds is the card's share of the final timeline; each crossfade overlaps it.
  const seconds = Math.max(1.6, project.chapterSeconds ?? 3);
  cards.push({ name: `chapter-${clip.id}`, kind: "chapter", before: clip.id, kicker, index: i + 1, total, title: clip.title, summary: clip.summary, duration: round(seconds + fade), fade });
});
if (project.outro !== false) {
  const written = 0.8 + (glyphs - 1) * 0.13 + 0.95 + 0.5;
  cards.push({ name: "outro", kind: "outro", tagline: project.tagline ?? "", duration: round(written + 1.4), fade });
}

const bundle = hashFile(`${stage}/assets/app.js`);
const manifest = [];
for (const card of cards) {
  const out = `${work}/cards/${card.name}.mp4`;
  const keyFile = `${work}/cards/${card.name}.key`;
  const key = hashOf({ card, size, fps, theme, bundle, template });
  manifest.push({ name: card.name, kind: card.kind, before: card.before, file: out.slice(root.length), duration: card.duration });
  if (args.only && card.name !== args.only) continue;
  if (existsSync(out) && existsSync(keyFile) && readFileSync(keyFile, "utf8") === key) {
    console.log(`${card.name}: unchanged`);
    continue;
  }
  const html = template
    .replaceAll("{{WIDTH}}", String(size.width))
    .replaceAll("{{HEIGHT}}", String(size.height))
    .replaceAll("{{ZOOM}}", String(size.width / 1920))
    .replaceAll("{{FPS}}", String(fps))
    .replaceAll("{{DURATION}}", String(card.duration))
    .replaceAll("{{ACCENT_H}}", String(h))
    .replaceAll("{{ACCENT_S}}", String(s))
    .replaceAll("{{ACCENT_L}}", String(l))
    .replaceAll("{{FONT}}", font)
    .replaceAll("{{TITLE}}", card.title ?? card.name)
    .replaceAll("{{DATA}}", JSON.stringify(card).replace(/</g, "\\u003c"));
  await writeFile(`${stage}/index.html`, html);
  run("node", [`${root}scripts/hf.mjs`, "render", stage, "-o", out], { stdio: ["ignore", "ignore", "pipe"] });
  const hold = card.kind === "outro" ? card.duration - 0.3 : Math.min(card.duration - card.fade - 0.6, 2.2);
  run("ffmpeg", ["-v", "error", "-y", "-ss", String(hold), "-i", out, "-frames:v", "1", "-vf", "scale=1280:-2", `${work}/cards/${card.name}.png`]);
  await writeFile(keyFile, key);
  console.log(`${card.name}: rendered ${card.duration} s → ${out.slice(root.length)}`);
}
await writeFile(`${work}/cards/cards.json`, `${JSON.stringify(manifest, null, 2)}\n`);

function round(t) {
  return Math.round(t * 100) / 100;
}
