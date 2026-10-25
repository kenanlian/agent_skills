// Shared helpers for the recorded-video pipeline (scripts/rec-*.mjs).
// A recorded project lives in recorded/<id>/: project.json (clips, titles,
// summaries, hotwords, options) and captions.json (proofread cues and cuts),
// both committed. Intermediate files go to recorded/<id>/work/ (git-ignored).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const root = new URL("../", import.meta.url).pathname;

export function fail(message) {
  console.error(message);
  process.exit(1);
}

export function loadProject(id) {
  if (!id) fail("usage: node scripts/<rec-script>.mjs <project id>");
  const dir = `${root}recorded/${id}`;
  const path = `${dir}/project.json`;
  if (!existsSync(path)) fail(`missing ${path}`);
  const project = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(project.clips) || project.clips.length === 0) fail(`${path}: "clips" is empty`);
  for (const clip of project.clips) {
    if (!clip.id || !clip.file) fail(`${path}: every clip needs "id" and "file"`);
    if (!existsSync(`${root}${clip.file}`)) fail(`${path}: clip ${clip.id} file not found: ${clip.file}`);
  }
  const work = `${dir}/work`;
  mkdirSync(work, { recursive: true });
  return { id, dir, work, project };
}

export function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...options });
  if (result.status !== 0) fail(`${cmd} failed:\n${result.stderr || ""}`);
  return result;
}

export function probe(file) {
  const { stdout } = run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate,start_time", "-of", "json", file]);
  const info = JSON.parse(stdout);
  const video = info.streams.find((s) => s.codec_type === "video");
  const audio = info.streams.find((s) => s.codec_type === "audio");
  const [num, den] = (video?.r_frame_rate ?? "60/1").split("/").map(Number);
  return {
    duration: Number(info.format.duration),
    width: video?.width,
    height: video?.height,
    fps: num / (den || 1),
    videoStart: Number(video?.start_time ?? 0),
    audioStart: audio ? Number(audio.start_time ?? 0) : null,
  };
}

/** Integrated loudness and true peak (EBU R128). */
export function loudness(file) {
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  return {
    integrated: Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]),
    peak: Number(summary.match(/Peak:\s+(-?[\d.inf]+) dBFS/)?.[1]),
  };
}

/** 5th percentile of momentary loudness: a stand-in for the noise floor in the pauses. */
export function floor(file) {
  const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const values = [...stderr.matchAll(/lavfi\.r128\.M=(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => v > -120).sort((a, b) => a - b);
  return values.length ? values[Math.floor(values.length * 0.05)] : NaN;
}

export function hashOf(value) {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest("hex").slice(0, 16);
}

export function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);
}

/** Volcengine credentials shared with tts.mjs; never printed. */
export function volcHeaders() {
  const path = join(homedir(), ".config", "volc-tts", "env");
  if (!existsSync(path)) fail(`missing ${path}`);
  const env = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    const eq = line.indexOf("=");
    if (!line || line.startsWith("#") || eq < 1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  if (env.VOLC_TTS_API_KEY) return { headers: { "X-Api-Key": env.VOLC_TTS_API_KEY }, env };
  if (env.VOLC_TTS_APP_ID && env.VOLC_TTS_ACCESS_KEY) {
    return { headers: { "X-Api-App-Key": env.VOLC_TTS_APP_ID, "X-Api-Access-Key": env.VOLC_TTS_ACCESS_KEY }, env };
  }
  fail(`no credentials in ${path}: set VOLC_TTS_API_KEY, or VOLC_TTS_APP_ID and VOLC_TTS_ACCESS_KEY`);
}

/** Output frame size: project.size, else the first clip's size. */
export function outputSize(project) {
  if (project.size) return { width: project.size[0], height: project.size[1] };
  const info = probe(`${root}${project.clips[0].file}`);
  return { width: info.width, height: info.height };
}

export const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
