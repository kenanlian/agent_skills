# Obsidian specifics

## Capture the live theme

Theme, Style Settings, CSS snippets, and appearance are **per vault**. Run the export in the vault the video should look like, with the plugin's view open, once per light/dark mode:

```js
if (!(await app.vault.adapter.exists("_video-dump"))) await app.vault.adapter.mkdir("_video-dump");
const css = [...document.styleSheets].map((s) => {
  try { return [...s.cssRules].map((r) => r.cssText).join("\n"); }
  catch { return `/* skipped ${s.href} */`; }
}).join("\n\n");
const meta = {
  bodyClass: document.body.className,
  bodyStyle: document.body.getAttribute("style"),
  htmlClass: document.documentElement.className,
};
await app.vault.adapter.write("_video-dump/styles.css", css);
await app.vault.adapter.write("_video-dump/meta.json", JSON.stringify(meta, null, 2));
```

`adapter.write` does not create folders (hence the `mkdir`). Paths are vault-relative Windows paths even when the agent works in WSL; the agent reads them through `/mnt/<drive>/…`. Also ask for a screenshot of the view at the zoom level to reproduce; infer the device pixel ratio from a known width (e.g. `navPaneWidth` in the plugin's `data.json` vs. its pixel width in the screenshot).

The dump contains Obsidian's proprietary `app.css`: fine for local renders, never commit it (`theme/` is git-ignored).

## Import (`templates/scripts/import-theme.mjs`)

- Strip `@font-face` rules whose `url()` points at `public/…` (they only resolve inside Obsidian).
- Escape `</style` → `<\/style` (see hyperframes.md).
- Fonts: body `style` carries overrides such as `--font-interface-override: 霞鹜文楷`. Declare `@font-face` under the **exact family names used there**, localized names included. WSL has no CJK fonts; copy them from `/mnt/c/Windows/Fonts` or `/mnt/c/Users/*/AppData/Local/Microsoft/Windows/Fonts`. Those files arrive read-only: `rm` the target before copying, then `chmod 644`.

## Data snapshot (`templates/scripts/snapshot-vault.mjs`)

- Snapshot markdown content plus `ctime`/`mtime`, and copy `.obsidian/plugins/<id>/data.json` so sort order, pins, expansion state, and widths match the user's setup.
- drvfs (`/mnt/…`) reports no NTFS creation time: read it through `powershell.exe` (`CreationTimeUtc`) or ctime-sorted views come out in the wrong order.
- Parse frontmatter with `yaml`; `getAllTags` must return frontmatter tags **and** inline tags, each prefixed with `#`.

## Shim (`templates/src/shims/obsidian.ts`)

- Vite aliases `obsidian` to the shim at runtime; `tsconfig` maps `obsidian` to the real type package so the plugin source type-checks. Import stage-only exports (`setDemoLanguage`, `addIcon` registry) from the shim path, not from `obsidian`.
- `setIcon`: render lucide's `icons[PascalCase(name)]` as `svg.svg-icon.lucide-<name>`, strip a `lucide-` prefix, and support `addIcon` bodies (0–100 viewBox). Obsidian also has non-lucide glyphs (e.g. `links-going-out`, `links-coming-in`): redraw them from a zoomed screenshot crop.
- Export `TFile`/`TFolder` classes (plugin code uses `instanceof`), `getLanguage` (i18n default), a chainable no-op `Menu`, `normalizePath`, `Platform`.
- Register the plugin's own `addIcon` icons in the host, as `main.ts` would at load.
- Vite: `resolve.dedupe: ["svelte", …]` (plugin files otherwise resolve a second runtime from the plugin's `node_modules`), `server.fs.allow` the plugin `src`, Svelte `compilerOptions.css: "injected"`.

## Shell DOM (`templates/src/stage/obsidian-shell.ts`)

- Recreate the ancestor chain: `.app-container > .horizontal-main-container > .workspace > .workspace-split.mod-left-split > .workspace-tabs > .workspace-tab-container > .workspace-leaf > .workspace-leaf-content[data-type=<view>] > .view-content > <host>`.
- Put `.workspace-sidedock-vault-profile` **before** `.workspace-tabs`: Obsidian reorders it with `order: 1`, and the list's bottom padding comes from `.workspace-tabs:last-of-type`.
- Themes like Border add gutters around the split. Measure the split's offset inside `.app-container` and shift so the frame crops to the split exactly (divide by any ancestor `zoom`).
- Add the scrollbar gutter on the plugin's scroll container (Card Workspace: `.fce-list`, 11 px).
- Mirror every `:hover` rule as `.demo-hover` (walk `document.styleSheets`, recurse into `@media`/`@supports`).
- Apply `meta.bodyClass`/`bodyStyle` to `<body>` before mounting.

## Known residuals

- A few pixels of vertical offset vs. the reference often come from how the screenshot was cropped; don't chase them.
- The vault-profile markup is inferred from CSS selectors; ask for an `outerHTML` dump of `.mod-left-split` if exact fidelity matters.
- Native menus and modals are not rendered by the shim; recreate them per scene when an episode needs them.
