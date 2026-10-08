---
name: product-demo-video
description: Produce animated feature demo and promo videos for the user's own software by mounting its real UI components in a browser stage, driving their state from a seekable script, and pairing it with a flat explainer layer (mechanism illustrations, leaders, live counts) plus cursor, camera push-ins, spotlight, captions, and a brand intro/outro choreographed with GSAP, rendered to 16:9 MP4 with HyperFrames. Voice capability is ready through the verified Doubao bidirectional TTS call. Use when the user wants a product demo, feature walkthrough, explainer, or promo video that goes beyond a plain screen recording, especially for Obsidian plugins or other Svelte/React web UIs whose source is available.
---

# Product demo video

Rebuild the product's UI from its **real components** instead of recording the screen: every frame is crisp, deterministic, re-renderable after UI changes, and can be re-cut per language or aspect ratio. Results shown on screen come from the product's own logic running on a real data snapshot, so the demo never lies. Beside the UI, an **explainer layer** shows the mechanism the viewer is watching (a filter funnel, a stream narrowing), drawn from the same live state.

## Choose the approach first

| Situation | Approach |
|---|---|
| Source available; view components are mostly props → view | This skill: real components + scripted state + explainer |
| Only the binary, or the flow depends on OS/native UI | Screen recording as `<video>` in HyperFrames + GSAP overlays (mask rounded corners with `overflow: hidden` + `border-radius` on a wrapper; zoom an inner layer) |
| One-off, speed over polish | Auto-zoom recorder or a manual editor |

Agree with the user before building:

- **Format**: landscape 1920 × 1080 at 60 fps is the default (Bilibili, Xiaohongshu). Vertical 1080 × 1920 only on request.
- **Series or single video**, captions, and the brand lines. Voice capability is ready: narration uses the verified Doubao bidirectional TTS call in [references/voice.md](references/voice.md). Captions stay the spoken text.
- **Storyboard**: 4–6 beats. Each beat has one numbered caption, the UI action, and the explainer reaction it triggers.
- **Length**: 25–30 s of effective demo per episode (first UI motion to the outro hand-off), plus a ≈ 2 s intro and ≈ 4.8 s outro.

## Architecture

```text
data snapshot ──► demo host ──► real root component ──► platform shell ──► Director ──► HyperFrames composition ──► MP4
(real notes,      (replaces the    (mounted with        (DOM ancestry +   (seekable      (UI viewport + explainer layer,
 settings,         app's host;      a model the host     exported theme,   replay of      cursor, camera, spotlight,
 timestamps)       derives state    publishes)           hover mirror)     timed steps)   captions, GSAP timeline)
                   with the app's
                   own functions)
```

Non-negotiable rules:

1. **State is a function of time.** UI state changes only through Director steps (`click`, `hover`, `type`, `call`). A forward seek applies new steps; a backward seek remounts and replays. Never mutate the stage from GSAP callbacks. The panel at time t must not depend on how the seek got there: render workers jump straight into their range, so anything the UI settles asynchronously (a `ResizeObserver`, a `requestAnimationFrame`) has to settle synchronously after each step. The template's Director does this for `ResizeObserver` (`settled-resize.ts`).
2. **Never hand-write results.** Filtering, search, sorting, previews, and counts must come from the product's own functions over the snapshot. That includes every number, title, and layer in the explainer: read them with `director.read(time, …)`.
3. **Use real DOM events** (`element.click()`, `input` events) so component-internal state is authentic. Host callbacks record intent; the scene decides when to commit (e.g. the moment a debounced search would fire).
4. **Measure, then choreograph.** After `document.fonts.ready`, use `director.measure(time, target, origin)` to get element boxes, then bake them into the GSAP timeline.
5. **No wall clock, randomness, or blinking.** Hide the native caret; drive hover styles through the `.demo-hover` mirror instead of `:hover`. Scatter comes from a fixed per-index jitter, never `Math.random` or `stagger: { from: "random" }`.
6. **Visible state is tweened or set, never written in callbacks.** HyperFrames may seek with events suppressed, so text or classes changed in `onUpdate`/`onComplete` go stale. Use transforms (e.g. a rolling number strip), `tl.set`, or Director steps.

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
- [ ] 4. Storyboard: beats, captions, explainer reactions; pick demo data that tells the story
- [ ] 5. Episode: steps + explainer + timeline; iterate with quick frames
- [ ] 6. Brand intro/outro
- [ ] 7. Render with HyperFrames; verify frames from the MP4
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
| `src/episodes/example/main.ts`, `episodes/example/index.html` | A complete 19.7 s landscape episode: intro, search demo with a mirrored card-stream explainer (leader, typed pill, rolling count, drop and gather, twin lift), outro | Steps, captions, explainer, timing |
| `scripts/*.mjs` | Snapshot, theme import, build, wordmark, preview/screenshot/inspect tools, HyperFrames wrapper | Paths, font list |

