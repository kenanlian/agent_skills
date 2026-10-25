# Recorded mode

The user records one or more screen recordings with their own voice; the pipeline cleans the voice, captions it, suggests cuts, and joins the clips with brand cards that summarize what comes next. The user's own voice is kept: in testing, ElevenLabs voice change lost intelligibility wherever the pronunciation was loose, and TTS laid onto the ASR timestamps sounded disjointed.

## Contents

- [Layout](#layout)
- [project.json](#projectjson)
- [Pipeline](#pipeline)
- [Review step](#review-step)
- [Setup](#setup)
- [Recording tips](#recording-tips)
- [Verify](#verify)
- [Lessons](#lessons)

## Layout

```text
records/                       raw recordings (gitignored; large)
recorded/<id>/project.json     clips, titles, summaries, hotwords, corrections, theme
recorded/<id>/captions.json    proofread cues + cut decisions (the source of truth; commit it)
recorded/<id>/work/            generated: orig/clean wav, asr.json (billed, cached), freeze.json, cards/, captions.ass
fonts/                         the caption font (gitignored; licensed)
renders/<id>.final.mp4, renders/<id>.srt
```

## project.json

```json
{
  "title": "快速输入",
  "subtitle": "功能讲解",
  "kicker": "CARD WORKSPACE · 功能讲解",
  "tagline": "汇集，整理，重构 —— 理解",
  "theme": { "accent": [199.5, 90.6, 45.9], "font": "霞鹜文楷" },
  "hotwords": ["Card Workspace", "Obsidian", "快速输入"],
  "corrections": { "Color Workspace": "Card Workspace" },
  "clips": [
    { "id": "01", "file": "records/open.mp4", "title": "打开快速输入", "summary": "点击小飞机按钮，弹出可以随手记录的输入框" },
    { "id": "02", "file": "records/save.mp4", "title": "内容保存到哪里", "summary": "发送后的笔记会存进设置里指定的文件夹" }
  ]
}
```

| Field | Use |
|---|---|
| `title`, `subtitle` | Intro card: wordmark, then the title (topic) and subtitle |
| `kicker` | Small accent line on each chapter card; default `title` |
| `tagline` | Outro line under the written wordmark |
| `theme.accent` | The app's accent as `[h, s, l]`; required. Read it from a built episode: `node scripts/eval.mjs <url> "getComputedStyle(document.body).getPropertyValue('--accent-h')"` (and `-s`, `-l`) |
| `theme.font` | Card font family, loaded from `theme/fonts.css` (the interface font) |
| `hotwords` | ASR context: product names and UI terms |
| `corrections` | Exact replacements applied to cue text, keyed by what ASR wrote (see the `asr:` column of the review listing). Hotwords alone did not fix a misheard product name; this map does |
| `clips[].id`, `file` | Clip order is the video order; `file` is relative to the project root |
| `clips[].title`, `summary` | The chapter card before that clip; required for every clip |
| `chapterSeconds` | Each chapter card's share of the final timeline; default `3` (minimum 1.6) |
| `chapters` | `false` drops the chapter cards |
| `intro`, `outro` | `false` drops that card |
| `transition` | Crossfade seconds between segments; default `0.4` |
| `size`, `fps` | Output size; default the first clip's size, 60 fps |
| `captions` | `{ font, fontsDir, size, marginV }`; default HarmonyOS Sans SC from `fonts/`, 4.2 % of the height, 6 % bottom margin |
| `bgm` | Optional music bed `{ file, offset, volume }`, off by default; `volume` default `0.35`, ducked under the voice |

## Pipeline

```bash
npm run rec:audio -- <id>      # DeepFilterNet denoise + static gain to -16 LUFS → work/<clip>.clean.wav
npm run rec:asr -- <id>        # Doubao ASR on the original audio → work/<clip>.asr.json (billed once, cached)
npm run rec:captions -- <id>   # cues + cut suggestions → captions.json (or captions.draft.json if it exists)
# review step (below)
npm run rec:cards -- <id>      # intro / chapter / outro cards with HyperFrames → work/cards/
npm run rec:assemble -- <id> --draft   # 1280 px fast preview → renders/<id>.draft.mp4
npm run rec:assemble -- <id>           # full size, mastered → renders/<id>.final.mp4 + renders/<id>.srt
```

Each step takes `--clip <id>` where it makes sense (`rec:audio`, `rec:asr`) and skips unchanged work. Two clips of about 1 min each took 31 s for the draft and 84 s for the full assembly; the cards took about 37 s.

- **rec:audio** prints loudness before and after and `voiceOverFloor` (integrated loudness minus the 5th percentile of momentary loudness; higher is cleaner). DeepFilterNet raised it from 31 to 54 dB on a noisy take. If the voice sounds hollow, retry with `--atten 30`.
- **rec:asr** reads `work/<clip>.orig.wav`, not the clean one (see [voice.md](voice.md#capability-asr-protocol)).
- **rec:captions** removes hesitation fillers (呃 嗯 额 唔 always; 啊 哦 噢 only when isolated), groups words into sentences, and splits each to one line of at most 17 CJK-width characters at punctuation, pauses, and word boundaries, never inside a Latin run. Cut suggestions:

| Kind | Detected | `apply` default |
|---|---|---|
| `retake` | A phrase said twice in a row, or an utterance abandoned and restarted; keeps the second take | `true` |
| `pause` | Silence over 1.5 s, keeping 0.4 s each side | `true` only if the screen is static across it |
| `head`, `tail` | Over 1.5 s before the first word, 2.2 s after the last | same |

A cut over a static screen (ffmpeg `freezedetect`) is invisible; over a moving screen it jumps, so it is proposed but not applied. The first take of a retake is also left out of the captions.

- **rec:cards** puts a chapter card before every clip, 3 s on the final timeline by default (`chapterSeconds`; the file is one crossfade longer, since the crossfades overlap it). Everything is in by about 0.4 s and fully readable for about 2.1 s; all text leaves before the outgoing crossfade, so only the card's background dissolves into the recording. At 2 s only about 1.2 s is left to read the summary. Review the PNG stills in `work/cards/` before assembling.
- **rec:assemble** is one ffmpeg pass: cuts with 10 ms audio fades, crossfades, captions retimed onto the final timeline (each held 0.5 s for reading, never overlapping the next), the optional ducked bed, then `loudnorm.mjs` to -16 LUFS.

## Review step

The draft captions and cuts are proposals; go through them with the user before rendering cards.

1. Show the `rec:captions` listing: each cue with its time and, where corrections changed it, the ASR text.
2. Fix misheard terms. A term that recurs belongs in `corrections` (then `rec:captions --force`); a one-off is edited in `captions.json` directly. Edits in `captions.json` survive: a re-run without `--force` writes `captions.draft.json` instead.
3. Confirm each cut. Flip `apply` as the user decides; a rejected retake needs its first-take words put back into the cue text by hand.
4. Write each chapter `title` (≤ 8 characters) and `summary` (one sentence, ≤ 24 characters, readable in the card's 2.1 s) from the **next** clip's captions: what the viewer is about to see, phrased as an outcome ("发送后的笔记会存进设置里指定的文件夹"), not a restatement of the title. Agree on them with the user.

## Setup

- **Project**: the series' existing video project, or one scaffolded from `templates/` (step 2 of the main workflow). Recorded mode needs its brand (`src/stage/brand.ts`, `src/generated/wordmark.json` from `npm run build:wordmark`), `theme/fonts.css` from `npm run import:theme`, and the `rec-*` scripts.
- **DeepFilterNet**: the standalone binary, no Python or model download. `rec:audio` prints the install command when it is missing:
  `curl -L -o ~/.local/share/deepfilter/deep-filter https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-x86_64-unknown-linux-musl && chmod +x ~/.local/share/deepfilter/deep-filter` (override the path with `DEEP_FILTER`).
- **ASR credentials**: shared with TTS in `~/.config/volc-tts/env`; the account needs the 豆包录音文件识别 resource ([voice.md](voice.md#capability-asr-protocol)).
- **Caption font**: a bold CJK sans copied into `fonts/` (gitignored). On Windows/WSL: `cp /mnt/c/Windows/Fonts/HarmonyOS_Sans_SC_Bold.ttf fonts/`. Another family works through `project.captions.font`; `rec:assemble` checks the family with `fc-scan` before encoding.

## Recording tips

Tell the user before they record:

- One topic per clip; the chapter card announces it, so no spoken "接下来我们看…" is needed.
- Hold the mouse still for a moment before speaking and after the last sentence: head and tail cuts are only applied over a static screen.
- After a slip, pause, then repeat the whole phrase; the retake detector keeps the second take.
- A quiet room and a close microphone still matter: denoising removes hum and hiss, not echo.
- Same window size for every clip; 16:9 avoids letterboxing (`rec:cards` warns otherwise).

## Verify

- `rec:assemble` prints each segment's start and length; the final duration should be the sum minus one crossfade per join.
- Frame sheet across the joins and one caption at full size:
  `ffmpeg -v error -y -i renders/<id>.final.mp4 -vf "select='eq(n\,180)+eq(n\,2500)',scale=640:-2,tile=2x1" -frames:v 1 -vsync 0 renders/sheet.png` (frame numbers = seconds × fps). Mid-crossfade frames should show only the card background and the recording, never card text over the UI.
- Loudness of the final MP4 about -16 LUFS, true peak under -1 dBTP; listen at each cut for clicks or clipped words.
- Captions start with their words; open the `.srt` next to the video for spot checks.

## Lessons

| Tried | Result |
|---|---|
| ElevenLabs voice changer | Intelligibility dropped wherever pronunciation was loose |
| Doubao TTS on the ASR timestamps | Each line fine, the whole disjointed; the user preferred their own voice |
| RNNoise (`arnndn`) | Pulled the voice down 8–23 dB along with the noise |
| `afftdn`, notch filters on the 125/250 Hz hum | Little effect; notches rang |
| Dynamic `loudnorm` on the voice | Raised the noise in every gap; use one static gain under a limiter |
| ASR on the denoised audio | Whole phrases turned to nonsense; the raw take came back nearly clean |
| Whisper large-v3 (local) | Dropped Chinese words; 3 GB download |
| Hotwords for a misheard product name | Not enough; `corrections` fixes it |
