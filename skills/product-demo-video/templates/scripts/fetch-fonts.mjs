// Downloads the fonts style.json pins from their official sources into
// .fonts-cache/, checks each SHA-256, and installs them: theme fonts into every
// imported theme folder, the others (captions, covers) into their `dir`. Run it
// after cloning.
import { fetchFonts, loadStyle, themeDirs } from "./style-lock.mjs";

const installed = fetchFonts(loadStyle());
console.log(`Fonts match style.json (${installed} installed; themes: ${themeDirs().join(", ") || "none yet, run npm run import:theme"})`);
