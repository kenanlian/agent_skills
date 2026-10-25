// One full-frame card for a recorded video: the intro (brand + topic, static at
// frame 0 so it doubles as the cover), a chapter card before each clip (part
// number, title, a one-line summary of what the clip shows, progress),
// or the outro (animated logo + wordmark write-on). scripts/rec-cards.mjs writes
// the data into window.__CARD and renders each card with HyperFrames.
import gsap from "gsap";
import { animateLogo, animateWordmark, renderLogo, renderWordmark } from "../stage/brand";

interface CardData {
  kind: "intro" | "chapter" | "outro";
  duration: number;
  /** Crossfade into the next segment; all text is gone before it starts. */
  fade: number;
  kicker?: string;
  title?: string;
  summary?: string;
  sub?: string;
  tagline?: string;
  index?: number;
  total?: number;
}

const card = (window as unknown as { __CARD: CardData }).__CARD;

function text(selector: string, value = ""): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector)!;
  el.textContent = value;
  return el;
}

function buildTimeline(): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const end = card.duration;
  const clear = end - card.fade;
  tl.to(".blob-a", { x: 140, y: 80, duration: end, ease: "sine.inOut" }, 0);
  tl.to(".blob-b", { x: -120, y: -70, duration: end, ease: "sine.inOut" }, 0);
  document.getElementById(card.kind)!.classList.add("active");

  if (card.kind === "intro") {
    renderLogo(document.querySelector<HTMLElement>("#intro .brand-logo")!, "intro-logo");
    renderWordmark(document.querySelector<HTMLElement>("#intro .brand-wordmark")!);
    text("#intro .brand-tagline", card.title);
    text("#intro .brand-sub", card.sub);
    tl.fromTo("#intro .brand-tagline", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "sine.out" }, 0.2);
    tl.fromTo("#intro .brand-sub", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "sine.out" }, 0.38);
    tl.to("#intro", { y: -40, opacity: 0, duration: 0.5, ease: "power2.in" }, clear - 0.55);
  }

  if (card.kind === "chapter") {
    renderLogo(document.querySelector<HTMLElement>("#chapter .mini-logo")!, "mini-logo");
    text("#chapter .kicker", card.kicker);
    text("#chapter .part-no", String(card.index).padStart(2, "0"));
    text("#chapter .part-total", `/ ${String(card.total).padStart(2, "0")}`);
    text("#chapter .chapter-title", card.title);
    text("#chapter .chapter-summary", card.summary);
    const progress = document.querySelector<HTMLElement>("#chapter .progress")!;
    const segs = Array.from({ length: card.total! }, (_, i) => {
      const seg = document.createElement("div");
      const state = i + 1 < card.index! ? "done" : i + 1 === card.index ? "current" : "todo";
      seg.className = `seg ${state}`;
      if (state === "current") seg.append(Object.assign(document.createElement("div"), { className: "seg-fill" }));
      progress.append(seg);
      return seg;
    });

    // Snappy enough for a short card: everything is in by ≈ 0.6 s and out in 0.45 s.
    tl.fromTo(".chapter-head", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 0.12);
    tl.fromTo(".part", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, 0.16);
    tl.fromTo(".chapter-title", { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out" }, 0.22);
    tl.fromTo(".chapter-summary", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, 0.28);
    tl.fromTo(segs, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.03 }, 0.32);
    tl.to(".seg-fill", { scaleX: 1, duration: 0.6, ease: "expo.out" }, 0.5);

    // The brand's "cards being tidied" motion, enlarged.
    tl.fromTo(".deco-tile", { scale: 0.92, opacity: 0, transformOrigin: "50% 50%" }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" }, 0.12);
    tl.fromTo(".deco-bar", { scaleY: 0, transformOrigin: "50% 50%" }, { scaleY: 1, duration: 0.45, ease: "power2.out" }, 0.18);
    tl.fromTo(".deco-top", { x: 240, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: "expo.out" }, 0.24);
    tl.fromTo(".deco-bottom", { x: 340, opacity: 0 }, { x: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, 0.32);
    const exitAt = clear - 0.45;
    const floatFrom = 1.3;
    const halves = Math.floor((exitAt - floatFrom) / 1.3 / 2) * 2;
    if (halves >= 2) tl.to(".deco-card", { y: -6, duration: 1.3, ease: "sine.inOut", yoyo: true, repeat: halves - 1, stagger: 0.25 }, floatFrom);

    tl.to([".chapter-head", ".part", ".chapter-title", ".chapter-summary", ".progress", ".deco"], { y: -30, opacity: 0, duration: 0.3, ease: "power2.in", stagger: 0.03 }, exitAt);
  }

  if (card.kind === "outro") {
    const logo = renderLogo(document.querySelector<HTMLElement>("#outro .brand-logo")!, "outro-logo");
    const wordmark = renderWordmark(document.querySelector<HTMLElement>("#outro .brand-wordmark")!);
    text("#outro .brand-tagline", card.tagline);
    animateLogo(tl, logo, 0.3);
    const written = animateWordmark(tl, wordmark, 0.8);
    tl.fromTo("#outro .brand-tagline", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "sine.out" }, written - 0.6);
  }

  tl.set({}, {}, end);
  return tl;
}

const ready = document.fonts.ready.then(() => {
  const tl = buildTimeline();
  ((window as unknown as { __timelines?: Record<string, unknown> }).__timelines ??= {}).card = tl;
});
const hf = ((window as unknown as { __hf?: { buildReady?: Record<string, Promise<unknown>> } }).__hf ??= {});
(hf.buildReady ??= {}).card = ready;
