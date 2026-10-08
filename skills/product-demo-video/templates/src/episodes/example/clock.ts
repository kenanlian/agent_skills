// Scene clock and audio plan. No DOM access: `build-episodes.mjs` also imports
// this module in Node to write the composition's <audio> tracks and duration.
import audio from "./audio.json";
import voice from "./voice.json";
import { audioPlan, captionText, sequence, take, type AudioConfig, type VoiceManifest } from "../../stage/narration";

const config = audio as AudioConfig;
const manifest = voice as VoiceManifest;

function shift<K extends string>(offset: number, times: Record<K, number>): Record<K, number> {
  return Object.fromEntries(Object.entries<number>(times).map(([key, value]) => [key, value + offset])) as Record<K, number>;
}

/** The intro line (plugin name + topic) starts with the topic line; the card leaves once it is said. */
const INTRO_VOICE = 0.3;
const intro = take(manifest, "intro");
const introOut = Math.max(1.65, INTRO_VOICE + intro.duration + 0.25);
/** When the demo starts, after the intro card leaves. */
const DEMO = introOut + 0.35;

/** Each beat's `min` is the time its choreography needs; a longer line stretches the hold at its end. */
const BEATS = [
  { line: "open", min: 1.7 },
  { line: "type", min: 2.6 },
  { line: "result", min: 4.3 },
  { line: "clear", min: 2.6 },
];
const beats = sequence(DEMO + 1.2, BEATS, manifest);
const [open, type, result, clear] = beats.starts;

/** Scene clock, in seconds. */
export const T = {
  introTagline: 0.2,
  introOut,
  ...shift(DEMO, { titleIn: 0.2, frameIn: 0.35, explainerIn: 0.7 }),
  ...shift(open, { caption1: 0, cursorIn: 0.1, cursorToSearch: 0.25, hoverSearch: 0.9, clickSearch: 1.2, cursorToInput: 1.45 }),
  ...shift(type, { caption2: 0, leaderIn: 0.05, typeStart: 0.5, commit: 1.5, dim: 1.55, fall: 1.85, gather: 2.15 }),
  ...shift(result, { caption3: 0, hits: 0.1, leaderOut: 0.7, spotlight: 0.9, cardPushIn: 1.4, cardPullBack: 3.4, spotlightOut: 3.7 }),
  ...shift(clear, { caption4: 0, cursorToClear: 0.1, hoverClear: 0.75, clickClear: 1.05, restore: 1.1 }),
  ...shift(beats.end, { outro: 0, endCard: 0.5 }),
  end: beats.end + 7.3,
};

/** Numbered captions, in beat order; each is its line's source text. */
export const CAPTIONS = BEATS.map(({ line }) => captionText(config, line));

export const AUDIO_PLAN = audioPlan({
  end: T.end,
  voices: [{ id: "intro", file: intro.file, start: INTRO_VOICE, duration: intro.duration }, ...beats.cues],
  bgm: config.bgm,
  outroAt: T.outro,
});
