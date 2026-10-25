// Pure caption and cut logic for the recorded-video scripts (no files, no ffmpeg),
// so it can be unit tested: ASR utterances → tokens → one-line cues, retake and
// pause detection, and mapping cue times through the applied cuts.

export const MAX_WEIGHT = 17;
export const SENTENCE_GAP = 1.0;
export const PAUSE_CUT = 1.5;
export const PAUSE_KEEP = 0.4;
export const HOLD = 0.5;
export const CUE_GAP = 0.08;
const FILLERS = new Set(["呃", "嗯", "额", "唔", "呃呃", "嗯嗯"]);
const SOFT_FILLERS = new Set(["啊", "哦", "噢"]);
const BREAK_PUNCT = /[，。？！；：、,.?!;:]/;
const SENTENCE_END = /[。？！?!]$/;
const segmenter = new Intl.Segmenter("zh", { granularity: "word" });

/** An ASR utterance ({text, words:[{text,start_time,end_time}]} in ms) as tokens in seconds, with the punctuation after each and whether a space precedes it. */
export function tokenize(u) {
  const text = u.text ?? "";
  const lower = text.toLowerCase();
  const tokens = [];
  let pos = 0;
  for (const word of u.words ?? []) {
    if (!(word.start_time >= 0) || !word.text.trim()) continue;
    let index = lower.indexOf(word.text.toLowerCase(), pos);
    if (index < 0) index = pos;
    const between = text.slice(pos, index);
    if (tokens.length) tokens.at(-1).punct += between.replace(/\s/g, "");
    tokens.push({ text: word.text, start: word.start_time / 1000, end: word.end_time / 1000, punct: "", space: /\s/.test(between) });
    pos = index + word.text.length;
  }
  if (tokens.length) tokens.at(-1).punct += text.slice(pos).replace(/\s/g, "");
  return { tokens, text };
}

/** Removes hesitation fillers; 啊/哦/噢 only when isolated, since they are also sentence particles. */
export function dropFillers(u) {
  const kept = [];
  u.tokens.forEach((token, i) => {
    const prev = u.tokens[i - 1];
    const next = u.tokens[i + 1];
    const isolated = !prev || BREAK_PUNCT.test(prev.punct) || token.punct || !next || next.start - token.end > 0.25 || token.start - (prev?.end ?? 0) > 0.25;
    if (FILLERS.has(token.text) || (SOFT_FILLERS.has(token.text) && isolated)) {
      if (kept.length && !kept.at(-1).punct && token.punct) kept.at(-1).punct = token.punct;
      return;
    }
    kept.push({ ...token });
  });
  return { ...u, tokens: kept };
}

/** Removes the tokens that start inside one of the cuts, and utterances left empty. */
export function dropCut(utterances, cuts) {
  const inside = (t) => cuts.some((c) => t.start >= c.from - 0.01 && t.start < c.to - 0.01);
  return utterances.map((u) => ({ ...u, tokens: u.tokens.filter((t) => !inside(t)) })).filter((u) => u.tokens.length);
}

function isLatin(s) {
  return /^[A-Za-z0-9]/.test(s);
}

/** Display width in CJK characters. */
export function weight(s) {
  return [...s].reduce((sum, ch) => sum + (/[A-Za-z0-9]/.test(ch) ? 0.55 : /\s/.test(ch) ? 0.3 : 1), 0);
}

/** Inner punctuation kept (a full stop becomes a comma); a space between Latin and CJK runs. */
function join(tokens) {
  let text = "";
  tokens.forEach((token, i) => {
    const prev = tokens[i - 1];
    if (prev && !prev.punct && (token.space || isLatin(token.text) || isLatin(prev.text))) text += " ";
    text += token.text;
    if (i < tokens.length - 1 && token.punct) text += token.punct.replace(/[。.]/g, "，");
  });
  return text;
}

function cueOf(tokens, corrections) {
  const asr = join(tokens) + tokens.at(-1).punct;
  let text = join(tokens);
  for (const [from, to] of corrections) text = text.split(from).join(to);
  const tail = tokens.at(-1).punct.match(/[？！?!]/)?.[0] ?? "";
  return { start: round(tokens[0].start), end: round(tokens.at(-1).end), text: text + tail, asr };
}

/** Sentences (ended by 。？！ or a long pause), each split down to one line; corrections is [[from, to], …]. */
export function buildCues(tokens, corrections = []) {
  const sentences = [];
  let current = [];
  tokens.forEach((token, i) => {
    current.push(token);
    const next = tokens[i + 1];
    if (!next || SENTENCE_END.test(token.punct) || next.start - token.end > SENTENCE_GAP) {
      sentences.push(current);
      current = [];
    }
  });
  return sentences.flatMap(splitLong).map((s) => cueOf(s, corrections));
}

/** Token indices where a line may break: word boundaries only, never inside a Latin run. */
function breakable(tokens) {
  const text = tokens.map((t) => t.text).join("");
  const bounds = new Set([...segmenter.segment(text)].map((s) => s.index));
  const allowed = new Set();
  let offset = 0;
  tokens.forEach((token, i) => {
    if (i > 0 && bounds.has(offset) && !(isLatin(token.text) && isLatin(tokens[i - 1].text))) allowed.add(i);
    offset += token.text.length;
  });
  return allowed;
}

