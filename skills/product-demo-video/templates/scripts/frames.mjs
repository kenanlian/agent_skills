// Quick frame preview without HyperFrames' preprocessing: seeks the episode's
// timeline in a plain page and screenshots each time into one contact sheet.
// Usage: node scripts/frames.mjs <episode> <t1,t2,...> [out.png]  (needs `npm run dev`)
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";

const [episode, times, out = `renders/${episode}-frames.png`] = process.argv.slice(2);
const port = process.env.PORT ?? "5173";
const browser = await puppeteer.launch({ executablePath: resolveBrowserPath(), headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
const url = `http://127.0.0.1:${port}/episodes/${episode}/index.html`;
await page.goto(url, { waitUntil: "domcontentloaded" });
const size = await page.evaluate(() => {
  const root = document.querySelector("[data-composition-id]");
  return { width: Number(root.dataset.width), height: Number(root.dataset.height) };
});
await page.setViewport({ ...size, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });
await page.waitForFunction(() => "__tl" in window, { timeout: 30000 });

const dir = mkdtempSync(join(tmpdir(), "frames-"));
const files = [];
for (const time of times.split(",").map(Number)) {
  await page.evaluate((t) => {
    window.__director.seek(t);
    window.__tl.seek(t, false);
  }, time);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const file = join(dir, `${String(files.length).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  files.push(file);
}
await browser.close();

const columns = Math.min(files.length, 6);
const rows = Math.ceil(files.length / columns);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", join(dir, "%02d.png"),
  "-vf", `${process.env.CROP ? `crop=${process.env.CROP},` : `scale=${size.width > size.height ? 480 : 270}:-1,`}tile=${columns}x${rows}`, "-frames:v", "1", out]);
console.log(`Saved ${out} (${times})`);
