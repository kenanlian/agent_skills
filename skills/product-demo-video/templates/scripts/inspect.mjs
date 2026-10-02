// Prints layout boxes and key computed styles for selectors on a dev page.
// Usage: node scripts/inspect.mjs <url> <selector>...
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";

const [url, ...selectors] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: resolveBrowserPath(), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });
const rows = await page.evaluate((list) => list.map((selector) => {
  const node = document.querySelector(selector);
  if (!node) return { selector, missing: true };
  const r = node.getBoundingClientRect();
  const cs = getComputedStyle(node);
  return {
    selector,
    box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10).join(" "),
    display: cs.display, position: cs.position, flex: `${cs.flexDirection} ${cs.flex}`,
    margin: cs.margin, padding: cs.padding, radius: cs.borderRadius, border: cs.border, bg: cs.backgroundColor,
  };
}), selectors);
console.table(rows);
await browser.close();