/** Splits a sentence over MAX_WEIGHT where a reader would pause: punctuation, a gap, near the middle. */
function splitLong(tokens) {
  const total = weight(join(tokens));
  if (total <= MAX_WEIGHT || tokens.length < 2) return [tokens];
  const allowed = breakable(tokens);
  let best = Math.floor(tokens.length / 2);
  let bestScore = -Infinity;
  for (let i = 1; i < tokens.length; i++) {
    if (!allowed.has(i)) continue;
    const left = weight(join(tokens.slice(0, i)));
    const gap = Math.min(tokens[i].start - tokens[i - 1].end, 0.8);
    const balance = 1 - Math.abs(left / total - 0.5) * 2;
    const tiny = Math.min(left, total - left) < 3 ? 5 : 0;
    const score = (BREAK_PUNCT.test(tokens[i - 1].punct) ? 3 : 0) + gap * 5 + balance * 2 - tiny;
    if (score > bestScore) [best, bestScore] = [i, score];
  }
  return [...splitLong(tokens.slice(0, best)), ...splitLong(tokens.slice(best))];
}

/** Cut suggestions in source time: retakes (apply: true), long pauses, dead head and tail. */
export function suggestCuts(utterances, duration) {
  const cuts = [];
  const flat = utterances.flatMap((u) => u.tokens);
  const norm = (tokens) => tokens.map((t) => t.text.toLowerCase()).join("");

  // A phrase said twice in a row, inside or across utterances: keep the second take.
  const chars = [];
  flat.forEach((token, index) => [...token.text.toLowerCase()].forEach(() => chars.push(index)));
  const s = norm(flat);
  for (let i = 0; i < s.length; i++) {
    for (let m = Math.min(16, Math.floor((s.length - i) / 2)); m >= 2; m--) {
      if (s.slice(i, i + m) !== s.slice(i + m, i + 2 * m)) continue;
      const first = flat[chars[i]];
      const second = flat[chars[i + m]];
      if (chars[i] === chars[i + m]) continue;
      if (m < 3 && second.start - flat[chars[i + m - 1]].end < 0.4) continue;
      cuts.push({ from: round(first.start), to: round(second.start), kind: "retake", apply: true, reason: `重复「${s.slice(i, i + m)}」` });
      i += 2 * m - 1;
      break;
    }
  }
  // An utterance abandoned and restarted: the next one opens with (most of) it.
  for (let k = 0; k + 1 < utterances.length; k++) {
    const a = norm(utterances[k].tokens);
    const b = norm(utterances[k + 1].tokens);
    const gap = utterances[k + 1].tokens[0].start - utterances[k].tokens.at(-1).end;
    let prefix = 0;
    while (prefix < a.length && a[prefix] === b[prefix]) prefix++;
    if (gap < 10 && a.length >= 3 && ((prefix >= 3 && prefix >= a.length * 0.5) || (a.length >= 4 && dice(a, b.slice(0, a.length + 2)) >= 0.7))) {
      const from = round(utterances[k].tokens[0].start);
      const to = round(utterances[k + 1].tokens[0].start);
      if (!cuts.some((c) => c.from <= from && c.to >= to)) cuts.push({ from, to, kind: "retake", apply: true, reason: `重说：「${utterances[k].text}」` });
    }
  }
  // Long pauses, keeping PAUSE_KEEP on each side; dead time before the first and after the last word.
  for (let i = 0; i + 1 < flat.length; i++) {
    const gap = flat[i + 1].start - flat[i].end;
    if (gap > PAUSE_CUT) cuts.push({ from: round(flat[i].end + PAUSE_KEEP), to: round(flat[i + 1].start - PAUSE_KEEP), kind: "pause", reason: `停顿 ${gap.toFixed(1)} 秒` });
  }
  if (flat.length && flat[0].start > 1.5) cuts.push({ from: 0, to: round(flat[0].start - 0.6), kind: "head", reason: `开头 ${flat[0].start.toFixed(1)} 秒没有说话` });
  if (flat.length && duration - flat.at(-1).end > 2.2) cuts.push({ from: round(flat.at(-1).end + 1.2), to: round(duration), kind: "tail", reason: `结尾 ${(duration - flat.at(-1).end).toFixed(1)} 秒没有说话` });
  return cuts.sort((a, b) => a.from - b.from);
}

function dice(a, b) {
  const grams = (s) => Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2));
  const x = grams(a);
  const y = grams(b);
  if (!x.length || !y.length) return 0;
  const pool = [...y];
  let hits = 0;
  for (const g of x) {
    const at = pool.indexOf(g);
    if (at >= 0) {
      hits++;
      pool.splice(at, 1);
    }
  }
  return (2 * hits) / (x.length + y.length);
}

/** The source ranges [from, to] that survive the cuts; empty if nothing is left. */
export function keepRanges(duration, cuts) {
  const removed = cuts.map((c) => [Math.max(0, c.from), Math.min(duration, c.to)]).filter(([a, b]) => b - a > 0.05).sort((x, y) => x[0] - y[0]);
  const keep = [];
  let at = 0;
  for (const [a, b] of removed) {
    if (a > at + 0.1) keep.push([at, a]);
    at = Math.max(at, b);
  }
  if (duration > at + 0.1) keep.push([at, duration]);
  return keep;
}

/** Maps cues from source time onto the cut clip; drops cues left (nearly) empty; holds each HOLD longer for reading. */
export function retime(list, keep, duration) {
  const map = (t) => {
    let offset = 0;
    for (const [a, b] of keep) {
      if (t < a) return offset;
      if (t <= b) return offset + t - a;
      offset += b - a;
    }
    return offset;
  };
  const mapped = list.map((c) => ({ text: c.text, start: map(c.start), end: map(c.end) })).filter((c) => c.end - c.start > 0.15 && c.text.trim());
  return mapped.map((c, i) => ({ ...c, end: Math.min(c.end + HOLD, (mapped[i + 1]?.start ?? duration) - CUE_GAP, duration) }));
}

export function round(t) {
  return Math.round(t * 100) / 100;
}
