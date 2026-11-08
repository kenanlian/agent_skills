// The series look pinned in style.json (the accent, the font families each
// surface uses, and every font file with its official URL and SHA-256), plus
// the checks that stop a build or render instead of letting a missing font fall
// back to another face. Fonts never enter git; fetchFonts downloads them.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const cacheDir = `${root}.fonts-cache/`;
export const FETCH_HINT = "run `npm run fetch:fonts`";

export function loadStyle() {
  const path = `${root}style.json`;
  if (!existsSync(path)) throw new Error("style.json is missing; it pins the series' accent and fonts");
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Font files for one use: `theme` goes into every theme folder, any other use into its `dir`. */
export const fontFiles = (style, use) => style.fonts.files.filter((font) => font.use === use);

/** Imported theme folders: theme/ and every theme-<name>/ holding an obsidian.css. */
export function themeDirs() {
  return readdirSync(root).filter((name) => /^theme(-[\w-]+)?$/.test(name) && existsSync(`${root}${name}/obsidian.css`));
}

const hashes = new Map();
function sha256(path) {
  const { size, mtimeMs } = statSync(path);
  const key = `${path}:${size}:${mtimeMs}`;
  if (!hashes.has(key)) hashes.set(key, createHash("sha256").update(readFileSync(path)).digest("hex"));
  return hashes.get(key);
}

const matches = (path, font) => existsSync(path) && sha256(path) === font.sha256;
const licenseName = (font) => font.file.replace(/\.\w+$/, ".LICENSE.txt");

/** Throws unless every font sits in `dir` (relative to the project) with its pinned hash. */
export function requireFonts(dir, fonts) {
  const problems = fonts.flatMap((font) => {
    const path = `${root}${dir}/${font.file}`;
    if (!existsSync(path)) return [`${dir}/${font.file} is missing`];
    return sha256(path) === font.sha256 ? [] : [`${dir}/${font.file} is not the version style.json pins`];
  });
  if (problems.length) throw new Error(`${problems.join("; ")}; ${FETCH_HINT}`);
}

/** The theme's fonts.css: one @font-face per family alias, pointing into fonts/. */
export function fontFaces(style) {
  const faces = fontFiles(style, "theme").flatMap((font) => font.families.map((family) =>
    `@font-face { font-family: "${family}"; font-weight: ${font.weight}; font-style: normal; src: url("fonts/${font.file}") format("truetype"); }`));
  return `${faces.join("\n")}\n`;
}

/**
 * Downloads each pinned font missing from .fonts-cache/, refuses one whose hash
 * differs, and copies it into every folder that needs it. Returns the number of
 * files installed.
 */
export function fetchFonts(style, log = console.log) {
  mkdirSync(cacheDir, { recursive: true });
  for (const font of style.fonts.files) {
    const license = font.license && !existsSync(`${cacheDir}${licenseName(font)}`);
    if (!matches(`${cacheDir}${font.file}`, font) || license) download(font, log);
  }
  let installed = 0;
  for (const font of style.fonts.files) {
    const dirs = font.use === "theme" ? themeDirs().map((theme) => `${theme}/fonts`) : [font.dir];
    for (const dir of dirs) {
      mkdirSync(`${root}${dir}`, { recursive: true });
      // The HarmonyOS Sans license asks for its notice next to every copy.
      if (font.license) copyFileSync(`${cacheDir}${licenseName(font)}`, `${root}${dir}/${licenseName(font)}`);
      const target = `${root}${dir}/${font.file}`;
      if (matches(target, font)) continue;
      // Fonts copied from Windows arrive read-only, which would block the copy.
      rmSync(target, { force: true });
      copyFileSync(`${cacheDir}${font.file}`, target);
      installed++;
    }
  }
  return installed;
}

function download(font, log) {
  log(`Downloading ${font.file} from ${new URL(font.url).host}`);
  const work = mkdtempSync(join(tmpdir(), "fetch-fonts-"));
  try {
    const fetched = join(work, "download");
    tool("curl", ["-fsSL", "--retry", "3", "-o", fetched, font.url]);
    let file = fetched;
    if (font.member) {
      const members = [font.member, ...(font.license ? [font.license] : [])];
      if (/\.(tgz|tar\.gz)$/.test(font.url)) tool("tar", ["-xzf", fetched, "-C", work, ...members]);
      else tool("unzip", ["-q", "-o", fetched, ...members, "-d", work]);
      file = join(work, font.member);
      if (font.license) copyFileSync(join(work, font.license), `${cacheDir}${licenseName(font)}`);
    }
    const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
    if (actual !== font.sha256) {
      throw new Error(`${font.file} from ${font.url} has SHA-256 ${actual}, not the pinned ${font.sha256}. The source changed; compare the new file against the current renders before updating style.json`);
    }
    copyFileSync(file, `${cacheDir}${font.file}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function tool(command, args) {
  try {
    execFileSync(command, args, { stdio: ["ignore", "ignore", "inherit"] });
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`fetching fonts needs \`${command}\` on PATH`);
    throw error;
  }
}

/**
 * Throws when a page's text uses a style.json family that did not load. Other
 * families that did not load are returned for a warning: their text falls back
 * to a system font, which differs between machines.
 */
export async function checkPageFonts(page, style) {
  const { used, loaded, failed } = await page.evaluate(() => {
    const strip = (family) => family.trim().replace(/^["']|["']$/g, "");
    const used = new Set();
    for (const el of document.body.querySelectorAll("*")) {
      if (!el.getClientRects().length) continue;
      if (![...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
      used.add(strip(getComputedStyle(el).fontFamily.split(",")[0]));
    }
    const faces = [...document.fonts];
    const family = (status) => faces.filter((face) => face.status === status).map((face) => strip(face.family));
    // A face is only fetched when text needs it, so one that errored left that text in another face.
    return { used: [...used], loaded: family("loaded"), failed: family("error") };
  });
  const { interface: ui, brand, captions, files } = style.fonts;
  const pinned = new Set([ui, brand, captions, ...files.flatMap((font) => font.families)]);
  const missing = [...new Set([...used.filter((family) => !loaded.includes(family)), ...failed])];
  const errors = missing.filter((family) => pinned.has(family));
  if (errors.length) throw new Error(`text in ${errors.join(", ")} fell back to another face because a font file did not load; ${FETCH_HINT}`);
  return missing.filter((family) => !pinned.has(family));
}
