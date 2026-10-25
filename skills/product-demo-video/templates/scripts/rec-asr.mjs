// Transcribes every clip with Volcengine Doubao recording-file ASR (submit +
// query), with per-character timestamps and the project's hotwords. It reads the
// aligned original audio, not the denoised one: DeepFilterNet's artifacts turned
// whole phrases into nonsense in testing, while the raw take came back nearly clean.
// Writes work/<clip>.asr.json; cached by audio content + hotwords, so a re-run
// only bills changed clips.
// Usage: node scripts/rec-asr.mjs <id> [--clip <clip id>] [--force]
// Credentials: ~/.config/volc-tts/env (shared with tts.mjs). Resource id:
// VOLC_ASR_RESOURCE_ID in that file, default volc.seedasr.auc.
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fail, fmt, hashFile, hashOf, loadProject, run, volcHeaders } from "./recorded-lib.mjs";

const BASE = "https://openspeech.bytedance.com/api/v3/auc/bigmodel";
const { values: args, positionals } = parseArgs({ options: { clip: { type: "string" }, force: { type: "boolean" } }, allowPositionals: true });
const { work, project } = loadProject(positionals[0]);
const { headers: auth, env } = volcHeaders();
const resourceId = env.VOLC_ASR_RESOURCE_ID || "volc.seedasr.auc";
const hotwords = project.hotwords ?? [];

for (const clip of project.clips) {
  if (args.clip && clip.id !== args.clip) continue;
  const orig = `${work}/${clip.id}.orig.wav`;
  if (!existsSync(orig)) fail(`missing ${orig}; run \`node scripts/rec-audio.mjs ${positionals[0]}\` first`);
  const out = `${work}/${clip.id}.asr.json`;
  const key = hashOf({ audio: hashFile(orig), hotwords, resourceId });
  if (!args.force && existsSync(out) && JSON.parse(readFileSync(out, "utf8")).key === key) {
    console.log(`${clip.id}: cached`);
    continue;
  }
  const mp3 = run("ffmpeg", ["-v", "error", "-i", orig, "-af", "highpass=f=70,loudnorm=I=-20:TP=-2", "-ac", "1", "-ar", "16000", "-b:a", "64k", "-f", "mp3", "-"], { encoding: "buffer" }).stdout;
  const result = await recognize(mp3);
  writeFileSync(out, `${JSON.stringify({ key, resourceId, hotwords, result }, null, 2)}\n`);
  console.log(`${clip.id}:`);
  for (const u of result.utterances ?? []) console.log(`  [${fmt(u.start_time / 1000)} → ${fmt(u.end_time / 1000)}] ${u.text}`);
}

async function recognize(mp3) {
  const headers = {
    "Content-Type": "application/json",
    ...auth,
    "X-Api-Resource-Id": resourceId,
    "X-Api-Request-Id": randomUUID(),
    "X-Api-Sequence": "-1",
  };
  const submit = await fetch(`${BASE}/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user: { uid: "product-demo-video" },
      audio: { data: mp3.toString("base64"), format: "mp3" },
      request: {
        model_name: "bigmodel",
        enable_itn: true,
        enable_punc: true,
        show_utterances: true,
        ...(hotwords.length ? { corpus: { context: JSON.stringify({ hotwords: hotwords.map((word) => ({ word })) }) } } : {}),
      },
    }),
  });
  const code = submit.headers.get("x-api-status-code");
  if (code !== "20000000") {
    const hint = code === "45000030" ? `\nThe account has not enabled ${resourceId}. Enable 录音文件识别 in the Doubao voice console, or set VOLC_ASR_RESOURCE_ID to a granted resource.` : "";
    fail(`ASR submit failed: ${code} ${submit.headers.get("x-api-message")} (logid ${submit.headers.get("x-tt-logid")})${hint}`);
  }
  for (let attempt = 0; attempt < 300; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const query = await fetch(`${BASE}/query`, { method: "POST", headers, body: "{}" });
    const status = query.headers.get("x-api-status-code");
    const body = await query.text();
    if (status === "20000000") return JSON.parse(body).result;
    if (status !== "20000001" && status !== "20000002") fail(`ASR query failed: ${status} ${query.headers.get("x-api-message")}: ${body}`);
  }
  fail("ASR query timed out after 10 minutes");
}
