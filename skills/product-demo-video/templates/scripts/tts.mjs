// Synthesizes an episode's narration with Volcengine Doubao bidirectional TTS.
// Reads src/episodes/<id>/audio.json. Each line's raw response is kept in
// audio/voice/raw/ (content-addressed, so a line is billed once); the take in
// audio/voice/ is the raw response with its silent head and tail trimmed and its
// loudness set to TAKE_LUFS, so changing that processing never bills again.
// Writes the take manifest src/episodes/<id>/voice.json that the scene clock reads.
// Usage: node scripts/tts.mjs <episode> [--line <id>]
// Credentials: ~/.config/volc-tts/env (never printed, never copied).
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const ENV_PATH = join(homedir(), ".config", "volc-tts", "env");
const ENDPOINT = "wss://openspeech.bytedance.com/api/v3/tts/bidirection";
const AUDIO_PARAMS = { format: "mp3", sample_rate: 24000, bit_rate: 128000 };
const VOICE_DIR = "audio/voice";
const RAW_DIR = "audio/voice/raw";
/** Every take is brought to this integrated loudness, so music levels hold for any speaker. */
const TAKE_LUFS = -21;
const TAKE_PEAK = -1.5;
/** Silence kept before the first and after the last word. */
const PAD = { head: 0.05, tail: 0.1 };

const Event = {
  StartConnection: 1,
  FinishConnection: 2,
  ConnectionStarted: 50,
  ConnectionFailed: 51,
  ConnectionFinished: 52,
  StartSession: 100,
  FinishSession: 102,
  SessionStarted: 150,
  SessionFinished: 152,
  SessionFailed: 153,
  TaskRequest: 200,
  TTSResponse: 352,
};
const EVENT_NAME = Object.fromEntries(Object.entries(Event).map(([name, code]) => [code, name]));
const CONNECTION_EVENTS = new Set([1, 2, 50, 51, 52]);

const root = new URL("../", import.meta.url).pathname;
const { values: args, positionals } = parseArgs({
  options: { line: { type: "string" } },
  allowPositionals: true,
});
const [episode] = positionals;
if (!episode) fail("usage: node scripts/tts.mjs <episode> [--line <id>]");

const episodeDir = `${root}src/episodes/${episode}`;
const config = JSON.parse(readFileSync(`${episodeDir}/audio.json`, "utf8"));
const speaker = config.voice?.speaker?.trim();
const resourceId = config.voice?.resourceId?.trim() || "seed-tts-2.0";
if (!speaker) {
  fail(`voice.speaker is empty in src/episodes/${episode}/audio.json: ask the user which voice to use for this episode`);
}
const lines = config.lines ?? [];
if (args.line && !lines.some((line) => line.id === args.line)) fail(`no line "${args.line}" in audio.json`);

mkdirSync(`${root}${RAW_DIR}`, { recursive: true });
const credentials = loadCredentials();
const report = [];
for (const line of lines) {
  const spoken = line.say ?? line.text;
  const rawKey = hash({ resourceId, speaker, spoken, AUDIO_PARAMS });
  const raw = `${RAW_DIR}/${rawKey}.mp3`;
  const file = `${VOICE_DIR}/${hash({ rawKey, TAKE_LUFS, TAKE_PEAK, PAD })}.mp3`;
  const wanted = !args.line || args.line === line.id;
  let billed = 0;
  if (wanted && !existsSync(`${root}${raw}`)) {
    const take = await synthesize(spoken);
    writeFileSync(`${root}${raw}`, take.audio);
    billed = take.billed;
  }
  if (existsSync(`${root}${raw}`) && !existsSync(`${root}${file}`)) processTake(`${root}${raw}`, `${root}${file}`);
  if (existsSync(`${root}${file}`)) report.push({ id: line.id, spoken, file, duration: probeDuration(`${root}${file}`), billed });
}

const manifest = {
  speaker,
  resourceId,
  lines: Object.fromEntries(report.map(({ id, spoken, file, duration }) => [id, { file, duration, text: spoken }])),
};
writeFileSync(`${episodeDir}/voice.json`, `${JSON.stringify(manifest, null, 2)}\n`);
const missing = lines.filter((line) => !manifest.lines[line.id]).map((line) => line.id);
console.log(JSON.stringify({
  speaker,
  resourceId,
  takes: report.map(({ id, file, duration, billed }) => ({ id, file, duration, billed })),
  billedCharacters: report.reduce((sum, take) => sum + take.billed, 0),
  voiceSeconds: Number(report.reduce((sum, take) => sum + take.duration, 0).toFixed(3)),
  missing,
}, null, 2));

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

/** Trims the silent head and tail, then applies one static gain toward TAKE_LUFS, capped by TAKE_PEAK. */
function processTake(raw, out) {
  const measure = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", raw, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const summary = measure.stderr.slice(measure.stderr.lastIndexOf("Summary:"));
  const integrated = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  if (!Number.isFinite(integrated) || !Number.isFinite(peak)) fail(`could not measure loudness of ${raw}`);
  const gain = Math.min(TAKE_LUFS - integrated, TAKE_PEAK - peak);
  const trim = (pad) => `silenceremove=start_periods=1:start_threshold=-40dB:start_silence=${pad}`;
  const filter = [trim(PAD.head), "areverse", trim(PAD.tail), "areverse", `volume=${gain.toFixed(2)}dB`].join(",");
  const encode = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", filter, "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", out], { stdio: "inherit" });
  if (encode.status !== 0) fail(`ffmpeg failed processing ${raw}`);
}

