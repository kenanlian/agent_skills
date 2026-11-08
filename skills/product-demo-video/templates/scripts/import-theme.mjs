// Imports the style dump exported from Obsidian's devtools into theme/ (or
// THEME_DIR): obsidian.css, meta.json, the reference screenshot, and a
// fonts.css for the fonts style.json pins, which are then fetched and checked.
// Theme folders are committed to this private repository; their fonts/ are not.
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchFonts, fontFaces, fontFiles, loadStyle, requireFonts } from "./style-lock.mjs";

// Theme dump only. Demo notes come from Card-Workspace-Docs-zh (see snapshot-vault.mjs).
const dumpDir = process.env.DUMP_DIR ?? "/mnt/d/Kenan/OBSIDIAN/Card-Workspace-Docs/_video-dump";
const themeName = process.env.THEME_DIR ?? "theme";
const themeDir = new URL(`../${themeName}/`, import.meta.url).pathname;
const style = loadStyle();
const themeFonts = fontFiles(style, "theme");

const meta = JSON.parse(await readFile(join(dumpDir, "meta.json"), "utf8"));
// Every font the dump's CSS variables name must be pinned, or its text would fall back.
const named = [...(meta.bodyStyle ?? "").matchAll(/--font-[\w-]+-override:\s*([^;]*);/g)]
  .map((match) => match[1].split(",")[0].trim().replace(/^["']|["']$/g, ""))
  .filter((family) => family && family !== "??");
const pinned = new Set(themeFonts.flatMap((font) => font.families));
const unpinned = [...new Set(named)].filter((family) => !pinned.has(family));
if (unpinned.length) {
  throw new Error(`the dump sets ${unpinned.join(", ")}, which style.json does not pin; add the file to fonts.files with its official URL and SHA-256 first`);
}

await mkdir(themeDir, { recursive: true });
const dumpFiles = await readdir(dumpDir);
const screenshot = dumpFiles.find((name) => /\.(png|jpe?g)$/i.test(name));
if (screenshot) await copyFile(join(dumpDir, screenshot), join(themeDir, `reference${screenshot.slice(screenshot.lastIndexOf("."))}`));
await copyFile(join(dumpDir, "meta.json"), join(themeDir, "meta.json"));

const css = await readFile(join(dumpDir, "styles.css"), "utf8");
const EXTERNAL_LINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#888888" d="M18 5v2h5.56L11.28 19.28l1.44 1.44L25 8.44V14h2V5zM5 9v18h18V14l-2 2v9H7V11h9l2-2z"/></svg>`;
// Obsidian's bundled faces and images point at app-relative URLs that only resolve inside Obsidian.
const stripped = css
  .replace(/@font-face\s*\{[^}]*url\(\s*["']?public\/[^}]*\}/g, "")
  .replace(/url\("public\/images\/6155340132a851f6089e\.svg"\)/g, `url("data:image/svg+xml,${encodeURIComponent(EXTERNAL_LINK_SVG)}")`);
// HyperFrames inlines stylesheets into <style>; SVG data URIs carrying
// `</style>` would end that element early. `\/` is the same character in CSS.
const inlineSafe = stripped.replace(/<\/style/gi, "<\\/style");
await writeFile(join(themeDir, "obsidian.css"), inlineSafe);
await writeFile(join(themeDir, "fonts.css"), fontFaces(style));

fetchFonts(style);
requireFonts(`${themeName}/fonts`, themeFonts);
const version = meta.obsidianVersion ? `Obsidian ${meta.obsidianVersion}, ` : "";
console.log(`Theme imported into ${themeName}/ (${version}${named.length ? [...new Set(named)].join(", ") : "default fonts"}, screenshot: ${screenshot ?? "none"})`);
