# Motion and layout

The landscape layout and flat explainer style come from an approved 1920 × 1080 style sample. The motion numbers come from the template episode (`templates/src/episodes/example`); tune them on the first reviewed landscape episode, then update this file. Brand intro/outro values come from approved vertical episodes and carry over.

## Layout (1920 × 1080)

| Region | Position |
|---|---|
| Viewport (578 × 850 sidebar at `zoom: 1.12`) | 647 × 952 at (88, 64), radius 14, soft double shadow |
| Title header (kicker 20 px, title 52 px, subtitle 26 px) | left 820, right 80, top 70 |
| Explainer area | 1020 × 640 at (820, 270); its SVG layer spans the whole frame in root coordinates |
| Numbered caption (32 px, 48 px accent step dot) | left 820, right 80, top 962; one line (≤ ~24 CJK characters) |
| Background | `#f3f4f8` with two large faint accent radial blobs that drift slowly |

Text inside the viewport is small at zoom 1.12. Don't push in just to make it legible: mirror the value in the explainer (a typed query pill, a filter chip) and push in only to read card content.

Vertical (1080 × 1920) on request: viewport 983 × 1445 at (49, 330) with `zoom: 1.7`, title 78 px at top 86, caption 38 px at top 1810, no side explainer (use interludes).

Take colors from theme variables (`--interactive-accent`, `--text-normal`, `--text-muted`, `--accent-h/s/l`) so the video matches the captured theme.

## Motion feel

The target is **silky and lively**: continuous, long-tailed motion on large surfaces, springy character on small ones.

| Rule | Default |
|---|---|
| Frame rate | `data-fps="60"` on the root |
| Entrances | `expo.out` 0.8–1.1 s (titles, viewport, explainer head); never `linear` or `power1` |
| Camera, large moves | `power3.inOut` 0.9–1 s; `expo.inOut` 0.85 s for elements returning home |
| Small pops (≤ ~120 px) | `back.out(1.5–2.6)`, 0.4–0.6 s; from scale 0.4–0.86 |
| Cascades | `stagger` 0.03–0.04 s in reading order (never `from: "random"`) |
| Removal | gravity: `power2.in` 0.6 s, y +170–230, rotation ±15°, opacity → 0, after a 0.3 s dim to 0.45 |
| Gather / FLIP | `expo.out` 0.95 s, 0.06 s apart per item |
| Overlap | a beat's explainer reaction starts 0.05–0.35 s after its UI step; the next caption may start before the reaction settles |
| Alive while holding | ambient blob drift over the whole episode (`sine.inOut`); idle float y −5 px, 1.3 s halves, `yoyo`, an even number of halves so it ends at rest, phase-shifted 0.25 s per item |
| Never | overshoot on the viewport, camera, or explainer panels; infinite `repeat` (breaks the duration) |

## Scene clock

Keep all times in one `T` object, and the root `data-duration` equal to `T.end`. When inserting a segment (e.g. an intro), shift the rest instead of retuning:

```ts
const shift = <K extends string>(offset: number, times: Record<K, number>) =>
  Object.fromEntries(Object.entries<number>(times).map(([k, v]) => [k, v + offset])) as Record<K, number>;
const T = { introOut: 1.65, ...shift(2, { titleIn: 0.2, /* … */ endCard: 12.9 }), end: 19.7 };
```

## UI patterns

| Pattern | Recipe |
|---|---|
| Titles / viewport in | `fromTo` y 36 → 0 / 60 → 0, opacity 0 → 1, `expo.out` 0.9 / 1.1 s, 0.1 s stagger |
| Caption swap | in: y 24 → 0, `expo.out` 0.6 s, step dot scale 0.4 → 1 `back.out(2.6)`; out: y → −16, 0.35 s `power2.in`, ending as the next caption starts |
| Cursor move | `glide`: x with `power3.inOut`, y with `power2.inOut`, same duration (0.55–0.65 s), so the path arcs slightly |
| Click | cursor scale 0.82 (0.08 s) → 1 (`back.out(3)`, 0.2 s); ripple from scale 0.2, opacity 0.55 to scale 1.6, opacity 0, `expo.out` 0.6 s; fire the DOM `click` step ~0.05 s after the press |
| Hover | `hover(t, target)` step before the click; remove when the cursor leaves. After a click that re-renders the row, re-apply hover 0.01 s later |
| Typing | `type(t, selector, text)` at ~9 chars/s; commit the search ~0.5 s after the last character |
| Camera push-in | `focusOn(box, 1.4–1.55)` 1 s `power3.inOut`; clamp so no viewport edge is exposed; pull back to identity the same way |
| Spotlight | element over the target with `box-shadow: 0 0 0 3000px rgb(20 24 40 / 0.38)`, fade 0.5 s |
| Emphasis ring | 3 px accent border + 5 px translucent halo, from scale 1.25 with `back.out(2)`, 0.45 s |
| Outro hand-off | viewport, titles, explainer, cursor: y → −30, opacity → 0, 0.5 s `power2.in`, 0.05 s stagger |