Copy the product's brand icon (e.g. the site favicon) and brand font rather than inventing new ones.

**3. Stage.** Mount the real root component inside the shell on a dev page (`stage.html` + `npm run dev`) at the reference screenshot's CSS size. Compare side by side until line wrapping matches exactly:

```bash
SCROLLBARS=1 node scripts/shot.mjs "http://127.0.0.1:5173/stage.html" renders/stage.png 578 850 2
ffmpeg -v error -y -i theme/reference.jpg -i renders/stage.png \
  -filter_complex "[0:v]scale=1156:1700[a];[1:v]scale=1156:1700[b];[a][b]hstack" renders/compare.png
```

Wrapping differences are usually a missing scrollbar gutter, wrong DOM order in the shell, or a missing font. `scripts/inspect.mjs` prints boxes and computed styles; `scripts/eval.mjs` evaluates expressions in the page.

**4. Storyboard.** Choose data that makes the mechanism visible: a search that leaves 2–3 of 14 notes reads as narrowing, while one that leaves 9 does not. Check candidates against the snapshot, then confirm in the stage with the product's own functions. For a new explainer, show the user a still sample (`scripts/shot.mjs` on a dev page) before animating it.

**5. Episode.** Script steps with the Director, read explainer data, measure targets, then build the timeline. Layout, motion-feel numbers, and patterns are in [references/motion.md](references/motion.md). Iterate in seconds, not minutes:

```bash
npm run build && node scripts/frames.mjs <episode> 0,2.5,5,8,12          # needs npm run dev
CROP=1920:1080:0:0 node scripts/frames.mjs <episode> 7.7 renders/f.png   # one frame at full size
```

**6. Brand.** Intro: final brand layout, static at frame 0 (doubles as the cover), with only the topic line fading in, then a hand-off to the demo. Outro: animated logo + write-on wordmark + tagline. Details in [references/motion.md](references/motion.md#brand-intro-and-outro).

**7. Render and verify.** Integration specifics and pitfalls are in [references/hyperframes.md](references/hyperframes.md).

```bash
npm run hf -- render episodes/<episode> -o renders/<episode>.mp4
ffmpeg -v error -y -i renders/<episode>.mp4 -vf "fps=1/3,scale=480:-1,tile=4x2" -frames:v 1 renders/sheet.png
```

Always inspect frames from the final MP4: parallel workers each seek their own range, so this is the check that the replay model held. A frame that differs from both neighbours while the neighbours match each other means workers disagree on state. For smoothness, also step through a fast beat frame by frame (`-vf "select='between(t\,5\,5.5)',scale=480:-1,tile=6x5"`).

## Reporting to the user

State the output path, duration (effective demo vs. brand), and what each beat shows in the UI and the explainer; list deliberate deviations from the real app (omitted folders, hidden caret, font weight substitutions) and anything not verified against the real DOM.

## Additional resources

- [references/hyperframes.md](references/hyperframes.md): composition contract, seek hook, bundling, browser, render pitfalls
- [references/obsidian.md](references/obsidian.md): theme export, fonts, snapshot, shim, shell DOM, Obsidian-specific pitfalls
- [references/motion.md](references/motion.md): landscape layout, motion feel, explainer and choreography patterns, timing, brand intro/outro
- [references/voice.md](references/voice.md): voice capability is ready; Doubao bidirectional TTS call, credentials file, verified audio settings
