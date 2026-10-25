---
name: product-demo-video
description: Produce animated feature demo and promo videos for the user's own software by mounting its real UI components in a browser stage, driving their state from a seekable script, and pairing it with a flat explainer layer (mechanism illustrations, leaders, live counts) plus cursor, camera push-ins, spotlight, captions, and a brand intro/outro choreographed with GSAP, narrated with Doubao TTS over a ducked music bed, rendered to 16:9 MP4 with HyperFrames. Also finishes the user's own narrated screen recordings (recorded mode): denoises the voice, captions it with Doubao ASR, suggests retake and pause cuts, and joins the clips with brand chapter cards that summarize the next clip. Use when the user wants a product demo, feature walkthrough, explainer, or promo video, especially for Obsidian plugins or other Svelte/React web UIs whose source is available, or wants one or more self-recorded videos denoised, subtitled, trimmed, and joined with transition cards.
---

# Product demo video

Rebuild the product's UI from its **real components** instead of recording the screen: every frame is crisp, deterministic, re-renderable after UI changes, and can be re-cut per language or aspect ratio. Results shown on screen come from the product's own logic running on a real data snapshot, so the demo never lies. Beside the UI, an **explainer layer** shows the mechanism the viewer is watching (a filter funnel, a stream narrowing), drawn from the same live state.

## Choose the approach first

| Situation | Approach |
|---|---|
| The user recorded the clips with their own voice and wants them finished | **Recorded mode**: follow [references/recorded.md](references/recorded.md); the stage, storyboard, and TTS workflow below does not apply |
| Source available; view components are mostly props → view | This skill: real components + scripted state + explainer |
| Only the binary, or the flow depends on OS/native UI | Screen recording as `<video>` in HyperFrames + GSAP overlays (mask rounded corners with `overflow: hidden` + `border-radius` on a wrapper; zoom an inner layer) |
| One-off, speed over polish | Auto-zoom recorder or a manual editor |

**Recorded mode** in short: put the takes in `records/`, write `recorded/<id>/project.json`, then

```text
- [ ] 1. rec:audio      DeepFilterNet denoise, static gain to -16 LUFS (the user's own voice is kept)
- [ ] 2. rec:asr        Doubao ASR on the original take, with hotwords
- [ ] 3. rec:captions   one-line cues, fillers removed; retake / pause / head / tail cut suggestions
- [ ] 4. Review with the user: proofread cues, confirm cuts, write each chapter title + summary from the next clip
- [ ] 5. rec:cards      intro, a 3 s chapter card before every clip (part n/total, title, summary), outro, rendered with HyperFrames
- [ ] 6. rec:assemble   --draft first, then full: cuts, crossfades, burned captions, optional ducked bed, .srt
```

Music is off by default; ask whether the user wants the series bed under their voice.

Agree with the user before building:

