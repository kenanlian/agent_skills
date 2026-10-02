# HyperFrames integration

HyperFrames renders an HTML composition by seeking it frame by frame in headless Chrome and encoding with FFmpeg. Requirements: Node ≥ 22, FFmpeg, `npm i -D hyperframes gsap`.

## Browser

`npx hyperframes browser ensure` downloads chrome-headless-shell and can be very slow on some networks. Point `HYPERFRAMES_BROWSER_PATH` at an existing headless shell instead (Playwright caches one under `~/.cache/ms-playwright/chromium_headless_shell-*/`). `templates/scripts/browser-path.mjs` resolves it; `templates/scripts/hf.mjs` wraps the CLI with it:

```bash
npm run hf -- snapshot episodes/<id> --at 2,5,8 --no-end --describe false -o renders/snap
npm run hf -- render episodes/<id> -o renders/<id>.mp4
```

A headless shell gives `beginframe` capture; regular Chrome falls back to slower screenshot capture.

## Composition contract

```html
<div id="root" data-composition-id="search" data-start="0"
     data-width="1920" data-height="1080" data-fps="60" data-duration="19.7"> … </div>
<script src="assets/app.js"></script>
```

- `data-duration` is the render length. Keep it equal to the scene clock's `end`.
- `data-fps` sets the render rate (CLI default 30). 60 fps doubles capture time; `--fps 30` gives a quicker check render.
- Register exactly one paused timeline at `window.__timelines["<composition-id>"]`. Building it after `document.fonts.ready` is fine: register only when it is complete.
- Hold capture until async setup finishes: `(window.__hf ??= {}).buildReady ??= {}; window.__hf.buildReady["stage"] = readyPromise;`
- Elements hidden until later: set the initial state with `fromTo` (immediate render) or CSS `opacity: 0`; don't pair a CSS `transform` with a GSAP tween on the same property.
- The static guard may log `Missing window.__timelines registration` when registration lives in a bundle. Harmless.

## Driving stage state per frame

The runtime dispatches an `hf-seek` event on `window` for every new frame time (via its TypeGPU adapter, deduplicated), with `detail.time` and a synchronous `detail.waitUntil(promise)`:

```ts
window.addEventListener("hf-seek", ((event: CustomEvent<{ time: number; waitUntil(p: Promise<unknown>): void }>) => {
  director.seek(event.detail.time);
  event.detail.waitUntil(tick().then(() => tick())); // let Svelte microtasks settle
}) as EventListener);
```

Also call `director.seek(tl.time())` from the timeline's `onUpdate` so Studio preview playback updates too. `Director.seek` is idempotent. Do not await `requestAnimationFrame` inside `waitUntil`: under beginFrame control rAF only fires when a frame is begun.

## Bundling

Build each episode's `main.ts` as an IIFE with Vite library mode into `episodes/<id>/assets/app.js`, and copy the theme CSS and fonts beside it (`templates/scripts/build-episodes.mjs`). Import JSON data (snapshot, theme meta, wordmark) straight into the bundle.

## Pitfalls (all observed)

| Symptom | Cause | Fix |
|---|---|---|
| Page shows raw CSS as text | HyperFrames inlines linked stylesheets into `<style>`; SVG data URIs containing `</style>` end it early | Replace `</style` with `<\/style` in the CSS (same value in CSS strings) |
| Text wraps differently than in the app | Puppeteer's default `--hide-scrollbars`, so scroll containers gain the scrollbar's width | Add `padding-right` equal to the app's scrollbar width (`offsetWidth - clientWidth` measured with scrollbars on) |
| `lint`, `snapshot`, `render` each take ~3 min | Preprocessing a ~1 MB app stylesheet; actual capture is seconds | Iterate with `scripts/frames.mjs` (seeks the timeline in a plain page); render only for final checks |
| `lint` errors about fonts / mask images | Rules for other plugins in the imported app CSS | Ignore; they don't affect the picture |
| `Not inlining … exceeds the 2 MB inline limit` | Large CJK font files | Harmless; they load by URL |
| Measured positions off by a factor | `zoom` on the stage: rects include it | Divide by `frame.getBoundingClientRect().width / cssWidth` when writing CSS px |
| A counter or label shows a stale value in some frames | Text written in `onUpdate`/`onComplete`; the runtime may seek with events suppressed | Roll a strip of pre-rendered values with `y`, or `tl.set` each state |
| Scatter differs between renders or workers | `Math.random` or `stagger: { from: "random" }` | Fixed per-index jitter (see the template's `jitter`) |
| A virtualized list jumps every N-th frame (N = worker count) after a scripted scroll | Row heights come from a `ResizeObserver`, which reports a frame later; a worker that seeks straight in replays the click and scroll in one batch and scrolls in estimated heights | The Director's `settled-resize.ts` observer, flushed after every step; check by comparing a direct seek with a frame-by-frame seek at the same time |
| Render length wrong or the timeline never ends | `repeat: -1` on an idle loop | Finite `repeat`, odd so a `yoyo` ends at rest |
| Leader misses its UI element | Measured after an entrance `fromTo` already offset the viewport, or while the camera is transformed | Measure every box first in `buildTimeline`, and draw leaders only at camera identity |

## Camera, masking, and explainer structure

```html
<div id="viewport">            <!-- fixed frame: overflow hidden, radius, shadow -->
  <div id="camera">            <!-- transform-origin: 0 0; GSAP x / y / scale -->
    <div id="stage"></div>     <!-- zoom: 1.12 (landscape) / 1.7 (vertical) keeps text crisp at any scale -->
    <div id="overlay">…</div>  <!-- cursor, ripple, spotlight, ring: move with the camera -->
  </div>
</div>
<section id="explainer">…</section>  <!-- HTML parts: pills, counts, mini cards -->
<svg id="explainer-svg"></svg>      <!-- full-frame SVG: leaders, funnels; root coordinates -->
```

Measure overlay targets relative to `#camera` and leader endpoints relative to `#root`, both while nothing is transformed (before building the timeline).
