// Browser stand-in for the `obsidian` module: just enough runtime surface for
// the plugin's panel components and pure view helpers to run outside Obsidian.
import { icons, type IconNode } from "lucide";

const SVG_NS = "http://www.w3.org/2000/svg";

// Obsidian's own non-Lucide glyphs, redrawn on the 24 grid from screenshots.
const LINK_GLYPH = `<g transform="scale(0.72)"><path vector-effect="non-scaling-stroke" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path vector-effect="non-scaling-stroke" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g>`;
const toViewBox100 = (body: string) => `<g transform="scale(${100 / 24})">${body}</g>`;
const customIcons = new Map<string, string>([
  ["links-going-out", toViewBox100(`${LINK_GLYPH}<path d="M13 19h8"/><path d="m18 16 3 3-3 3"/>`)],
  ["links-coming-in", toViewBox100(`${LINK_GLYPH}<path d="M21 19h-8"/><path d="m16 16-3 3 3 3"/>`)],
]);

export function addIcon(name: string, svgContent: string): void {
  customIcons.set(name, svgContent);
}

function toPascalCase(name: string): string {
  return name.replace(/^lucide-/, "").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function createSvg(name: string, viewBox: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", `svg-icon ${name.startsWith("lucide-") ? name : `lucide-${name}`}`);
  return svg;
}

/** Mirrors Obsidian's markup: one `svg.svg-icon` child replacing prior content. */
export function setIcon(el: HTMLElement, name: string): void {
  el.replaceChildren();
  const custom = customIcons.get(name);
  if (custom) {
    const svg = createSvg(name, "0 0 100 100");
    svg.innerHTML = custom;
    el.appendChild(svg);
    return;
  }
  const node = (icons as Record<string, IconNode | undefined>)[toPascalCase(name)];
  if (!node) {
    console.warn(`[obsidian shim] unknown icon "${name}"`);
    return;
  }
  const svg = createSvg(name, "0 0 24 24");
  for (const [tag, attrs] of node) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined) child.setAttribute(key, String(value));
    }
    svg.appendChild(child);
  }
  el.appendChild(svg);
}

let language = "zh";

/** Stage-only: the language Obsidian would report, for code that asks it directly. */
export function setDemoLanguage(next: string): void {
  language = next;
}

export function getLanguage(): string {
  return language;
}

export function setTooltip(el: HTMLElement, tooltip: string): void {
  el.setAttribute("aria-label", tooltip);
}

export function getIcon(name: string): SVGSVGElement | null {
  const host = document.createElement("div");
  setIcon(host, name);
  return host.querySelector("svg");
}

export function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
}

export function debounce<T extends unknown[]>(callback: (...args: T) => void): ((...args: T) => void) & { cancel(): void; run(): void } {
  const debounced = ((...args: T) => callback(...args)) as ((...args: T) => void) & { cancel(): void; run(): void };
  debounced.cancel = () => {};
  debounced.run = () => {};
  return debounced;
}

export const Platform = { isDesktopApp: true, isDesktop: true, isMobile: false, isMacOS: false, isWin: true };

export abstract class TAbstractFile {
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  isRoot(): boolean {
    return this.path === "";
  }
}

interface FrontmatterCache {
  tags?: unknown;
  tag?: unknown;
  [key: string]: unknown;
}

/** Obsidian's contract: frontmatter tags plus inline tags, each with a leading `#`. */
export function getAllTags(cache: { frontmatter?: FrontmatterCache; tags?: Array<{ tag: string }> } | null): string[] | null {
  if (!cache) return null;
  const out: string[] = [];
  const fm = cache.frontmatter;
  for (const raw of [fm?.tags, fm?.tag]) {
    const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,\s]+/) : [];
    for (const value of values) {
      if (typeof value === "string" && value.trim()) out.push(`#${value.trim().replace(/^#/, "")}`);
    }
  }
  for (const entry of cache.tags ?? []) out.push(entry.tag);
  return out;
}

export class App {}
export class Component {}
export class Notice {
  constructor(_message: string) {}
}
export class Modal {
  constructor(_app: unknown) {}
  open(): void {}
  close(): void {}
}

class MenuItem {
  setTitle(): this { return this; }
  setIcon(): this { return this; }
  setChecked(): this { return this; }
  setDisabled(): this { return this; }
  setSection(): this { return this; }
  setIsLabel(): this { return this; }
  onClick(): this { return this; }
}

/** Native menus are recreated per scene; the shim only satisfies builders. */
export class Menu {
  dom = document.createElement("div");
  addItem(configure: (item: MenuItem) => unknown): this {
    configure(new MenuItem());
    return this;
  }
  addSeparator(): this { return this; }
  showAtPosition(): this { return this; }
  showAtMouseEvent(): this { return this; }
  hide(): this { return this; }
  onHide(): this { return this; }
  setUseNativeMenu(): this { return this; }
}
