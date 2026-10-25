// Drafts recorded/<id>/captions.json from the ASR results: one-line cues split at
// punctuation and pauses, fillers removed, project.corrections applied, plus cut
// suggestions (retakes, long pauses, dead head/tail), each marked whether the
// screen is static across it (ffmpeg freezedetect), since a cut there is invisible.
// The text logic lives in recorded-text.mjs.
// captions.json is the proofread source of truth: an existing one is never
// overwritten; the draft then goes to captions.draft.json (or pass --force).
// Usage: node scripts/rec-captions.mjs <id> [--force]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fail, fmt, hashOf, loadProject, probe, root } from "./recorded-lib.mjs";
import { buildCues, dropCut, dropFillers, suggestCuts, tokenize } from "./recorded-text.mjs";

const { values: args, positionals } = parseArgs({ options: { force: { type: "boolean" } }, allowPositionals: true });
const { dir, work, project } = loadProject(positionals[0]);
const corrections = Object.entries(project.corrections ?? {});
const output = { clips: {} };

for (const clip of project.clips) {
  const asrPath = `${work}/${clip.id}.asr.json`;
  if (!existsSync(asrPath)) fail(`missing ${asrPath}; run \`node scripts/rec-asr.mjs ${positionals[0]}\` first`);
  const { result } = JSON.parse(readFileSync(asrPath, "utf8"));
  const duration = probe(`${root}${clip.file}`).duration;
  const utterances = (result.utterances ?? []).map(tokenize).map(dropFillers).filter((u) => u.tokens.length);
  const freezes = frozenRanges(clip);
  const cuts = suggestCuts(utterances, duration).map((cut) => ({ ...cut, static: isStatic(freezes, cut.from, cut.to) }));
  for (const cut of cuts) if (cut.kind !== "retake") cut.apply = cut.static;
  // The first take of a retake is left out of the captions too; rejecting the cut means restoring its words by hand.
  const cues = dropCut(utterances, cuts.filter((c) => c.kind === "retake")).flatMap((u) => buildCues(u.tokens, corrections));
  output.clips[clip.id] = { cues, cuts };
}

const target = existsSync(`${dir}/captions.json`) && !args.force ? `${dir}/captions.draft.json` : `${dir}/captions.json`;
writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
for (const [id, { cues, cuts }] of Object.entries(output.clips)) {
  console.log(`\n== ${id}`);
  for (const cue of cues) console.log(`  [${fmt(cue.start)} → ${fmt(cue.end)}] ${cue.text}${cue.asr !== cue.text ? `    (asr: ${cue.asr})` : ""}`);
  for (const cut of cuts) console.log(`  cut ${fmt(cut.from)} → ${fmt(cut.to)} (${(cut.to - cut.from).toFixed(2)} s) ${cut.kind}${cut.static ? ", screen static" : ", screen moving"}, apply=${cut.apply}: ${cut.reason}`);
}
console.log(`\nwrote ${target.slice(root.length)}`);

/** Time ranges where the picture does not change (cursor moves count as change). Cached per file. */
function frozenRanges(clip) {
  const file = `${root}${clip.file}`;
  const cache = `${work}/${clip.id}.freeze.json`;
  const key = hashOf({ file: clip.file, size: statSync(file).size, mtime: statSync(file).mtimeMs });
  if (existsSync(cache)) {
    const cached = JSON.parse(readFileSync(cache, "utf8"));
    if (cached.key === key) return cached.ranges;
  }
  const { stderr } = spawn("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:v", "-vf", "scale=640:-2,freezedetect=n=0.001:d=0.3", "-f", "null", "-"]);
  const starts = [...stderr.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/freeze_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ranges = starts.map((start, i) => [start, ends[i] ?? Infinity]);
  writeFileSync(cache, JSON.stringify({ key, ranges }));
  return ranges;
}

function isStatic(ranges, from, to) {
  return ranges.some(([start, end]) => start <= from + 0.05 && end >= to - 0.05);
}

function spawn(cmd, argv) {
  return spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 1 << 28 });
}
