// Extracts the "Card Workspace" wordmark as per-glyph SVG outlines so episodes
// can draw it stroke by stroke. Matches the site's brand name styling: Archivo,
// letter-spacing -0.02em. The site uses weight 570; fontkit cannot instance
// this woff2's variations, so the default SemiBold (600) instance is used.
import { writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import * as fontkit from "fontkit";

const TEXT = "Card Workspace";
const LETTER_SPACING_EM = -0.02;

const require = createRequire(import.meta.url);
const fontPath = require.resolve("@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2");
const font = fontkit.openSync(fontPath);
const run = font.layout(TEXT);
const spacing = LETTER_SPACING_EM * font.unitsPerEm;

const round = (value) => Math.round(value * 10) / 10;
const glyphs = [];
let x = 0;
run.glyphs.forEach((glyph, index) => {
  const position = run.positions[index];
  const char = String.fromCodePoint(...glyph.codePoints);
  const path = glyph.path.scale(1, -1).translate(x + position.xOffset, font.ascent - position.yOffset);
  if (path.commands.length > 0) {
    glyphs.push({ char, d: path.toSVG().replace(/-?\d+\.\d+/g, (n) => String(round(Number(n)))) });
  }
  x += position.xAdvance + spacing;
});

const out = {
  text: TEXT,
  viewBox: [0, 0, round(x - spacing), font.ascent - font.descent],
  /** Baseline and cap height in viewBox units, for optical alignment. */
  baseline: font.ascent,
  capHeight: font.capHeight,
  glyphs,
};

const outFile = new URL("../src/generated/wordmark.json", import.meta.url);
await mkdir(new URL(".", outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(out)}\n`);
console.log(`Wordmark: ${glyphs.length} glyphs, viewBox ${out.viewBox.join(" ")}`);
