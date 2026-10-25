// Assembles a recorded video in one ffmpeg pass: intro → clip 1 → chapter card →
// clip 2 → … → outro, joined by short crossfades. Each clip loses its applied
// cuts (captions.json), takes its clean voice (rec-audio), and gets its cues
// burned in as one-line captions retimed onto the final timeline. An optional
// music bed (project.bgm) is ducked under the voice. Then the mix is mastered to
// -16 LUFS with loudnorm.mjs, and the captions are also written as an .srt.
// Usage: node scripts/rec-assemble.mjs <id> [--draft]
//   --draft: 1280 px wide, fast encode, no mastering → renders/<id>.draft.mp4
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { fail, fmt, loadProject, outputSize, probe, root, run } from "./recorded-lib.mjs";
import { keepRanges, retime } from "./recorded-text.mjs";

const { values: args, positionals } = parseArgs({ options: { draft: { type: "boolean" } }, allowPositionals: true });
const { id, dir, work, project } = loadProject(positionals[0]);
if (!existsSync(`${dir}/captions.json`)) fail(`missing ${dir}/captions.json; run rec-captions.mjs and proofread it first`);
const captions = JSON.parse(readFileSync(`${dir}/captions.json`, "utf8")).clips ?? {};
const cardsPath = `${work}/cards/cards.json`;
const cards = existsSync(cardsPath) ? JSON.parse(readFileSync(cardsPath, "utf8")) : [];
if (!cards.length && (project.intro !== false || project.outro !== false || project.clips.length > 1)) fail(`missing ${cardsPath}; run \`node scripts/rec-cards.mjs ${id}\` first`);

const full = outputSize(project);
const size = args.draft ? { width: 1280, height: Math.round((1280 * full.height) / full.width / 2) * 2 } : full;
const fps = project.fps ?? 60;
const fade = project.transition ?? 0.4;
const style = { font: "HarmonyOS Sans SC", fontsDir: "fonts", size: 0.042, marginV: 0.06, ...(project.captions ?? {}) };
checkFont(style);

// The sequence and each segment's place on the final timeline (crossfades overlap by `fade`).
const segments = [];
const card = (name) => cards.find((c) => c.name === name);
if (card("intro")) segments.push({ ...card("intro"), type: "card" });
for (const clip of project.clips) {
  const chapter = cards.find((c) => c.before === clip.id);
  if (chapter) segments.push({ ...chapter, type: "card" });
  const clean = `${work}/${clip.id}.clean.wav`;
  if (!existsSync(clean)) fail(`missing ${clean}; run \`node scripts/rec-audio.mjs ${id}\` first`);
  const source = probe(`${root}${clip.file}`).duration;
  const keep = keepRanges(source, (captions[clip.id]?.cuts ?? []).filter((cut) => cut.apply));
  if (!keep.length) fail(`clip ${clip.id} has no footage left after its applied cuts`);
  const duration = keep.reduce((sum, [a, b]) => sum + b - a, 0);
  segments.push({ type: "clip", clip, clean, keep, duration, cues: retime(captions[clip.id]?.cues ?? [], keep, duration) });
}
if (card("outro")) segments.push({ ...card("outro"), type: "card" });
for (const s of segments) if (s.type === "card") s.duration = probe(`${root}${s.file}`).duration;
let cursor = 0;
segments.forEach((s, k) => {
  s.at = k === 0 ? 0 : cursor - fade;
  cursor = s.at + s.duration;
});
const total = cursor;

const cues = segments.flatMap((s) => (s.type === "clip" ? s.cues.map((c) => ({ ...c, start: c.start + s.at, end: c.end + s.at })) : []));
mkdirSync(`${root}renders`, { recursive: true });
writeFileSync(`${work}/captions.ass`, ass(cues, full));
writeFileSync(`${root}renders/${id}.srt`, srt(cues));

