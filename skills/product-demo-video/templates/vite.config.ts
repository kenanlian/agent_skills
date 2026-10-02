import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
export const pluginSrc = fileURLToPath(new URL("../obsidian-card-workspace/src", import.meta.url));

export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: "injected" } })],
  resolve: {
    alias: {
      obsidian: fileURLToPath(new URL("./src/shims/obsidian.ts", import.meta.url)),
      "@plugin": pluginSrc,
    },
    // Plugin files resolve bare imports from the plugin's own node_modules; a
    // second Svelte runtime would break reactivity.
    dedupe: ["svelte", "minisearch"],
  },
  server: {
    fs: { allow: [root, pluginSrc] },
  },
});
