// Evaluates a JS expression in a dev page and prints the JSON result.
// Usage: SCROLLBARS=1 node scripts/eval.mjs <url> "<expression>"
import puppeteer from "puppeteer-core";
import { resolveBrowserPath } from "./browser-path.mjs";

const [url, expression] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: resolveBrowserPath(),
  headless: true,
  args: ["--no-sandbox"],
  ignoreDefaultArgs: process.env.SCROLLBARS ? ["--hide-scrollbars"] : [],
});
const page = await browser.newPage();
await page.setViewport({ width: 578, height: 850, deviceScaleFactor: 1 });
page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
await page.goto(url, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
console.log(JSON.stringify(await page.evaluate(expression), null, 2));
await browser.close();
