import gsap from "gsap";
import { tick } from "svelte";
import { setIcon } from "obsidian";
import snapshot from "../../../data/vault.json";
import meta from "../../../theme/meta.json";
import { getUiStrings } from "@plugin/i18n";
import { DemoHost } from "../../stage/demo-host";
import { createDemoVault, type VaultSnapshot } from "../../stage/demo-vault";
import { call, click, Director, hover, type, type Box, type MountedScene } from "../../stage/director";
import { animateLogo, animateWordmark, renderLogo, renderWordmark } from "../../stage/brand";
import { applyThemeMeta, createLeftSidebarShell, mountPanel } from "../../stage/obsidian-shell";

const COMPOSITION_ID = "search";
const SIDEBAR = { width: 578, height: 850 };
const QUERY = "merge";
const CHARS_PER_SECOND = 9;

/** When the demo starts, after the intro card leaves. */
const DEMO = 2;

function shift<K extends string>(offset: number, times: Record<K, number>): Record<K, number> {
  return Object.fromEntries(Object.entries<number>(times).map(([key, value]) => [key, value + offset])) as Record<K, number>;
}

/** Scene clock, in seconds. Must end at the root's `data-duration`. */
const T = {
  introTagline: 0.2,
  introOut: 1.65,
  ...shift(DEMO, {
    titleIn: 0.2,
    frameIn: 0.35,
    explainerIn: 0.7,
    caption1: 1.2,
    cursorIn: 1.3,
    cursorToSearch: 1.45,
    hoverSearch: 2.1,
    clickSearch: 2.4,
    cursorToInput: 2.65,
    caption2: 2.9,
    leaderIn: 2.95,
    typeStart: 3.4,
    commit: 4.4,
    dim: 4.45,
    fall: 4.75,
    gather: 5.05,
    caption3: 5.5,
    hits: 5.6,
    leaderOut: 6.2,
    spotlight: 6.4,
    cardPushIn: 6.9,
    cardPullBack: 8.9,
    spotlightOut: 9.2,
    caption4: 9.8,
    cursorToClear: 9.9,
    hoverClear: 10.55,
    clickClear: 10.85,
    restore: 10.9,
    outro: 12.4,
    endCard: 12.9,
  }),
  end: 19.7,
};

applyThemeMeta(meta);
const vaultSnapshot = snapshot as VaultSnapshot;
const vault = createDemoVault(vaultSnapshot);
const strings = getUiStrings("zh");
const root = document.getElementById("root")!;
const stageEl = document.getElementById("stage")!;
const camera = document.getElementById("camera")!;
const viewport = document.getElementById("viewport")!;

function mountScene(): MountedScene {
  stageEl.replaceChildren();
  const demo = new DemoHost(vault, vaultSnapshot.settings, "zh", { selectedPath: "Card Workspace.md" });
  const host = createLeftSidebarShell(stageEl, SIDEBAR, vaultSnapshot.name);
  const panel = mountPanel(host, demo);
  return { demo, host, destroy: () => panel.destroy() };
}

const SEARCH_BUTTON = `.fce-toolbar-buttons button[aria-label="${strings.toolbar.actions.toggleSearch}"]`;
const SEARCH_INPUT = "#fce-search-input";
const CLEAR_BUTTON = ".fce-search-clear";

const director = new Director(mountScene, [
  hover(T.hoverSearch, SEARCH_BUTTON),
  click(T.clickSearch, SEARCH_BUTTON),
  hover(T.cursorToInput, SEARCH_BUTTON, false),
  ...type(T.typeStart, SEARCH_INPUT, QUERY, CHARS_PER_SECOND),
  call(T.commit, ({ demo }) => demo.commitQuery()),
  hover(T.hoverClear, CLEAR_BUTTON),
  click(T.clickClear, CLEAR_BUTTON),
]);

window.addEventListener("hf-seek", ((event: CustomEvent<{ time: number; waitUntil(p: Promise<unknown>): void }>) => {
  director.seek(event.detail.time);
  event.detail.waitUntil(tick().then(() => tick()));
}) as EventListener);

