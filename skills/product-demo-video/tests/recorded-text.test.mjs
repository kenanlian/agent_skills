import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_WEIGHT,
  buildCues,
  dropCut,
  dropFillers,
  keepRanges,
  retime,
  suggestCuts,
  tokenize,
  weight,
} from '../templates/scripts/recorded-text.mjs';

/** An ASR utterance from [word, startSeconds, endSeconds] triples. */
function utt(text, words) {
  return {
    text,
    words: words.map(([w, start, end]) => ({ text: w, start_time: start * 1000, end_time: end * 1000 })),
  };
}

/** Words spaced evenly from `start`, `step` seconds each. */
function evenly(chars, start, step = 0.2) {
  return chars.map((w, i) => [w, start + i * step, start + (i + 1) * step - 0.02]);
}

const prepare = (u) => dropFillers(tokenize(u));

test('tokenize attaches punctuation to the preceding word and notes spaces', () => {
  const { tokens } = tokenize(utt('打开 Card Workspace，然后点击。', [
    ['打开', 0, 0.4], ['card', 0.5, 0.8], ['workspace', 0.8, 1.3], ['然后', 1.5, 1.8], ['点击', 1.8, 2.1],
  ]));
  assert.deepEqual(tokens.map((t) => t.punct), ['', '', '，', '', '。']);
  assert.deepEqual(tokens.map((t) => t.space), [false, true, true, false, false]);
  assert.equal(tokens[1].start, 0.5);
});

test('dropFillers always removes hesitations and only isolated soft fillers', () => {
  const u = prepare(utt('呃，这个按钮嗯可以点。啊，对。', [
    ['呃', 0, 0.2], ['这个', 0.5, 0.8], ['按钮', 0.8, 1.1], ['嗯', 1.1, 1.3], ['可以', 1.3, 1.6], ['点', 1.6, 1.8],
    ['啊', 2.5, 2.7], ['对', 3.0, 3.2],
  ]));
  assert.deepEqual(u.tokens.map((t) => t.text), ['这个', '按钮', '可以', '点', '对']);
  assert.equal(u.tokens[3].punct, '。');
});

test('buildCues splits long sentences at punctuation, keeps Latin runs whole, applies corrections', () => {
  const words = [
    ['在', 0, 0.2], ['color', 0.2, 0.5], ['workspace', 0.5, 0.9], ['里', 0.9, 1.0], ['点击', 1.0, 1.3], ['这个', 1.3, 1.6], ['按钮', 1.6, 2.2],
    ['就', 2.4, 2.5], ['会', 2.5, 2.6], ['弹出', 2.6, 2.9], ['一个', 2.9, 3.1], ['可以', 3.1, 3.4], ['随手', 3.4, 3.7], ['记录', 3.7, 4.0], ['的', 4.0, 4.1], ['输入框', 4.1, 4.9],
  ];
  const u = prepare(utt('在 Color Workspace 里点击这个按钮，就会弹出一个可以随手记录的输入框。', words));
  const cues = buildCues(u.tokens, [['color workspace', 'Card Workspace']]);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, '在 Card Workspace 里点击这个按钮');
  assert.equal(cues[1].text, '就会弹出一个可以随手记录的输入框');
  assert.equal(cues[0].asr, '在 color workspace 里点击这个按钮，');
  for (const cue of cues) assert.ok(weight(cue.text) <= MAX_WEIGHT, cue.text);
  assert.deepEqual([cues[1].start, cues[1].end], [2.4, 4.9]);
});

test('buildCues starts a new cue after a long pause even without punctuation', () => {
  const u = prepare(utt('先打开设置然后选择文件夹', [
    ['先', 0, 0.2], ['打开', 0.2, 0.5], ['设置', 0.5, 0.8], ['然后', 2.0, 2.3], ['选择', 2.3, 2.6], ['文件夹', 2.6, 3.0],
  ]));
  assert.deepEqual(buildCues(u.tokens).map((c) => c.text), ['先打开设置', '然后选择文件夹']);
});