## Explainer patterns

| Pattern | Recipe |
|---|---|
| Mirrored stream | One mini card per real record (title from `director.read`), grid in the explainer area. On the UI result: non-matches dim then fall; matches gather into one enlarged row (scale ≤ 1.4, ≤ 4 items, otherwise compact into the first grid slots), then an accent bar grows (`scaleY`, `expo.out`) and a hit badge pops. Clearing reverses it: matches `expo.inOut` home, the rest spring back with `back.out(1.5)` |
| Filter funnel | Two bands: the source (folder) band, then one filter band holding the active condition, narrower, fills at accent lightness 94 / 89 %; each band holds that stage's real card count as mini cards; dropped cards drift off the band edge with `−n`; result chips below. Tag and property filters are peers, not stages: choosing one replaces the other in the same filter band (swap the chip, return the cards, re-narrow), never add a third band. Several chips in the filter band show multi-select, joined by 且 (tags, AND) or 或 (values of one property, OR). Approved as a still; animate it with the stream recipes |
| Rolling count | A strip with one line per value from old to new inside a clipped window; tween its `y` by `−lineHeight × steps` (`power3.out` 0.9 s), then pulse the window scale 1 → 1.12 → 1 |
| Mirrored input | The query as one span per character, each revealed with `tl.set(display)` plus a 0.18 s `back.out` rise at the same times as the Director `type` steps; delete from the end at 0.035 s intervals |
| Leader | Cubic path from the measured UI box (relative to `#root`) to the explainer anchor; draw with `strokeDashoffset` length → 0 (`power2.inOut` 0.7 s), start dot pops first, end dot when the line arrives. Fade it before any camera move |
| Twin lift | While the real element is spotlighted or pushed in on, its explainer twin scales 1.07 with a deeper shadow (`expo.out` 0.6 s), released on pull-back |
| Interlude | Viewport scales to ~0.6 and slides aside (`power3.inOut` 1 s), the concept fills the frame, then everything returns. UI state stays frozen meanwhile (no Director steps). Not built yet: check its frames closely on first use |

Flat style tokens: cards white, radius 12, shadow `0 8px 22px rgb(40 44 70 / 0.1), 0 1px 4px rgb(40 44 70 / 0.08)`; text lines `rgb(40 44 70 / 0.09)`; icon tiles 48 px radius 14 on accent at 12 % alpha; big numbers 44–64 px in accent; muted cards `#d5d8e2` for removed items.

## Timing

A beat that reads well (≈ 5–6 s): caption in → cursor glide 0.6 s → hover 0.3 s → click → UI result → explainer reaction (0.05–0.35 s later, ~1 s to settle) → hold ≥ 1.5 s with idle motion → next caption. Five beats fill the 25–30 s demo.

The template's 12.9 s demo: title 0.2, explainer 0.7, cursor in 1.3, click 2.4, leader 2.95, type 3.4, commit 4.4, drop 4.75, gather 5.05, hits 5.6, spotlight 6.4, push-in 6.9 → 8.9, clear 10.85, restore 10.9, outro 12.4.

## Brand intro and outro

Use the product's real icon (e.g. the site favicon) and brand font. `templates/src/stage/brand.ts` implements both animations. Landscape sizes: logo 150 px, wordmark 560 px wide, tagline 32 px.

**Intro** (≈ 2 s): icon, wordmark, and a topic line such as "在 Obsidian 中更好地搜索". The icon and wordmark are static and fully visible at frame 0, so the first frame works as the cover. Only the topic line fades in (0.7 s `sine.out`). Leave with y −40, opacity 0 over 0.5 s.

**Outro** (≈ 4.8 s):

- Icon: tile fades and scales 0.92 → 1 (0.6 s). The bar grows from its center (`scaleY` 0 → 1). The cards glide in from beyond the right edge along the bar, clipped by the rounded tile (`clipPath`). The lower card starts farther out (x 86 vs. 60) and later (+0.16 s), so the pair is never aligned and the offset narrows into place: `expo.out`, 1.3 / 1.45 s. This reads as cards being tidied.
- Wordmark write-on: per glyph, trace the outline with `stroke-dashoffset` (length → 0, 0.95 s `sine.inOut`), fill in from 70 % of the trace (0.65 s), fade the stroke out, and rise 6 px. Stagger 0.13 s so several letters are written at once. Stroke width is 1.6 px converted to viewBox units. Fade each glyph from opacity 0 at its start, because a round line cap paints a dot even at full dash offset.
- Tagline fades in 0.6 s before the last letter settles; hold about 1.3 s.

**Wordmark outlines** (`templates/scripts/build-wordmark.mjs`): lay the text out with fontkit, apply the brand letter-spacing, flip y, and emit one path per glyph into `src/generated/wordmark.json`. fontkit cannot instance variable `woff2` fonts (`getVariation` loses the cmap and `getGlyph` returns null), so use the default instance and tell the user if its weight differs from the brand's.