- **Format**: landscape 1920 × 1080 at 60 fps is the default (Bilibili, Xiaohongshu). Vertical 1080 × 1920 only on request.
- **Series or single video**, captions, and the brand lines.
- **Voice, every episode**: ask the user for the TTS speaker id before synthesizing anything. Never reuse the last episode's voice or an env default. Audition one line before synthesizing the rest ([references/voice.md](references/voice.md#voice-ask-every-episode)).
- **Narration**: each caption is its spoken line; a line may override only its pronunciation (`say`). The intro speaks the plugin name plus the episode topic; the outro is not narrated.
- **Music**: the series bed is Somewhere Sunny (ver 2) (Kevin MacLeod, CC BY 4.0, credit in the description); change it only if the user asks ([references/voice.md](references/voice.md#choosing-music)).
- **Storyboard**: 4–6 beats. Each beat has one numbered caption (its narration line), the UI action, and the explainer reaction it triggers.
- **Length**: 25–30 s of effective demo per episode (first UI motion to the outro hand-off), plus a ≈ 2–3.5 s intro (as long as its line) and ≈ 4.8 s outro.

## Architecture

```text
data snapshot ──► demo host ──► real root component ──► platform shell ──► Director ──► HyperFrames composition ──► MP4
(real notes,      (replaces the    (mounted with        (DOM ancestry +   (seekable      (UI viewport + explainer layer,
 settings,         app's host;      a model the host     exported theme,   replay of      cursor, camera, spotlight,
 timestamps)       derives state    publishes)           hover mirror)     timed steps)   captions, GSAP timeline,
                   with the app's                                              ▲           voice + music <audio> tracks)
                   own functions)                                              │
narration lines ──► TTS takes ──► scene clock (beat lengths from take durations) ┘
```

Non-negotiable rules:

1. **State is a function of time.** UI state changes only through Director steps (`click`, `hover`, `type`, `call`). A forward seek applies new steps; a backward seek remounts and replays. Never mutate the stage from GSAP callbacks. The panel at time t must not depend on how the seek got there: render workers jump straight into their range, so anything the UI settles asynchronously (a `ResizeObserver`, a `requestAnimationFrame`) has to settle synchronously after each step. The template's Director does this for `ResizeObserver` (`settled-resize.ts`).
2. **Never hand-write results.** Filtering, search, sorting, previews, and counts must come from the product's own functions over the snapshot. That includes every number, title, and layer in the explainer: read them with `director.read(time, …)`.
3. **Use real DOM events** (`element.click()`, `input` events) so component-internal state is authentic. Host callbacks record intent; the scene decides when to commit (e.g. the moment a debounced search would fire).
4. **Measure, then choreograph.** After `document.fonts.ready`, use `director.measure(time, target, origin)` to get element boxes, then bake them into the GSAP timeline.
5. **No wall clock, randomness, or blinking.** Hide the native caret; drive hover styles through the `.demo-hover` mirror instead of `:hover`. Scatter comes from a fixed per-index jitter, never `Math.random` or `stagger: { from: "random" }`.
6. **Visible state is tweened or set, never written in callbacks.** HyperFrames may seek with events suppressed, so text or classes changed in `onUpdate`/`onComplete` go stale. Use transforms (e.g. a rolling number strip), `tl.set`, or Director steps.
7. **The voice sets the clock.** Beat lengths come from the synthesized takes through the episode's `clock.ts`; never hand-tune a beat shorter than its line. `<audio>` tracks are static HTML written by the build from that clock, never inserted or retimed by `main.ts`.

## Explainer layer

The UI is the evidence; the explainer is the reading aid. Layout and recipes are in [references/motion.md](references/motion.md).

- **Explain what the user can perceive**, not how it is implemented. A filter funnel, cards dropping out of the stream, pins reordering without bypassing filters: yes. Search indexes, debouncing, virtualization internals: no. Test: could a user confirm the claim by looking at the UI?
- **The UI causes, the explainer reacts.** Every explainer change is keyed to the Director step that causes it, 0.05–0.35 s after it, never ahead of it.
- **Tie them together**: a leader from the measured UI element to its explainer twin, a mirrored value (the typed query, a filter chip), or a twin that lifts while the real element is spotlighted. Draw leaders only while the camera is at rest.
- **Style: flat geometric.** Theme variables (`--interactive-accent`, `--accent-h/s/l`, `--text-normal/muted`), white rounded cards with soft shadows, layers as steps of accent lightness, lucide icons. No textures, hand-drawn strokes, or 3D/isometric.
- **Interludes**: when a mechanism needs the whole canvas, shrink the UI aside for one full-width concept beat (3–5 s, at most one per episode), then return to the same UI state.

## Motion feel: silky and lively

**Silky**: 60 fps; long-tail eases (`expo.out`, `power3.inOut`) instead of linear or `power1`; overlapping beats; no dead freeze over ~1 s, because an ambient background drift and idle float keep the frame alive. **Lively**: small elements (≤ ~120 px: chips, badges, dots, mini cards) pop with `back.out`, cascade with staggers, fall with gravity and rotation, and count with a rolling strip. Large surfaces (viewport, camera, explainer panels) never overshoot. Numbers are in [references/motion.md](references/motion.md#motion-feel).

## Workflow

```text
- [ ] 1. Capture the environment: theme export, reference screenshot, app settings, data snapshot
- [ ] 2. Scaffold the video project from templates/
- [ ] 3. Stage: shim + host + shell; match the reference screenshot line for line
- [ ] 4. Storyboard: beats, captions (= narration lines), explainer reactions; pick demo data that tells the story
- [ ] 5. Voice and music: ask the speaker, audition one line, synthesize; normalize the chosen bed
- [ ] 6. Episode: clock from the takes, steps + explainer + timeline; iterate with quick frames
- [ ] 7. Brand intro/outro
- [ ] 8. Render with HyperFrames, master the loudness; verify frames and sound from the MP4
```

**1. Capture.** For Obsidian, follow [references/obsidian.md](references/obsidian.md): export every live stylesheet plus body classes from devtools, take a sidebar screenshot, read the plugin's `data.json`, snapshot the demo vault with true creation times. For other apps, capture the equivalent: computed theme, container DOM ancestry, settings, data.

**2. Scaffold** a separate project (keep the product repo clean) by copying `templates/`:

| Template | Role | Adapt |
|---|---|---|
| `vite.config.ts`, `tsconfig.json` | Alias the platform module to the shim, `@plugin` to the product's `src`; dedupe the UI runtime | Product path |
| `src/shims/obsidian.ts` | Browser stand-in for the platform API (`setIcon` via lucide, `TFile`, `getAllTags`, …) | Per platform |
| `src/stage/demo-vault.ts` | Snapshot → fake `App` + metadata cache | Per platform |
| `src/stage/demo-host.ts` | Replaces the product's view host; derives panel state (cards, navigation, tag/property filters, search) with product functions | Per product |
| `src/stage/obsidian-shell.ts` | Container DOM, theme meta, scrollbar gutter, hover mirror, focus-ring suppression, mount | Per platform |
| `src/stage/director.ts` | Seekable step replay, `measure` / `measureAll`, `read` for explainer data | Reuse as is |
| `src/stage/brand.ts` | Logo + wordmark rendering and animation | Logo geometry and colors |
| `src/stage/narration.ts` | Take manifest types, `sequence` (beats from take lengths), music duck lane, `BGM_LEVELS` | Levels after the first reviewed episode |
| `src/episodes/example/audio.json` | Speaker (empty until the user picks one), narration lines, music bed | Per episode |
| `src/episodes/example/clock.ts` | DOM-free scene clock `T`, `CAPTIONS`, `AUDIO_PLAN` from `voice.json` | Beats, `min` per beat, offsets |
| `src/episodes/example/main.ts`, `episodes/example/index.html` | A complete narrated landscape episode: spoken intro, search demo with a mirrored card-stream explainer (leader, typed pill, rolling count, drop and gather, twin lift), outro under music | Steps, explainer |
| `scripts/tts.mjs` | Synthesizes `audio.json` lines (raw takes billed once), trims their silence, sets them to -21 LUFS, writes `voice.json` | Reuse as is |
| `scripts/loudnorm.mjs` | Two-pass loudness: the music bed before build, the final MP4 after render | Reuse as is |
| `scripts/build-episodes.mjs` | Bundles episodes; writes `<audio>` tracks and `data-duration` from `clock.ts` | Reuse as is |
| `scripts/rec-*.mjs`, `recorded-lib.mjs`, `recorded-text.mjs`, `src/recorded/card.{html,ts}` | Recorded mode: audio, ASR, captions and cuts, cards, assembly ([references/recorded.md](references/recorded.md)) | Reuse as is |
| `scripts/*.mjs` (others) | Snapshot, theme import, wordmark, preview/screenshot/inspect tools, HyperFrames wrapper | Paths, font list |

Copy the product's brand icon (e.g. the site favicon) and brand font rather than inventing new ones.

**3. Stage.** Mount the real root component inside the shell on a dev page (`stage.html` + `npm run dev`) at the reference screenshot's CSS size. Compare side by side until line wrapping matches exactly:

```bash
SCROLLBARS=1 node scripts/shot.mjs "http://127.0.0.1:5173/stage.html" renders/stage.png 578 850 2
ffmpeg -v error -y -i theme/reference.jpg -i renders/stage.png \
  -filter_complex "[0:v]scale=1156:1700[a];[1:v]scale=1156:1700[b];[a][b]hstack" renders/compare.png
```

Wrapping differences are usually a missing scrollbar gutter, wrong DOM order in the shell, or a missing font. `scripts/inspect.mjs` prints boxes and computed styles; `scripts/eval.mjs` evaluates expressions in the page.

**4. Storyboard.** Choose data that makes the mechanism visible: a search that leaves 2–3 of 14 notes reads as narrowing, while one that leaves 9 does not. Check candidates against the snapshot, then confirm in the stage with the product's own functions. For a new explainer, show the user a still sample (`scripts/shot.mjs` on a dev page) before animating it. Write each beat's caption as the line to be spoken, and the intro line as the plugin name plus the topic; agree on them with the user before any synthesis, since every changed line is billed again.

**5. Voice and music.** Details in [references/voice.md](references/voice.md).

```bash
npm run tts -- <episode> --line <first beat id>   # audition, after the user named the speaker
npm run tts -- <episode>                          # the rest, once the voice is confirmed
node scripts/loudnorm.mjs "audio/source/Somewhere Sunny (ver 2).mp3" audio/bgm/somewhere-sunny.mp3 --lufs=-21 --from=0 --for=<T.end>
```

**6. Episode.** Lay out the beats in `clock.ts` from the takes, script steps with the Director, read explainer data, measure targets, then build the timeline. Layout, motion-feel numbers, and patterns are in [references/motion.md](references/motion.md). Iterate in seconds, not minutes (quick frames are silent):

```bash
npm run build && node scripts/frames.mjs <episode> 0,2.5,5,8,12          # needs npm run dev
CROP=1920:1080:0:0 node scripts/frames.mjs <episode> 7.7 renders/f.png   # one frame at full size
```

**7. Brand.** Intro: final brand layout, static at frame 0 (doubles as the cover), with only the topic line fading in while the intro line is spoken, then a hand-off to the demo. Outro: animated logo + write-on wordmark + tagline. Details in [references/motion.md](references/motion.md#brand-intro-and-outro).

**8. Render and verify.** Integration specifics and pitfalls are in [references/hyperframes.md](references/hyperframes.md).

```bash
npm run hf -- render episodes/<episode> -o renders/<episode>.mp4
node scripts/loudnorm.mjs renders/<episode>.mp4 renders/<episode>.final.mp4 --lufs=-16
ffmpeg -v error -y -i renders/<episode>.final.mp4 -vf "fps=1/3,scale=480:-1,tile=4x2" -frames:v 1 renders/sheet.png
```

Check the sound as in [references/voice.md](references/voice.md#verify): one audio stream, about -16 LUFS, and each line starting with its caption. Always inspect frames from the final MP4: parallel workers each seek their own range, so this is the check that the replay model held. A frame that differs from both neighbours while the neighbours match each other means workers disagree on state. For smoothness, also step through a fast beat frame by frame (`-vf "select='between(t\,5\,5.5)',scale=480:-1,tile=6x5"`).

## Reporting to the user

State the output path, duration (effective demo vs. brand), and what each beat shows in the UI and the explainer; the speaker id, characters billed in this run, voice seconds, the music track with its license, and the measured loudness; list deliberate deviations from the real app (omitted folders, hidden caret, font weight substitutions) and anything not verified against the real DOM.

For recorded mode, report the output and `.srt` paths, the final duration and each segment's length, the cuts applied and declined, the corrections made to the captions, ASR minutes billed in this run, and the measured loudness.

## Additional resources

- [references/recorded.md](references/recorded.md): recorded mode (the user's own takes): project.json, pipeline, review step, setup, recording tips, verification, lessons
- [references/hyperframes.md](references/hyperframes.md): composition contract, seek hook, bundling, browser, render pitfalls
- [references/obsidian.md](references/obsidian.md): theme export, fonts, snapshot, shim, shell DOM, Obsidian-specific pitfalls
- [references/motion.md](references/motion.md): landscape layout, motion feel, explainer and choreography patterns, timing, brand intro/outro
- [references/voice.md](references/voice.md): narration and music pipeline (speaker choice, lines, timing from takes, music bed and ducking, mastering, verification) and the Doubao TTS and ASR protocols and credentials
