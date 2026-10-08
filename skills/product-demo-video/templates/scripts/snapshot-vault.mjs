// Snapshots the demo vault's notes, timestamps, and Card Workspace settings into
// data/vault.json so every render uses the same data regardless of later edits.
import { execFileSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";

// Demo notes and plugin settings. Theme dump stays on Card-Workspace-Docs/_video-dump.
const vaultDir = process.env.VAULT_DIR ?? "/mnt/d/Kenan/OBSIDIAN/Card-Workspace-Docs-zh";
const outFile = new URL("../data/vault.json", import.meta.url);

async function collectMarkdown(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await collectMarkdown(full)));
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

// drvfs does not expose NTFS creation time, and the plugin sorts by it.
function readWindowsTimes(dir) {
  if (!dir.startsWith("/mnt/")) return null;
  const winDir = execFileSync("wslpath", ["-w", dir], { encoding: "utf8" }).trim();
  const script = [
    `Get-ChildItem -LiteralPath '${winDir.replace(/'/g, "''")}' -Recurse -Filter *.md`,
    `| ForEach-Object { '{0}|{1}|{2}' -f ([DateTimeOffset]$_.CreationTimeUtc).ToUnixTimeMilliseconds(),`,
    `([DateTimeOffset]$_.LastWriteTimeUtc).ToUnixTimeMilliseconds(), $_.FullName.Substring(${winDir.length + 1}) }`,
  ].join(" ");
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command",
    `[Console]::OutputEncoding = [Text.Encoding]::UTF8; ${script}`], { encoding: "utf8" });
  const times = new Map();
  for (const line of raw.split(/\r?\n/)) {
    const [ctime, mtime, path] = line.split("|");
    if (path) times.set(path.replaceAll("\\", "/"), { ctime: Number(ctime), mtime: Number(mtime) });
  }
  return times;
}

const windowsTimes = readWindowsTimes(vaultDir);
const files = [];
for (const full of (await collectMarkdown(vaultDir)).sort()) {
  const path = relative(vaultDir, full).split(sep).join("/");
  const stats = await stat(full);
  const times = windowsTimes?.get(path) ?? {
    ctime: stats.birthtimeMs || stats.mtimeMs,
    mtime: stats.mtimeMs,
  };
  files.push({ path, ...times, content: await readFile(full, "utf8") });
}

const settingsPath = join(vaultDir, ".obsidian/plugins/card-workspace/data.json");
const settings = JSON.parse(await readFile(settingsPath, "utf8"));

await writeFile(outFile, `${JSON.stringify({ name: basename(vaultDir), files, settings }, null, 2)}\n`);
console.log(`Snapshot: ${files.length} notes from ${vaultDir}`);