interface Point {
  x: number;
  y: number;
}
const center = (box: Box): Point => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** Camera transform that centers `box` in the viewport at `scale`, never exposing an edge. */
function focusOn(box: Box, scale: number) {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const point = center(box);
  const clamp = (value: number, min: number) => Math.min(0, Math.max(min, value));
  return {
    scale,
    x: clamp(width / 2 - point.x * scale, width - width * scale),
    y: clamp(height / 2 - point.y * scale, height - height * scale),
  };
}

function place(el: HTMLElement, box: Box, pad: number): void {
  el.style.left = `${box.x - pad}px`;
  el.style.top = `${box.y - pad}px`;
  el.style.width = `${box.width + pad * 2}px`;
  el.style.height = `${box.height + pad * 2}px`;
}

/** Fixed pseudo-random value in [-0.5, 0.5) per index, so scatter is identical on every render. */
const jitter = (index: number, salt: number) => {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value) - 0.5;
};

interface StreamCard {
  path: string;
  title: string;
}

interface Stream {
  all: StreamCard[];
  matched: StreamCard[];
  hits: Record<string, number>;
}

/** Everything the explainer draws comes from the panel's own state. */
function readStream(): Stream {
  const records = (time: number) =>
    director.read(time, ({ demo }) => demo.model.getState().cards.records.map(({ path, title }) => ({ path, title })));
  const all = records(0);
  const matched = records(T.commit);
  const hits = director.read(T.commit, ({ demo }) => ({ ...demo.model.getState().cards.searchMatchCountsByPath }));
  return { all, matched, hits };
}

const AREA = { width: 1020, height: 500 };
const GAP = 22;

/** Grid slots for the full stream, centered in the explainer area. */
function gridSlots(count: number): Box[] {
  const columns = Math.min(5, count);
  const rows = Math.ceil(count / columns);
  const width = (AREA.width - (columns - 1) * GAP) / columns;
  const height = Math.min(100, (AREA.height - (rows - 1) * GAP) / rows);
  const top = (AREA.height - (rows * (height + GAP) - GAP)) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: (index % columns) * (width + GAP),
    y: top + Math.floor(index / columns) * (height + GAP),
    width,
    height,
  }));
}

/** Where each match settles: one enlarged row when it fits, otherwise the first grid slots. */
function resultSlots(count: number, card: Box, grid: Box[]): Array<Point & { scale: number }> {
  if (count > 4) return grid.slice(0, count).map((slot) => ({ ...center(slot), scale: 1 }));
  const gap = 30;
  const scale = Math.min(1.4, (AREA.width - (count - 1) * gap) / (count * card.width));
  const width = card.width * scale;
  const left = (AREA.width - (count * width + (count - 1) * gap)) / 2;
  return Array.from({ length: count }, (_, index) => ({ x: left + index * (width + gap) + width / 2, y: AREA.height / 2, scale }));
}

