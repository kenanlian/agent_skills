// Bundles each src/episodes/<id>/main.ts into episodes/<id>/assets/app.js and
// copies the imported theme next to it. When the episode has a clock.ts, its
// AUDIO_PLAN becomes the composition's <audio> tracks and root data-duration,
// and the voice takes and BGM bed are copied into assets/.
// Usage: node scripts/build-episodes.mjs [id...]
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
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
  const plan = existsSync(`${root}src/episodes/${id}/clock.ts`) ? await loadAudioPlan(id) : null;
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
  if (plan) await writeAudio(id, outDir, plan);
  console.log(`Built episodes/${id}${plan ? ` (${plan.end.toFixed(2)} s, ${plan.voices.length} voice lines${plan.bgm ? ", BGM" : ""})` : ""}`);
}

/** clock.ts is DOM-free, so it can be bundled with the same aliases and evaluated here. */
async function loadAudioPlan(id) {
  const dir = await mkdtemp(join(tmpdir(), `clock-${id}-`));
  try {
    await build({
      configFile: `${root}vite.config.ts`,
      logLevel: "warn",
      build: {
        outDir: dir,
        emptyOutDir: true,
        lib: { entry: `${root}src/episodes/${id}/clock.ts`, formats: ["es"], fileName: () => "clock.mjs" },
      },
    });
    const { AUDIO_PLAN } = await import(pathToFileURL(join(dir, "clock.mjs")).href);
    if (!AUDIO_PLAN) throw new Error(`src/episodes/${id}/clock.ts does not export AUDIO_PLAN`);
    return AUDIO_PLAN;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeAudio(id, outDir, plan) {
  await rm(`${outDir}/voice`, { recursive: true, force: true });
  await rm(`${outDir}/bgm`, { recursive: true, force: true });
  await mkdir(`${outDir}/voice`, { recursive: true });
  const n = (value) => String(Math.round(value * 1000) / 1000);
  const tags = [];
  for (const cue of plan.voices) {
    if (!existsSync(`${root}${cue.file}`)) throw new Error(`Missing voice take ${cue.file}; run \`npm run tts -- ${id}\``);
    await cp(`${root}${cue.file}`, `${outDir}/voice/${cue.id}.mp3`);
    tags.push(`<audio id="vo-${cue.id}" src="assets/voice/${cue.id}.mp3" data-start="${n(cue.start)}" data-duration="${n(cue.duration)}" data-volume="1"></audio>`);
  }
  if (plan.bgm) {
    const { file, offset, volume, fadeIn, fadeOut, automation } = plan.bgm;
    if (!existsSync(`${root}${file}`)) throw new Error(`Missing BGM bed ${file}; normalize the chosen track with \`node scripts/loudnorm.mjs <track> ${file} --lufs=-21\``);
    const length = probeDuration(`${root}${file}`);
    if (length < offset + plan.end) throw new Error(`${file} is ${length.toFixed(2)} s; it must cover offset ${offset} + ${plan.end.toFixed(2)} s`);
    await mkdir(`${outDir}/bgm`, { recursive: true });
    await cp(`${root}${file}`, `${outDir}/bgm/${basename(file)}`);
    tags.push(
      `<audio id="bgm" src="assets/bgm/${basename(file)}" data-start="0" data-duration="${n(plan.end)}" data-media-start="${n(offset)}" ` +
        `data-volume="${n(volume)}" data-fade-in="${n(fadeIn)}" data-fade-out="${n(fadeOut)}" data-automation='${JSON.stringify(automation)}'></audio>`,
    );
  }

  const htmlPath = `${root}episodes/${id}/index.html`;
  let html = await readFile(htmlPath, "utf8");
  const block = /(<!-- audio:begin[^>]*-->)[\s\S]*?(\n\s*)(<!-- audio:end -->)/;
  if (!block.test(html)) throw new Error(`${htmlPath} has no <!-- audio:begin --> … <!-- audio:end --> block`);
  html = html.replace(block, (_, begin, indent, end) => `${begin}${tags.map((tag) => `${indent}${tag}`).join("")}${indent}${end}`);
  const rootTag = /(<div id="root"[^>]*\bdata-duration=")[^"]*(")/;
  if (!rootTag.test(html)) throw new Error(`${htmlPath}: no data-duration on #root`);
  html = html.replace(rootTag, (_, before, after) => `${before}${n(plan.end)}${after}`);
  await writeFile(htmlPath, html);
}

function probeDuration(path) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`ffprobe failed on ${path}`);
  return Number(probe.stdout.trim());
}