test('suggestCuts marks a phrase said twice in a row as a retake keeping the second take', () => {
  const u = prepare(utt('点击这个点击这个按钮', [
    ['点击', 1.0, 1.3], ['这个', 1.3, 1.6], ['点击', 2.2, 2.5], ['这个', 2.5, 2.8], ['按钮', 2.8, 3.1],
  ]));
  const cuts = suggestCuts([u], 4);
  assert.deepEqual(cuts.map(({ from, to, kind, apply }) => ({ from, to, kind, apply })), [{ from: 1, to: 2.2, kind: 'retake', apply: true }]);
});

test('suggestCuts leaves fluent two-character repeats alone', () => {
  const u = prepare(utt('一个一个地拖进去', evenly(['一个', '一个', '地', '拖', '进去'], 0.5)));
  assert.deepEqual(suggestCuts([u], 2), []);
});

test('suggestCuts detects an abandoned and restarted utterance', () => {
  const first = prepare(utt('我们打开设置', evenly(['我们', '打开', '设置'], 1.0)));
  const second = prepare(utt('我们打开设置页面，选择文件夹。', evenly(['我们', '打开', '设置', '页面', '选择', '文件夹'], 2.0)));
  const cuts = suggestCuts([first, second], 3.5);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].kind, 'retake');
  assert.deepEqual([cuts[0].from, cuts[0].to], [1, 2]);
});

test('suggestCuts proposes long pauses and dead head and tail, unapplied', () => {
  const u = prepare(utt('第一句第二句', [['第一句', 2.0, 2.6], ['第二句', 5.0, 5.6]]));
  const cuts = suggestCuts([u], 10);
  assert.deepEqual(cuts.map(({ from, to, kind }) => ({ from, to, kind })), [
    { from: 0, to: 1.4, kind: 'head' },
    { from: 3, to: 4.6, kind: 'pause' },
    { from: 6.8, to: 10, kind: 'tail' },
  ]);
  assert.ok(cuts.every((c) => c.apply === undefined));
});

test('dropCut keeps the first take of a retake out of the captions', () => {
  const u = prepare(utt('点击这个点击这个按钮', [
    ['点击', 1.0, 1.3], ['这个', 1.3, 1.6], ['点击', 2.2, 2.5], ['这个', 2.5, 2.8], ['按钮', 2.8, 3.1],
  ]));
  const kept = dropCut([u], suggestCuts([u], 4));
  assert.deepEqual(buildCues(kept[0].tokens).map((c) => c.text), ['点击这个按钮']);
  assert.deepEqual(dropCut([u], [{ from: 0, to: 4 }]), []);
});

test('keepRanges merges overlapping cuts and ignores slivers', () => {
  assert.deepEqual(keepRanges(10, [{ from: 2, to: 4 }, { from: 3.5, to: 5 }, { from: 9.97, to: 12 }]), [[0, 2], [5, 10]]);
  assert.deepEqual(keepRanges(10, [{ from: 4, to: 4.03 }]), [[0, 10]]);
  assert.deepEqual(keepRanges(10, [{ from: 0, to: 10 }]), []);
});

test('retime maps cues through the cuts, drops cut cues, and holds without overlapping', () => {
  const keep = keepRanges(10, [{ from: 2, to: 4 }]);
  const cues = retime([
    { text: '甲', start: 0.5, end: 1.6 },
    { text: '被剪掉', start: 2.2, end: 3.8 },
    { text: '乙', start: 4.2, end: 5.0 },
    { text: '丙', start: 7.0, end: 7.9 },
  ], keep, 8);
  assert.deepEqual(cues.map((c) => c.text), ['甲', '乙', '丙']);
  assert.equal(cues[0].start, 0.5);
  assert.ok(Math.abs(cues[0].end - 2.1) < 1e-9);
  assert.ok(Math.abs(cues[1].start - 2.2) < 1e-9);
  assert.ok(Math.abs(cues[1].end - 3.5) < 1e-9);
  assert.ok(Math.abs(cues[2].end - 6.4) < 1e-9);
  assert.ok(Math.abs(retime([{ text: '丁', start: 9, end: 9.9 }], keep, 8)[0].end - 7.92) < 1e-9);
});
