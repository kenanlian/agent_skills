/** One synthesized line, as `scripts/tts.mjs` writes it into `voice.json`. */
export interface VoiceTake {
  file: string;
  duration: number;
  text: string;
}

export interface VoiceManifest {
  speaker: string;
  resourceId: string;
  lines: Record<string, VoiceTake>;
}

/** One narration line in `audio.json`. `say` overrides the spoken text only (pronunciation); `text` stays the caption. */
export interface NarrationLine {
  id: string;
  text: string;
  say?: string;
}

export interface BgmConfig {
  /** Loudness-normalized bed, relative to the video project root. */
  file: string;
  /** Seconds into the track where the episode starts. */
  offset?: number;
}

export interface AudioConfig {
  voice: { speaker: string; resourceId?: string };
  lines: NarrationLine[];
  bgm?: BgmConfig;
}

/** A voice take placed on the composition clock. */
export interface VoiceCue {
  id: string;
  file: string;
  start: number;
  duration: number;
}

export interface BgmLevels {
  /** Between lines. */
  bed: number;
  /** Under a voice line. */
  duck: number;
  /** After the last line, through the outro. */
  outro: number;
  attack: number;
  release: number;
  /** Lines closer than this stay ducked across the gap. */
  mergeGap: number;
  fadeIn: number;
  fadeOut: number;
}

/** Volumes for a bed normalized with `loudnorm.mjs --lufs=-21`, the level `tts.mjs` gives every take. */
export const BGM_LEVELS: BgmLevels = {
  bed: 0.4,
  duck: 0.2,
  outro: 0.75,
  attack: 0.2,
  release: 0.5,
  mergeGap: 0.8,
  fadeIn: 0.6,
  fadeOut: 2,
};

/** What `build-episodes.mjs` writes into the composition: <audio> tracks and the root's `data-duration`. */
export interface AudioPlan {
  end: number;
  voices: VoiceCue[];
  bgm?: {
    file: string;
    offset: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    automation: ReturnType<typeof bgmAutomation>;
  };
}

export function audioPlan(options: {
  end: number;
  voices: VoiceCue[];
  bgm?: BgmConfig;
  /** When the bed comes up for the outro. */
  outroAt: number;
  levels?: BgmLevels;
}): AudioPlan {
  const { end, voices, bgm, outroAt, levels = BGM_LEVELS } = options;
  return {
    end,
    voices,
    bgm: bgm && {
      file: bgm.file,
      offset: bgm.offset ?? 0,
      volume: levels.bed,
      fadeIn: levels.fadeIn,
      fadeOut: levels.fadeOut,
      automation: bgmAutomation(voices, levels, outroAt),
    },
  };
}

export function take(manifest: VoiceManifest, id: string): VoiceTake {
  const found = manifest.lines[id];
  if (!found) throw new Error(`No voice take for "${id}": run \`npm run tts -- <episode>\``);
  return found;
}

/** Caption text per line id, so the caption on screen is the narration source text. */
export function captionText(config: AudioConfig, id: string): string {
  const line = config.lines.find((candidate) => candidate.id === id);
  if (!line) throw new Error(`No narration line "${id}" in audio.json`);
  return line.text;
}

export interface BeatSpec {
  /** Voice line spoken from the beat start (after `lead`). */
  line: string;
  /** Shortest the beat may be, set by its choreography. */
  min: number;
}

/**
 * Lays beats end to end. A beat lasts its choreography minimum or its line plus
 * `lead` and `tail`, whichever is longer; the extra time becomes hold at its end.
 */
export function sequence(start: number, beats: BeatSpec[], manifest: VoiceManifest, lead = 0.05, tail = 0.55) {
  const starts: number[] = [];
  const cues: VoiceCue[] = [];
  let cursor = start;
  for (const beat of beats) {
    const voice = take(manifest, beat.line);
    starts.push(cursor);
    cues.push({ id: beat.line, file: voice.file, start: cursor + lead, duration: voice.duration });
    cursor += Math.max(beat.min, lead + voice.duration + tail);
  }
  return { starts, cues, end: cursor };
}

/** Clip-local volume points for the bed's `data-automation`: ducked under each line, raised for the outro. */
export function bgmAutomation(voices: VoiceCue[], levels: BgmLevels, outroAt: number) {
  const spans: Array<{ start: number; end: number }> = [];
  for (const cue of [...voices].sort((a, b) => a.start - b.start)) {
    const last = spans.at(-1);
    if (last && cue.start - last.end < levels.mergeGap) last.end = Math.max(last.end, cue.start + cue.duration);
    else spans.push({ start: cue.start, end: cue.start + cue.duration });
  }
  const points = [{ t: 0, v: levels.bed }];
  const ramp = (from: number, duration: number, to: number) => {
    const last = points.at(-1)!;
    const at = round(Math.max(from, last.t));
    if (at > last.t) points.push({ t: at, v: last.v });
    points.push({ t: round(at + duration), v: to });
  };
  for (const span of spans) {
    ramp(span.start - levels.attack, levels.attack, levels.duck);
    ramp(span.end, levels.release, levels.bed);
  }
  ramp(outroAt, 1, levels.outro);
  return { version: 1, lanes: [{ target: "volume", points }] };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
