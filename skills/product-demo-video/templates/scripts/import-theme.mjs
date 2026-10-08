// Imports the style dump exported from Obsidian's devtools plus the fonts it
// names into theme/ (git-ignored: it contains Obsidian's proprietary app.css).
import { chmod, copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Theme dump only. Demo notes come from Card-Workspace-Docs-zh (see snapshot-vault.mjs).
const dumpDir = process.env.DUMP_DIR ?? "/mnt/d/Kenan/OBSIDIAN/Card-Workspace-Docs/_video-dump";
const themeDir = new URL("../theme/", import.meta.url).pathname;
const fontDir = join(themeDir, "fonts");

// Family names must match what the dump's CSS variables reference.
const FONTS = [
  { file: "LXGWWenKai-Light.ttf", families: ["霞鹜文楷", "LXGW WenKai"], weight: 300 },
  { file: "LXGWWenKai-Regular.ttf", families: ["霞鹜文楷", "LXGW WenKai"], weight: 400 },
  { file: "LXGWWenKai-Medium.ttf", families: ["霞鹜文楷", "LXGW WenKai"], weight: 500 },
  { file: "SourceCodePro-Regular.ttf", families: ["Source Code Pro"], weight: 400 },
];

async function windowsFontDirs() {
  const dirs = ["/mnt/c/Windows/Fonts"];
  if (existsSync("/mnt/c/Users")) {
    for (const user of await readdir("/mnt/c/Users")) {
      dirs.push(`/mnt/c/Users/${user}/AppData/Local/Microsoft/Windows/Fonts`);
    }
  }
  return dirs.filter((dir) => existsSync(dir));
}

await mkdir(fontDir, { recursive: true });

const dumpFiles = await readdir(dumpDir);
const screenshot = dumpFiles.find((name) => /\.(png|jpe?g)$/i.test(name));
if (screenshot) await copyFile(join(dumpDir, screenshot), join(themeDir, `reference${screenshot.slice(screenshot.lastIndexOf("."))}`));
await copyFile(join(dumpDir, "meta.json"), join(themeDir, "meta.json"));

// Obsidian's bundled faces point at app-relative URLs that only resolve inside Obsidian.
const css = await readFile(join(dumpDir, "styles.css"), "utf8");
const stripped = css.replace(/@font-face\s*\{[^}]*url\(\s*["']?public\/[^}]*\}/g, "");
// HyperFrames inlines stylesheets into <style>; SVG data URIs carrying
// `</style>` would end that element early. `\/` is the same character in CSS.
const inlineSafe = stripped.replace(/<\/style/gi, "<\\/style");
await writeFile(join(themeDir, "obsidian.css"), inlineSafe);

const searchDirs = await windowsFontDirs();
const faces = [];
for (const font of FONTS) {
  const source = searchDirs.map((dir) => join(dir, font.file)).find((path) => existsSync(path));
  if (!source) {
    console.warn(`Missing font ${font.file}; text will fall back to another face.`);
    continue;
  }
  // Windows font files arrive read-only, which would block the next import.
  const target = join(fontDir, font.file);
  await rm(target, { force: true });
  await copyFile(source, target);
  await chmod(target, 0o644);
  for (const family of font.families) {
    faces.push(`@font-face { font-family: "${family}"; font-weight: ${font.weight}; font-style: normal; src: url("fonts/${font.file}") format("truetype"); }`);
  }
}
await writeFile(join(themeDir, "fonts.css"), `${faces.join("\n")}\n`);

console.log(`Theme imported into ${themeDir} (${faces.length} font faces, screenshot: ${screenshot ?? "none"})`);
