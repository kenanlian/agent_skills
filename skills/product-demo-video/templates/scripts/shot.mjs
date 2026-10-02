// Screenshots a dev page with the render browser, reporting console errors.
// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [scale]
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";

const [url, out, width = "578", height = "850", scale = "2"] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: resolveBrowserPath(),
  headless: true,
  args: ["--no-sandbox"],
  ignoreDefaultArgs: process.env.SCROLLBARS ? ["--hide-scrollbars"] : [],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(width), height: Number(height), deviceScaleFactor: Number(scale) });
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warn") console.log(`[${msg.type()}] ${msg.text()}`);
});
page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
await page.goto(url, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 300));
await page.screenshot({ path: out });
await browser.close();
console.log(`Saved ${out}`);