function renderStream(stream: Stream, grid: Box[]): HTMLElement[] {
  const container = document.getElementById("mini-cards")!;
  container.replaceChildren();
  return stream.all.map((card, index) => {
    const slot = grid[index];
    const mini = document.createElement("div");
    mini.className = "mini";
    Object.assign(mini.style, { left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.width}px`, height: `${slot.height}px` });
    mini.innerHTML = `<div class="mini-body"><div class="mini-bar"></div><div class="mini-title"></div><div class="mini-line"></div><div class="mini-line"></div><div class="mini-hits"></div></div>`;
    mini.querySelector(".mini-title")!.textContent = card.title;
    mini.querySelector(".mini-hits")!.textContent = `${stream.hits[card.path] ?? 0} 处`;
    container.append(mini);
    return mini;
  });
}

/** One line per value from `from` down to `to`; rolling the strip is a pure transform, so it seeks exactly. */
function renderCountStrip(from: number, to: number): number {
  const strip = document.getElementById("count-strip")!;
  const values = Array.from({ length: Math.abs(from - to) + 1 }, (_, index) => from + (to < from ? -index : index));
  strip.replaceChildren(...values.map((value) => Object.assign(document.createElement("div"), { textContent: String(value) })));
  return values.length - 1;
}

function renderQuery(): HTMLElement[] {
  const text = document.getElementById("query-text")!;
  const chars = [...QUERY].map((char) => Object.assign(document.createElement("span"), { textContent: char }));
  text.replaceChildren(...chars);
  document.querySelectorAll<HTMLElement>("[data-icon]").forEach((node) => setIcon(node, node.dataset.icon!));
  return chars;
}

/** Leader from a live UI element to an explainer anchor, drawn on with a dash offset. */
function renderLeader(from: Point, to: Point) {
  const svg = document.getElementById("explainer-svg")!;
  const accent = getComputedStyle(document.body).getPropertyValue("--interactive-accent").trim();
  const bend = Math.max(60, (to.x - from.x) * 0.5);
  svg.innerHTML = `
    <path id="leader" d="M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}"
      fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
    <circle id="leader-start" cx="${from.x}" cy="${from.y}" r="5" fill="${accent}"/>
    <circle id="leader-end" cx="${to.x}" cy="${to.y}" r="7" fill="#fff" stroke="${accent}" stroke-width="3"/>`;
  const path = svg.querySelector<SVGPathElement>("#leader")!;
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  return { path, length, start: svg.querySelector("#leader-start")!, end: svg.querySelector("#leader-end")! };
}

const relative = (el: Element): Box => {
  const box = el.getBoundingClientRect();
  const base = root.getBoundingClientRect();
  return { x: box.left - base.left, y: box.top - base.top, width: box.width, height: box.height };
};

function buildTimeline(): gsap.core.Timeline {
  // Measure everything while nothing is transformed yet.
  const searchButton = director.measure(0, SEARCH_BUTTON, camera);
  const input = director.measure(T.clickSearch, SEARCH_INPUT, camera);
  const inputOnRoot = director.measure(T.clickSearch, SEARCH_INPUT, root);
  const firstCard = director.measure(T.commit, ".fce-card", camera);
  const badge = director.measure(T.commit, ".fce-card .fce-card-search-count", camera);
  const clear = director.measure(T.commit, CLEAR_BUTTON, camera);
  const stream = readStream();
  director.seek(0);

  const grid = gridSlots(stream.all.length);
  const minis = renderStream(stream, grid);
  const matchedPaths = stream.matched.map((card) => card.path);
  const settle = resultSlots(matchedPaths.length, grid[0], grid);
  const chars = renderQuery();
  const pill = relative(document.getElementById("query-pill")!);
  const leader = renderLeader(
    { x: inputOnRoot.x + inputOnRoot.width + 8, y: inputOnRoot.y + inputOnRoot.height / 2 },
    { x: pill.x - 12, y: pill.y + pill.height / 2 },
  );
  const rollSteps = renderCountStrip(stream.all.length, stream.matched.length);

  const cursor = document.getElementById("cursor")!;
  const ripple = document.getElementById("ripple")!;
  const spotlight = document.getElementById("spotlight")!;
  const ring = document.getElementById("ring")!;
  place(spotlight, firstCard, 6);
  place(ring, badge, 6);

  const tl = gsap.timeline({ paused: true, onUpdate: () => director.seek(tl.time()) });

  // Ambient drift keeps the frame alive between beats.
  tl.to(".blob-a", { x: 180, y: 110, duration: T.end, ease: "sine.inOut" }, 0);
  tl.to(".blob-b", { x: -160, y: -90, duration: T.end, ease: "sine.inOut" }, 0);

  // Intro: the brand is already on screen at frame 0; only the topic line arrives.
  tl.fromTo("#intro .brand-tagline", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "sine.out" }, T.introTagline);
  tl.to("#intro", { y: -40, opacity: 0, duration: 0.5, ease: "power2.in" }, T.introOut);

  tl.fromTo(".titles > *", { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.1 }, T.titleIn);
  tl.fromTo("#viewport", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out" }, T.frameIn);
  tl.fromTo([".ex-head > *"], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.1 }, T.explainerIn);
  tl.fromTo(minis, { y: 36, scale: 0.86, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.035 }, T.explainerIn + 0.15);

  const captions = ["#caption-1", "#caption-2", "#caption-3", "#caption-4"];
  const captionTimes = [T.caption1, T.caption2, T.caption3, T.caption4];
  captions.forEach((selector, index) => {
    tl.fromTo(selector, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out" }, captionTimes[index]);
    tl.fromTo(`${selector} .step`, { scale: 0.4 }, { scale: 1, duration: 0.55, ease: "back.out(2.6)" }, captionTimes[index] + 0.05);
    const next = captionTimes[index + 1] ?? T.outro;
    tl.to(selector, { y: -16, opacity: 0, duration: 0.35, ease: "power2.in" }, next - 0.35);
  });

  // 1. Cursor in, to the search toggle, click, into the input.
  const start = { x: viewport.clientWidth * 0.55, y: viewport.clientHeight * 0.62 };
  tl.fromTo(cursor, { x: start.x, y: start.y, opacity: 0 }, { opacity: 1, duration: 0.25 }, T.cursorIn);
  glide(tl, cursor, center(searchButton), T.cursorToSearch, 0.65);
  pulse(tl, ripple, cursor, center(searchButton), T.clickSearch - 0.05);
  glide(tl, cursor, { x: input.x + 36, y: center(input).y }, T.cursorToInput, 0.55);

  // 2. The leader ties the real input to the big query pill; the pill types in step with it.
  tl.fromTo(leader.path, { strokeDashoffset: leader.length }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, T.leaderIn);
  tl.fromTo(leader.start, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, T.leaderIn);
  tl.fromTo(leader.end, { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, T.leaderIn + 0.55);
  chars.forEach((char, index) => {
    const at = T.typeStart + index / CHARS_PER_SECOND;
    tl.set(char, { display: "inline-block" }, at);
    tl.fromTo(char, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, ease: "back.out(2.5)" }, at);
  });

  // 3. The explainer mirrors the real result: non-matches drop away, matches gather and show their hits.
  const others = minis.filter((_, index) => !matchedPaths.includes(stream.all[index].path));
  tl.to(others, { opacity: 0.45, scale: 0.96, duration: 0.3, ease: "power2.out" }, T.dim);
  others.forEach((mini, index) => {
    tl.to(mini, {
      x: jitter(index, 1) * 70,
      y: 170 + (jitter(index, 2) + 0.5) * 60,
      rotation: jitter(index, 3) * 30,
      opacity: 0,
      duration: 0.62,
      ease: "power2.in",
    }, T.fall + index * 0.03);
  });
  matchedPaths.forEach((path, order) => {
    const index = stream.all.findIndex((card) => card.path === path);
    const mini = minis[index];
    const from = center(grid[index]);
    const target = settle[order];
    tl.to(mini, { x: target.x - from.x, y: target.y - from.y, scale: target.scale, zIndex: 2, duration: 0.95, ease: "expo.out" }, T.gather + order * 0.06);
    tl.fromTo(mini.querySelector(".mini-bar"), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: "expo.out" }, T.hits + order * 0.08);
    tl.fromTo(mini.querySelector(".mini-hits"), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.6)" }, T.hits + 0.15 + order * 0.08);
    float(tl, mini.querySelector(".mini-body")!, T.hits + 0.7 + order * 0.25, T.restore - 0.2);
  });
  tl.to("#count-strip", { y: -72 * rollSteps, duration: 0.9, ease: "power3.out" }, T.dim);
  tl.fromTo(".count-window", { scale: 1 }, { scale: 1.12, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }, T.dim + 0.75);
  tl.to([leader.path, leader.start, leader.end], { opacity: 0, duration: 0.4, ease: "power2.out" }, T.leaderOut);

  // Results in the real UI: spotlight the first match, push in on its highlights and count;
  // its twin in the explainer lifts at the same moment.
  const twin = minis[stream.all.findIndex((card) => card.path === matchedPaths[0])]?.querySelector(".mini-body");
  glide(tl, cursor, { x: center(badge).x + 18, y: center(badge).y + 26 }, T.leaderOut, 0.6);
  tl.fromTo(spotlight, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, T.spotlight);
  tl.fromTo(ring, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, T.spotlight + 0.35);
  tl.to(camera, { ...focusOn(firstCard, 1.45), duration: 1, ease: "power3.inOut" }, T.cardPushIn);
  if (twin) {
    tl.to(twin, { scale: 1.07, boxShadow: "0 18px 40px rgb(40 44 70 / 0.2)", duration: 0.6, ease: "expo.out" }, T.cardPushIn);
    tl.to(twin, { scale: 1, boxShadow: "0 8px 22px rgb(40 44 70 / 0.1)", duration: 0.6, ease: "power2.inOut" }, T.cardPullBack);
  }
  tl.to(camera, { x: 0, y: 0, scale: 1, duration: 0.9, ease: "power3.inOut" }, T.cardPullBack);
  tl.to([spotlight, ring], { opacity: 0, duration: 0.4 }, T.spotlightOut);

  // 4. Clear the query; the explainer returns to the full stream.
  glide(tl, cursor, center(clear), T.cursorToClear, 0.6);
  pulse(tl, ripple, cursor, center(clear), T.clickClear - 0.05);
  [...chars].reverse().forEach((char, index) => tl.set(char, { display: "none" }, T.restore + index * 0.035));
  matchedPaths.forEach((path, order) => {
    const mini = minis[stream.all.findIndex((card) => card.path === path)];
    tl.to(mini, { x: 0, y: 0, scale: 1, duration: 0.85, ease: "expo.inOut" }, T.restore);
    tl.to(mini.querySelectorAll(".mini-bar, .mini-hits"), { opacity: 0, duration: 0.3 }, T.restore + order * 0.04);
  });
  others.forEach((mini, index) => {
    tl.to(mini, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.75, ease: "back.out(1.5)" }, T.restore + 0.25 + index * 0.025);
  });
  tl.to("#count-strip", { y: 0, duration: 0.9, ease: "power3.out" }, T.restore + 0.2);

  // Outro.
  tl.to(["#viewport", ".titles", "#explainer", cursor], { opacity: 0, y: -30, duration: 0.5, ease: "power2.in", stagger: 0.05 }, T.outro);
  tl.set("#endcard", { opacity: 1 }, T.endCard);
  animateLogo(tl, endBrand.logo, T.endCard);
  const written = animateWordmark(tl, endBrand.wordmark, T.endCard + 0.5);
  tl.fromTo("#endcard .brand-tagline", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "sine.out" }, written - 0.6);
  tl.set({}, {}, T.end);
  return tl;
}

function renderBrand(card: HTMLElement, id: string) {
  return {
    logo: renderLogo(card.querySelector<HTMLElement>(".brand-logo")!, id),
    wordmark: renderWordmark(card.querySelector<HTMLElement>(".brand-wordmark")!),
  };
}

renderBrand(document.getElementById("intro")!, "intro-logo");
const endBrand = renderBrand(document.getElementById("endcard")!, "end-logo");

/** Cursor travel on a gentle arc: x and y share the duration but not the ease. */
function glide(tl: gsap.core.Timeline, cursor: HTMLElement, to: Point, time: number, duration: number): void {
  tl.to(cursor, { x: to.x, duration, ease: "power3.inOut" }, time);
  tl.to(cursor, { y: to.y, duration, ease: "power2.inOut" }, time);
}

/** Cursor press plus an expanding ring at the click point. */
function pulse(tl: gsap.core.Timeline, ripple: HTMLElement, cursor: HTMLElement, point: Point, time: number): void {
  tl.to(cursor, { scale: 0.82, duration: 0.08, ease: "power1.in" }, time);
  tl.to(cursor, { scale: 1, duration: 0.2, ease: "back.out(3)" }, time + 0.08);
  tl.fromTo(ripple, { x: point.x, y: point.y, scale: 0.2, opacity: 0.55 }, { scale: 1.6, opacity: 0, duration: 0.6, ease: "expo.out" }, time);
}

/** Idle bob between `from` and `to`, ending back at rest so the next tween starts clean. */
function float(tl: gsap.core.Timeline, el: Element, from: number, to: number): void {
  const half = 1.3;
  const halves = Math.floor((to - from) / half / 2) * 2;
  if (halves < 2) return;
  tl.to(el, { y: -5, duration: half, ease: "sine.inOut", yoyo: true, repeat: halves - 1 }, from);
}

const ready = document.fonts.ready.then(() => {
  const tl = buildTimeline();
  ((window as unknown as { __timelines?: Record<string, unknown> }).__timelines ??= {})[COMPOSITION_ID] = tl;
  Object.assign(window, { __director: director, __tl: tl });
});

const hf = ((window as unknown as { __hf?: { buildReady?: Record<string, Promise<unknown>> } }).__hf ??= {});
(hf.buildReady ??= {})["card-workspace-stage"] = ready;
