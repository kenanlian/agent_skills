import { flushSync } from "svelte";
import type { DemoHost } from "./demo-host";
import { installSettledResizeObserver, settleLayout } from "./settled-resize";

export interface SceneContext {
  demo: DemoHost;
  /** The `.folder-card-view` element the panel is mounted into. */
  host: HTMLElement;
  find(selector: string): HTMLElement;
}

export interface SceneStep {
  at: number;
  run(ctx: SceneContext): void;
}

export interface MountedScene {
  demo: DemoHost;
  host: HTMLElement;
  destroy(): void;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A selector, or a finder for elements a selector can't address (e.g. a card by title). */
export type Target = string | ((host: HTMLElement) => HTMLElement | null);

function relativeBox(rect: DOMRect, origin: HTMLElement): Box {
  const base = origin.getBoundingClientRect();
  return { x: rect.left - base.left, y: rect.top - base.top, width: rect.width, height: rect.height };
}

/**
 * Turns an ordered list of timed steps into seekable state: the panel at time
 * t is always the fresh mount plus every step with `at <= t`, replayed in
 * order. Forward seeks apply only the new steps; backward seeks remount.
 * Layout settles after every step, so a seek straight to t lands on the same
 * panel as seeking there one frame at a time.
 */
export class Director {
  private scene: MountedScene;
  private applied = 0;
  private readonly steps: SceneStep[];

  constructor(private readonly mountScene: () => MountedScene, steps: SceneStep[]) {
    this.steps = [...steps].sort((left, right) => left.at - right.at);
    installSettledResizeObserver();
    this.scene = this.mount();
  }

  seek(time: number): void {
    const target = this.steps.findIndex((step) => step.at > time);
    const count = target < 0 ? this.steps.length : target;
    if (count < this.applied) {
      this.scene.destroy();
      this.scene = this.mount();
      this.applied = 0;
    }
    // Late font loads resize the panel between seeks.
    settleLayout();
    if (count === this.applied) return;
    const ctx = this.context();
    for (; this.applied < count; this.applied += 1) {
      flushSync(() => this.steps[this.applied].run(ctx));
      settleLayout();
    }
  }

  private mount(): MountedScene {
    const scene = this.mountScene();
    settleLayout();
    return scene;
  }

  /** Box of `target` at `time`, relative to `origin`. */
  measure(time: number, target: Target, origin: HTMLElement): Box {
    this.seek(time);
    const { host, find } = this.context();
    const node = typeof target === "string" ? find(target) : target(host);
    if (!node) throw new Error("Scene element not found for measure target");
    return relativeBox(node.getBoundingClientRect(), origin);
  }

  /** Bounding box of every `selector` match at `time`, relative to `origin`. */
  measureAll(time: number, selector: string, origin: HTMLElement): Box {
    this.seek(time);
    const rects = Array.from(this.scene.host.querySelectorAll<HTMLElement>(selector), (node) => node.getBoundingClientRect());
    if (rects.length === 0) throw new Error(`Scene element not found: ${selector}`);
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return relativeBox(new DOMRect(left, top, right - left, bottom - top), origin);
  }

  /** Reads scene state at `time`, e.g. the real card titles an explainer draws. */
  read<T>(time: number, query: (ctx: SceneContext) => T): T {
    this.seek(time);
    return query(this.context());
  }

  private context(): SceneContext {
    const { demo, host } = this.scene;
    return {
      demo,
      host,
      find: (selector) => {
        const node = host.querySelector<HTMLElement>(selector);
        if (!node) throw new Error(`Scene element not found: ${selector}`);
        return node;
      },
    };
  }
}

export function click(at: number, selector: string): SceneStep {
  return { at, run: ({ find }) => find(selector).click() };
}

export function hover(at: number, selector: string, on = true): SceneStep {
  return { at, run: ({ find }) => find(selector).classList.toggle("demo-hover", on) };
}

/** One step per character, dispatching the same `input` event a keyboard would. */
export function type(at: number, selector: string, text: string, charsPerSecond = 9): SceneStep[] {
  return [...text].map((_, index) => ({
    at: at + index / charsPerSecond,
    run: ({ find }) => {
      const input = find(selector) as HTMLInputElement;
      input.value = text.slice(0, index + 1);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
  }));
}

export function call(at: number, run: (ctx: SceneContext) => void): SceneStep {
  return { at, run };
}