// Filter graph.
const inputs = [];
const graph = [];
let inputCount = 0;
/** Adds an ffmpeg input and returns its index. */
function input(...argv) {
  inputs.push(...argv);
  return inputCount++;
}
const norm = `scale=${size.width}:${size.height}:flags=lanczos,setsar=1,fps=${fps},format=yuv420p,settb=AVTB`;
const stereo = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo";
segments.forEach((s, k) => {
  if (s.type === "card") {
    const v = input("-i", `${root}${s.file}`);
    graph.push(`[${v}:v]trim=duration=${s.duration},setpts=PTS-STARTPTS,${norm}[v${k}]`);
    graph.push(`anullsrc=channel_layout=stereo:sample_rate=48000,atrim=duration=${s.duration},${stereo}[a${k}]`);
    return;
  }
  const v = input("-i", `${root}${s.clip.file}`);
  const a = input("-i", s.clean);
  const n = s.keep.length;
  const vparts = s.keep.map((_, i) => `[v${k}p${i}]`);
  const aparts = s.keep.map((_, i) => `[a${k}p${i}]`);
  graph.push(`[${v}:v]setpts=PTS-STARTPTS${n > 1 ? `,split=${n}${s.keep.map((_, i) => `[v${k}s${i}]`).join("")}` : `[v${k}s0]`}`);
  graph.push(`[${a}:a]${stereo}${n > 1 ? `,asplit=${n}${s.keep.map((_, i) => `[a${k}s${i}]`).join("")}` : `[a${k}s0]`}`);
  s.keep.forEach(([from, to], i) => {
    const len = to - from;
    graph.push(`[v${k}s${i}]trim=start=${from}:end=${to},setpts=PTS-STARTPTS${vparts[i]}`);
    graph.push(`[a${k}s${i}]atrim=start=${from}:end=${to},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, len - 0.01)}:d=0.01${aparts[i]}`);
  });
  graph.push(`${vparts.join("")}concat=n=${n}:v=1:a=0,${norm}[v${k}]`);
  graph.push(`${aparts.join("")}concat=n=${n}:v=0:a=1[a${k}]`);
});
let vLast = "[v0]";
let aLast = "[a0]";
for (let k = 1; k < segments.length; k++) {
  graph.push(`${vLast}[v${k}]xfade=transition=fade:duration=${fade}:offset=${segments[k].at.toFixed(3)}[vx${k}]`);
  graph.push(`${aLast}[a${k}]acrossfade=d=${fade}:c1=tri:c2=tri[ax${k}]`);
  vLast = `[vx${k}]`;
  aLast = `[ax${k}]`;
}
const fontsDir = relative(work, `${root}${style.fontsDir}`) || ".";
graph.push(`${vLast}subtitles=captions.ass:fontsdir=${fontsDir}[vout]`);
if (project.bgm) {
  const bed = `${root}${project.bgm.file}`;
  if (!existsSync(bed)) fail(`missing music bed ${project.bgm.file}; normalize it with loudnorm.mjs --lufs=-21 (references/voice.md)`);
  const offset = project.bgm.offset ?? 0;
  if (probe(bed).duration < offset + total) fail(`${project.bgm.file} is shorter than offset ${offset} + ${total.toFixed(2)} s`);
  const b = input("-ss", String(offset), "-i", bed);
  graph.push(`[${b}:a]atrim=duration=${total},asetpts=PTS-STARTPTS,${stereo},volume=${project.bgm.volume ?? 0.35},afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, total - 2)}:d=2[bed]`);
  graph.push(`${aLast}asplit=2[vo][sc]`);
  graph.push(`[bed][sc]sidechaincompress=threshold=0.02:ratio=8:attack=30:release=500[ducked]`);
  graph.push(`[vo][ducked]amix=inputs=2:normalize=0:duration=first[aout]`);
} else {
  graph.push(`${aLast}anull[aout]`);
}

const out = `${root}renders/${id}${args.draft ? ".draft" : ""}.mp4`;
const encode = args.draft ? ["-preset", "ultrafast", "-crf", "26"] : ["-preset", "medium", "-crf", "18"];
console.log(segments.map((s) => `${fmt(s.at)}  ${s.type === "card" ? s.name : `clip ${s.clip.id}`}  ${s.duration.toFixed(2)} s${s.type === "clip" && s.keep.length > 1 ? ` (${s.keep.length} parts after cuts)` : ""}`).join("\n"));
run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph.join(";\n"), "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", ...encode, "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { cwd: work });
if (!args.draft) run("node", [`${root}scripts/loudnorm.mjs`, out, out.replace(/\.mp4$/, ".final.mp4"), "--lufs=-16"], { stdio: "inherit" });
console.log(`${out.slice(root.length)}: ${total.toFixed(2)} s, ${cues.length} captions → renders/${id}.srt`);

function checkFont({ font, fontsDir }) {
  const path = `${root}${fontsDir}`;
  const files = existsSync(path) ? readdirSync(path).filter((f) => /\.(ttf|otf|ttc)$/i.test(f)) : [];
  const families = files.flatMap((f) => run("fc-scan", ["--format", "%{family}\n", `${path}/${f}`]).stdout.split(/[\n,]/)).map((s) => s.trim());
  if (!families.includes(font)) fail(`caption font "${font}" not found in ${fontsDir}/ (found: ${[...new Set(families)].join(", ") || "none"}). Copy a bold CJK sans there (see references/recorded.md), or set project.captions.font / fontsDir.`);
}

function ass(list, { width, height }) {
  const t = (s) => {
    const cs = Math.round(s * 100);
    return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
  };
  const px = Math.round(height * style.size);
  const outline = Math.max(2, Math.round(px * 0.09));
  return [
    "[Script Info]", "ScriptType: v4.00+", "WrapStyle: 2", "ScaledBorderAndShadow: yes", `PlayResX: ${width}`, `PlayResY: ${height}`, "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,${style.font},${px},&H00FFFFFF,&H00FFFFFF,&H00141414,&H96000000,-1,0,0,0,100,100,1,0,1,${outline},${Math.max(1, Math.round(outline * 0.6))},2,0,0,${Math.round(height * style.marginV)},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...list.map((c) => `Dialogue: 0,${t(c.start)},${t(c.end)},Default,,0,0,0,,${c.text.replace(/\n/g, "\\N")}`),
    "",
  ].join("\n");
}

function srt(list) {
  const t = (s) => {
    const ms = Math.round(s * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  return list.map((c, i) => `${i + 1}\n${t(c.start)} --> ${t(c.end)}\n${c.text}\n`).join("\n");
}
