// Brand marks shared by episode intros and end cards: the site's app icon and
// the "Card Workspace" wordmark, plus their entrance animations.
import type gsap from "gsap";
import wordmark from "../generated/wordmark.json";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.appendChild(node);
  return node;
}

export interface LogoParts {
  svg: SVGSVGElement;
  bar: SVGRectElement;
  topCard: SVGRectElement;
  bottomCard: SVGRectElement;
}

/** The site favicon (card-workspace-site/public/favicon.svg, light scheme). */
export function renderLogo(container: HTMLElement, id: string): LogoParts {
  const svg = svgEl("svg", { viewBox: "0 0 128 128", role: "img", "aria-label": "Card Workspace" });
  const defs = svgEl("defs", {}, svg);
  const gradient = svgEl("linearGradient", { id: `${id}-bg`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  svgEl("stop", { offset: 0, "stop-color": "#3c4f64" }, gradient);
  svgEl("stop", { offset: 1, "stop-color": "#22374e" }, gradient);
  const clip = svgEl("clipPath", { id: `${id}-clip` }, defs);
  svgEl("rect", { width: 128, height: 128, rx: 30 }, clip);

  svgEl("rect", { width: 128, height: 128, rx: 30, fill: `url(#${id}-bg)` }, svg);
  const marks = svgEl("g", { fill: "#ffffff", "clip-path": `url(#${id}-clip)` }, svg);
  const bar = svgEl("rect", { x: 24, y: 28, width: 8, height: 72, rx: 4, opacity: 0.55 }, marks);
  const topCard = svgEl("rect", { x: 40, y: 24, width: 52, height: 36, rx: 10, opacity: 0.8 }, marks);
  const bottomCard = svgEl("rect", { x: 52, y: 68, width: 52, height: 36, rx: 10 }, marks);
  container.appendChild(svg);
  return { svg, bar, topCard, bottomCard };
}

export interface WordmarkParts {
  svg: SVGSVGElement;
  glyphs: SVGPathElement[];
}

export function renderWordmark(container: HTMLElement): WordmarkParts {
  const [x, y, width, height] = wordmark.viewBox;
  const svg = svgEl("svg", { viewBox: `${x} ${y} ${width} ${height}`, role: "img", "aria-label": wordmark.text });
  const glyphs = wordmark.glyphs.map(({ d }) => svgEl("path", { d, fill: "currentColor" }, svg));
  container.appendChild(svg);
  return { svg, glyphs };
}

/**
 * The cards glide in from the right along the bar and settle into their
 * resting offset. The lower card starts farther out and later, so the pair is
 * never aligned: the gap between them narrows until it reads as "tidied".
 */
export function animateLogo(tl: gsap.core.Timeline, logo: LogoParts, at: number): void {
  tl.fromTo(logo.svg, { scale: 0.92, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }, at);
  tl.fromTo(logo.bar, { scaleY: 0, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.55, ease: "power2.out" }, at + 0.1);
  tl.fromTo(logo.topCard, { x: 60, opacity: 0 }, { x: 0, opacity: 0.8, duration: 1.3, ease: "expo.out" }, at + 0.28);
  tl.fromTo(logo.bottomCard, { x: 86, opacity: 0 }, { x: 0, opacity: 1, duration: 1.45, ease: "expo.out" }, at + 0.44);
}

/**
 * Letters are written a few at a time: each outline is traced, then the ink
 * fills in as the trace fades, with a slight rise so the word settles into place.
 * Returns the time the last letter finishes.
 */
export function animateWordmark(tl: gsap.core.Timeline, mark: WordmarkParts, at: number): number {
  const TRACE = 0.95;
  const STAGGER = 0.13;
  const unitsPerPixel = wordmark.viewBox[2] / mark.svg.getBoundingClientRect().width;
  const strokeWidth = 1.6 * unitsPerPixel;
  mark.glyphs.forEach((glyph, index) => {
    const length = glyph.getTotalLength();
    const start = at + index * STAGGER;
    glyph.setAttribute("stroke", "currentColor");
    glyph.setAttribute("stroke-width", String(strokeWidth));
    glyph.setAttribute("stroke-linecap", "round");
    glyph.setAttribute("stroke-linejoin", "round");
    tl.fromTo(glyph,
      { strokeDasharray: `${length} ${length}`, strokeDashoffset: length, strokeOpacity: 1, fillOpacity: 0, y: 6 * unitsPerPixel },
      { strokeDashoffset: 0, y: 0, duration: TRACE, ease: "sine.inOut" },
      start);
    // A round cap still paints a dot at full dash offset; keep unstarted letters invisible.
    tl.fromTo(glyph, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" }, start);
    tl.to(glyph, { fillOpacity: 1, duration: 0.65, ease: "sine.out" }, start + TRACE * 0.7);
    tl.to(glyph, { strokeOpacity: 0, duration: 0.5, ease: "sine.inOut" }, start + TRACE);
  });
  return at + (mark.glyphs.length - 1) * STAGGER + TRACE + 0.5;
}
