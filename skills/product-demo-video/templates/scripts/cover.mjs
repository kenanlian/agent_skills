// Renders one cover page for both platforms, plus a review sheet:
//   renders/<name>-cover-bilibili.png  1440 x 1080, the page at ?ratio=4x3
//   renders/<name>-cover-youtube.jpg   1280 x 720, the page at ?ratio=16x9 laid out at 1920 x 1080
//   renders/<name>-cover-review.png    at feed size: the 4:3 cover, its 16:10 and 16:9 centre crops
//                                      (where Bilibili shows it cropped), and the YouTube cover
// Stops when text in a style.json font fell back to another face.
// Usage: node scripts/cover.mjs covers/<name>.html
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";
import { checkPageFonts, loadStyle } from "./style-lock.mjs";

const style = loadStyle();
const [page] = process.argv.slice(2);
if (!page?.endsWith(".html")) {
  console.error("Usage: node scripts/cover.mjs covers/<name>.html");
  process.exit(1);
}
const root = new URL("../", import.meta.url).pathname;
const out = (suffix) => `${root}renders/${basename(page, ".html")}-cover-${suffix}`;
mkdirSync(`${root}renders`, { recursive: true });

const YOUTUBE_LIMIT = 2 * 1024 * 1024;
const browser = await puppeteer.launch({ executablePath: resolveBrowserPath(), headless: true, args: ["--no-sandbox"] });
const tab = await browser.newPage();
tab.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warn") console.log(`[${msg.type()}] ${msg.text()}`);
});
tab.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
tab.on("requestfailed", (request) => console.log(`[missing] ${request.url()}`));

async function shoot(ratio, width, scale, path, options = {}) {
  await tab.setViewport({ width, height: 1080, deviceScaleFactor: scale });
  const url = pathToFileURL(resolve(page));
  url.searchParams.set("ratio", ratio);
  await tab.goto(url.href, { waitUntil: "networkidle0" });
  await tab.evaluate(() => document.fonts.ready);
  const system = await checkPageFonts(tab, style);
  if (system.length) console.warn(`warning: text in ${system.join(", ")} uses a system font, which differs between machines; pin the font in style.json and load it in the page`);
  const fills = await tab.evaluate(() => Math.round(document.getElementById("cover")?.getBoundingClientRect().width ?? 0) === innerWidth);
  if (!fills) console.warn(`warning: #cover does not fill the ${ratio} frame (${width} x 1080); give the page a [data-ratio="${ratio}"] layout`);
  await tab.screenshot({ path, ...options });
}

try {
  await shoot("4x3", 1440, 1, out("bilibili.png"));
  await shoot("16x9", 1920, 2 / 3, out("youtube.jpg"), { type: "jpeg", quality: 90 });
} finally {
  await browser.close();
}

const size = statSync(out("youtube.jpg")).size;
if (size > YOUTUBE_LIMIT) console.warn(`warning: the YouTube cover is ${(size / 1048576).toFixed(2)} MB; YouTube accepts at most 2 MB`);

const cell = "scale=480:-1,pad=496:376:8:(oh-ih)/2:color=0xd5d8e2";
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", out("bilibili.png"), "-i", out("youtube.jpg"), "-filter_complex",
  `[0:v]split=3[a][b][c];[a]${cell}[full];[b]crop=1440:900,${cell}[c1610];[c]crop=1440:810,${cell}[c169];[1:v]${cell}[yt];` +
  "[full][c1610][c169][yt]hstack=4", "-frames:v", "1", out("review.png")]);
for (const suffix of ["bilibili.png", "youtube.jpg", "review.png"]) console.log(`Saved ${out(suffix).slice(root.length)}`);