function loadCredentials() {
  if (!existsSync(ENV_PATH)) fail(`missing ${ENV_PATH}`);
  const env = {};
  for (const raw of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const line = raw.trim();
    const eq = line.indexOf("=");
    if (!line || line.startsWith("#") || eq < 1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  if (env.VOLC_TTS_API_KEY) return { "X-Api-Key": env.VOLC_TTS_API_KEY };
  if (env.VOLC_TTS_APP_ID && env.VOLC_TTS_ACCESS_KEY) {
    return { "X-Api-App-Id": env.VOLC_TTS_APP_ID, "X-Api-Access-Key": env.VOLC_TTS_ACCESS_KEY };
  }
  fail(`no credentials in ${ENV_PATH}: set VOLC_TTS_API_KEY, or VOLC_TTS_APP_ID and VOLC_TTS_ACCESS_KEY`);
}

function frame(event, sessionId, payload) {
  const parts = [Buffer.from([0x11, 0x14, 0x10, 0x00]), int32(event)];
  if (!CONNECTION_EVENTS.has(event)) {
    const id = Buffer.from(sessionId, "utf8");
    parts.push(uint32(id.length), id);
  }
  const body = Buffer.from(payload, "utf8");
  parts.push(uint32(body.length), body);
  return Buffer.concat(parts);
}

function parseFrame(data) {
  const buf = Buffer.from(data);
  const type = buf[1] >> 4;
  const flag = buf[1] & 0x0f;
  let offset = 4 * (buf[0] & 0x0f);
  const message = { type, event: 0, errorCode: 0, payload: Buffer.alloc(0) };
  if (type === 0b1111) {
    message.errorCode = buf.readUInt32BE(offset);
    offset += 4;
  } else if (flag === 0b0100) {
    message.event = buf.readInt32BE(offset);
    offset += 4;
    if (!CONNECTION_EVENTS.has(message.event)) offset += 4 + buf.readUInt32BE(offset);
    if (message.event === Event.ConnectionStarted || message.event === Event.ConnectionFailed || message.event === Event.ConnectionFinished) {
      offset += 4 + buf.readUInt32BE(offset);
    }
  }
  const size = buf.readUInt32BE(offset);
  message.payload = buf.subarray(offset + 4, offset + 4 + size);
  return message;
}

/** One connection, one session, one text payload. */
async function synthesize(text) {
  const sessionId = randomUUID();
  const headers = {
    ...credentials,
    "X-Api-Resource-Id": resourceId,
    "X-Api-Connect-Id": randomUUID(),
    "X-Control-Require-Usage-Tokens-Return": "*",
  };
  const ws = new WebSocket(ENDPOINT, { headers });
  ws.binaryType = "arraybuffer";
  const trail = [];
  const audio = [];
  const queue = [];
  let waiting = null;
  const deliver = (message) => (waiting ? (waiting(message), (waiting = null)) : queue.push(message));
  const next = () => new Promise((resolve) => (queue.length ? resolve(queue.shift()) : (waiting = resolve)));
  const timer = setTimeout(() => ws.close(), 30_000);

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("handshake failed: check the API key and resource id")), { once: true });
  });
  ws.addEventListener("message", (event) => {
    const message = parseFrame(event.data);
    trail.push(message.type === 0b1111 ? `error ${message.errorCode}` : (EVENT_NAME[message.event] ?? `event ${message.event}`));
    if (message.event === Event.TTSResponse) audio.push(Buffer.from(message.payload));
    deliver(message);
  });
  ws.addEventListener("close", () => deliver(null));

  const expect = async (event) => {
    for (;;) {
      const message = await next();
      if (!message) throw new Error(`connection closed waiting for ${EVENT_NAME[event]} (${trail.join(" → ")})`);
      if (message.type === 0b1111 || message.event === Event.SessionFailed || message.event === Event.ConnectionFailed) {
        throw new Error(`${trail.at(-1)}: ${message.payload.toString("utf8")}`);
      }
      if (message.event === event) return message;
    }
  };

  try {
    ws.send(frame(Event.StartConnection, "", "{}"));
    await expect(Event.ConnectionStarted);
    ws.send(frame(Event.StartSession, sessionId, JSON.stringify({
      user: { uid: "product-demo-video" },
      event: Event.StartSession,
      namespace: "BidirectionalTTS",
      req_params: { speaker, audio_params: AUDIO_PARAMS },
    })));
    await expect(Event.SessionStarted);
    ws.send(frame(Event.TaskRequest, sessionId, JSON.stringify({
      event: Event.TaskRequest,
      namespace: "BidirectionalTTS",
      req_params: { text },
    })));
    ws.send(frame(Event.FinishSession, sessionId, "{}"));
    const finished = await expect(Event.SessionFinished);
    ws.send(frame(Event.FinishConnection, "", "{}"));

    const mp3 = Buffer.concat(audio);
    if (mp3.length < 256 || !(mp3.subarray(0, 3).toString() === "ID3" || mp3[0] === 0xff)) {
      throw new Error(`"${text}": response is not an mp3 (${mp3.length} bytes)`);
    }
    const billed = Number(JSON.parse(finished.payload.toString("utf8") || "{}").usage?.text_words ?? NaN);
    if (billed !== [...text].length) console.warn(`warning: "${text}" billed ${billed} characters, expected ${[...text].length}`);
    return { audio: mp3, billed: Number.isFinite(billed) ? billed : 0 };
  } finally {
    clearTimeout(timer);
    ws.close();
  }
}

function probeDuration(path) {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], { encoding: "utf8" });
  if (probe.status !== 0) fail(`ffprobe failed on ${path}`);
  return Number(Number(probe.stdout.trim()).toFixed(3));
}

function int32(value) {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(value, 0);
  return buf;
}

function uint32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value >>> 0, 0);
  return buf;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
