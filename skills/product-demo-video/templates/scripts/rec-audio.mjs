// Cleans the voice of every clip in recorded/<id>/project.json:
// extract (aligned to the video's t = 0) → high-pass → pre-gain toward -23 LUFS →
// DeepFilterNet (delay-compensated) → gentle compressor → one static gain to
// -16 LUFS under a limiter. Writes work/<clip>.clean.wav, the same length as the
// clip, so it replaces the recorded audio sample for sample.
// Usage: node scripts/rec-audio.mjs <id> [--clip <clip id>] [--atten <dB>]
//   --atten limits the noise attenuation (DeepFilterNet -a); try 30-40 if the
//   voice sounds hollow. Default: unlimited.
// DeepFilterNet: the deep-filter binary at $DEEP_FILTER or ~/.local/share/deepfilter/deep-filter.
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { fail, floor, loadProject, loudness, probe, root, run } from "./recorded-lib.mjs";

const TARGET_LUFS = -16;
const PRE_LUFS = -23;
const DF_URL = "https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-x86_64-unknown-linux-musl";

const { values: args, positionals } = parseArgs({ options: { clip: { type: "string" }, atten: { type: "string" } }, allowPositionals: true });
const { work, project } = loadProject(positionals[0]);
const deepFilter = process.env.DEEP_FILTER ?? join(homedir(), ".local", "share", "deepfilter", "deep-filter");
if (!existsSync(deepFilter)) {
  fail(`DeepFilterNet not found at ${deepFilter}. Install it (one 36 MB binary, no Python):
  mkdir -p ~/.local/share/deepfilter && curl -fL -o ~/.local/share/deepfilter/deep-filter ${DF_URL} && chmod +x ~/.local/share/deepfilter/deep-filter
(other platforms: https://github.com/Rikorose/DeepFilterNet/releases)`);
}

const report = [];
for (const clip of project.clips) {
  if (args.clip && clip.id !== args.clip) continue;
  const input = `${root}${clip.file}`;
  const info = probe(input);
  if (info.audioStart === null) fail(`${clip.file} has no audio stream`);
  const orig = `${work}/${clip.id}.orig.wav`;
  const pre = `${work}/${clip.id}.pre.wav`;
  const dfDir = `${work}/df-${clip.id}`;
  const clean = `${work}/${clip.id}.clean.wav`;

  // Align the audio to the video's first frame, and cover exactly the clip length.
  const offset = info.audioStart - info.videoStart;
  const align = offset > 0 ? `adelay=${Math.round(offset * 1000)}:all=1,` : offset < 0 ? `atrim=start=${-offset},asetpts=PTS-STARTPTS,` : "";
  run("ffmpeg", ["-v", "error", "-y", "-i", input, "-vn", "-af", `${align}apad,atrim=0:${info.duration}`, "-ac", "1", "-ar", "48000", orig]);

  const before = loudness(orig);
  const preGain = Math.max(0, Math.min(24, PRE_LUFS - before.integrated));
  run("ffmpeg", ["-v", "error", "-y", "-i", orig, "-af", `highpass=f=70,volume=${preGain.toFixed(2)}dB,alimiter=limit=0.9:level=disabled`, "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", pre]);

  rmSync(dfDir, { recursive: true, force: true });
  run(deepFilter, ["-D", ...(args.atten ? ["-a", args.atten] : []), "-o", dfDir, pre]);
  const denoised = `${dfDir}/${clip.id}.pre.wav`;
  if (!existsSync(denoised)) fail(`DeepFilterNet wrote no output for ${clip.id}`);

  const compressed = `${work}/${clip.id}.comp.wav`;
  run("ffmpeg", ["-v", "error", "-y", "-i", denoised, "-af", "acompressor=threshold=0.08:ratio=2.5:attack=8:release=120:makeup=1", compressed]);
  const mid = loudness(compressed);
  const gain = TARGET_LUFS - mid.integrated;
  run("ffmpeg", ["-v", "error", "-y", "-i", compressed, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:level=disabled:attack=2:release=50,apad,atrim=0:${info.duration}`, "-ac", "1", "-ar", "48000", clean]);
  rmSync(dfDir, { recursive: true, force: true });
  rmSync(pre, { force: true });
  rmSync(compressed, { force: true });

  const after = loudness(clean);
  report.push({
    clip: clip.id,
    duration: Number(info.duration.toFixed(2)),
    lufs: `${before.integrated.toFixed(1)} → ${after.integrated.toFixed(1)}`,
    voiceOverFloor: `${(before.integrated - floor(orig)).toFixed(1)} → ${(after.integrated - floor(clean)).toFixed(1)} dB`,
    peak: after.peak,
    file: clean.slice(root.length),
  });
}
if (args.clip && report.length === 0) fail(`no clip "${args.clip}" in project.json`);
console.log(JSON.stringify(report, null, 2));
