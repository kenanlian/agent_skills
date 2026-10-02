import { flushSync } from "svelte";

/**
 * A real `ResizeObserver` reports a frame later, so a panel that sizes its
 * virtual rows with one ends up in a state that depends on whether a frame
 * was painted between two steps. Render workers seek with different
 * histories (one frame apart, a chunk apart, straight from 0), so that state
 * would differ per worker and the list would flicker. The stage observer only
 * reports when the director settles it, synchronously after every step.
 */
interface Size {
  width: number;
  height: number;
}

const observers = new Set<SettledResizeObserver>();
const MAX_PASSES = 20;

/** Border-box size from layout, unaffected by the camera's transforms. */
function borderBox(target: Element): Size {
  const style = getComputedStyle(target);
  if (style.display === "none") return { width: 0, height: 0 };
  const px = (value: string) => Number.parseFloat(value) || 0;
  let width = px(style.width);
  let height = px(style.height);
  if (style.boxSizing !== "border-box") {
    width += px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth);
    height += px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth);
  }
  return { width, height };
}

function entryFor(target: Element, size: Size): ResizeObserverEntry {
  const box = [{ inlineSize: size.width, blockSize: size.height }] as unknown as ReadonlyArray<ResizeObserverSize>;
  return {
    target,
    contentRect: new DOMRectReadOnly(0, 0, size.width, size.height),
    borderBoxSize: box,
    contentBoxSize: box,
    devicePixelContentBoxSize: box,
  };
}

class SettledResizeObserver implements ResizeObserver {
  /** Last reported size; a fresh target starts at 0×0, so only a sized one reports, as in the spec. */
  private readonly targets = new Map<Element, Size>();

  constructor(private readonly callback: ResizeObserverCallback) {
    observers.add(this);
  }

  observe(target: Element): void {
    if (!this.targets.has(target)) this.targets.set(target, { width: 0, height: 0 });
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    observers.delete(this);
  }

  /** Reports every target whose size changed since its last report. */
  deliver(): boolean {
    const entries: ResizeObserverEntry[] = [];
    for (const [target, last] of this.targets) {
      if (!target.isConnected) continue;
      const size = borderBox(target);
      if (size.width === last.width && size.height === last.height) continue;
      this.targets.set(target, size);
      entries.push(entryFor(target, size));
    }
    if (entries.length > 0) this.callback(entries, this);
    return entries.length > 0;
  }
}

export function installSettledResizeObserver(): void {
  window.ResizeObserver = SettledResizeObserver;
}

/** Delivers resizes until layout stops changing; a delivery can render rows that then need measuring. */
export function settleLayout(): void {
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let changed = false;
    flushSync(() => {
      for (const observer of [...observers]) changed = observer.deliver() || changed;
    });
    if (!changed) return;
  }
  throw new Error(`Layout did not settle after ${MAX_PASSES} resize passes`);
}
