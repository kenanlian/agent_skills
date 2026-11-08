// Screenshots a dev page with the render browser, reporting console errors.
// Stops before saving when text in a style.json font fell back to another face.
// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] [scale]
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";
import { checkPageFonts, loadStyle } from "./style-lock.mjs";

const [url, out, width = "578", height = "850", scale = "2"] = process.argv.slice(2);
const style = loadStyle();
const browser = await puppeteer.launch({
  executablePath: resolveBrowserPath(),
  headless: true,
  args: ["--no-sandbox"],
  ignoreDefaultArgs: process.env.SCROLLBARS ? ["--hide-scrollbars"] : [],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Number(width), height: Number(height), deviceScaleFactor: Number(scale) });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn") console.log(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  const system = await checkPageFonts(page, style);
  if (system.length) console.warn(`warning: text in ${system.join(", ")} uses a system font, which differs between machines`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await page.screenshot({ path: out });
} finally {
  await browser.close();
}
console.log(`Saved ${out}`);
