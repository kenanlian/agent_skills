// Measures EBU R128 loudness, then applies one static gain toward the target,
// capped so the true peak stays at --tp. Never ffmpeg's dynamic loudnorm mode:
// it compresses the voice and changes how the speaker sounds. An .mp4 output
// keeps its video stream untouched and re-encodes only the audio.
// Usage: node scripts/loudnorm.mjs <in> <out> [--lufs=-16] [--tp=-1.5] [--from=<s> --for=<s>]
//   (negative values need "="). --from/--for limit the measurement to the section
//   an episode plays (its bgm.offset and length); the gain applies to the whole file.
//   BGM bed:     node scripts/loudnorm.mjs "audio/source/Somewhere Sunny (ver 2).mp3" audio/bgm/somewhere-sunny.mp3 --lufs=-21 --from=0 --for=30
//   Final mix:   node scripts/loudnorm.mjs renders/<id>.mp4 renders/<id>.final.mp4 --lufs=-16
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values: args, positionals } = parseArgs({
  options: {
    lufs: { type: "string", default: "-16" },
    tp: { type: "string", default: "-1.5" },
    from: { type: "string" },
    for: { type: "string" },
  },
  allowPositionals: true,
});
const [input, output] = positionals;
if (!input || !output) {
  console.error("usage: node scripts/loudnorm.mjs <in> <out> [--lufs=-16] [--tp=-1.5] [--from=<s> --for=<s>]");
  process.exit(1);
}

const window = [...(args.from ? ["-ss", args.from] : []), ...(args.for ? ["-t", args.for] : [])];
const measure = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...window, "-i", input, "-af", `loudnorm=I=${args.lufs}:TP=${args.tp}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const json = measure.stderr.slice(measure.stderr.lastIndexOf("{"));
if (measure.status !== 0 || !json.startsWith("{")) {
  console.error(measure.stderr);
  process.exit(1);
}
const m = JSON.parse(json);
const loudness = Number(m.input_i);
const peak = Number(m.input_tp);
const gain = Math.min(Number(args.lufs) - loudness, Number(args.tp) - peak);
const codec = output.endsWith(".mp4")
  ? ["-map", "0:v", "-map", "0:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart"]
  : ["-vn", "-c:a", "libmp3lame", "-b:a", "192k"];
const apply = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", input, "-af", `volume=${gain.toFixed(2)}dB`, "-ar", "48000", ...codec, output], { stdio: "inherit" });
if (apply.status !== 0) process.exit(apply.status ?? 1);
const reached = loudness + gain;
const capped = reached < Number(args.lufs) - 0.05 ? ` (peak-limited; target ${args.lufs})` : "";
console.log(`${output}: ${loudness.toFixed(2)} → ${reached.toFixed(2)} LUFS, gain ${gain.toFixed(2)} dB, true peak ${(peak + gain).toFixed(2)} dBTP${capped}`);
