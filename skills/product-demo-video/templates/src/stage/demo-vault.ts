import { parse as parseYaml } from "yaml";
import { TFile, TFolder, type App } from "obsidian";

export interface VaultSnapshotFile {
  path: string;
  ctime: number;
  mtime: number;
  content: string;
}

export interface VaultSnapshot {
  name: string;
  files: VaultSnapshotFile[];
  settings: CardWorkspaceData;
}

/** The subset of the plugin's persisted data.json the stage reads. */
export interface CardWorkspaceData {
  preferences: {
    sort: { field: "mtime" | "ctime" | "name"; direction: "asc" | "desc" };
    cardCornerRadius: "compact" | "medium" | "rounded";
    previewLines: number;
    showNavItemCounts: boolean;
    navSectionOrder: Array<"favorites" | "folders" | "tags" | "properties" | "boxes" | "links">;
    visiblePropertyKeys: string[];
    includeSubfolders: boolean;
  };
  workspace: {
    expandedFolderPaths: string[];
    expandedTagPaths: string[];
    expandedPropertyKeys: string[];
    navPaneWidth: number;
    sectionCollapsed: Record<"favorites" | "folders" | "tags" | "properties" | "boxes" | "links", boolean>;
  };
  userData: {
    boxes: Array<{ id: string; name: string; manualPaths: string[] }>;
    pinnedPaths: string[];
  };
}

interface FileCache {
  frontmatter?: Record<string, unknown>;
  tags?: Array<{ tag: string }>;
}

export interface DemoVault {
  app: App;
  files: TFile[];
  readMarkdown(path: string): string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const INLINE_TAG = /(^|\s)#([\p{L}\p{N}_][\p{L}\p{N}_/-]*)/gu;

function parseFileCache(content: string): FileCache {
  const match = FRONTMATTER.exec(content);
  const body = match ? content.slice(match[0].length) : content;
  const parsed = match ? parseYaml(match[1]) : null;
  const frontmatter = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : undefined;
  const tags = [...body.matchAll(INLINE_TAG)].map((m) => ({ tag: `#${m[2]}` }));
  return { frontmatter, tags };
}

export function createDemoVault(snapshot: VaultSnapshot): DemoVault {
  const root = new TFolder();
  root.name = snapshot.name;
  const folders = new Map<string, TFolder>([["", root]]);

  const ensureFolder = (path: string): TFolder => {
    const existing = folders.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf("/");
    const parent = ensureFolder(slash < 0 ? "" : path.slice(0, slash));
    const folder = new TFolder();
    folder.path = path;
    folder.name = path.slice(slash + 1);
    folder.parent = parent;
    parent.children.push(folder);
    folders.set(path, folder);
    return folder;
  };

  const contentByPath = new Map<string, string>();
  const cacheByPath = new Map<string, FileCache>();
  const files = snapshot.files.map((entry) => {
    const slash = entry.path.lastIndexOf("/");
    const parent = ensureFolder(slash < 0 ? "" : entry.path.slice(0, slash));
    const file = new TFile();
    file.path = entry.path;
    file.name = entry.path.slice(slash + 1);
    const dot = file.name.lastIndexOf(".");
    file.basename = dot > 0 ? file.name.slice(0, dot) : file.name;
    file.extension = dot > 0 ? file.name.slice(dot + 1) : "";
    file.stat = { ctime: entry.ctime, mtime: entry.mtime, size: entry.content.length };
    file.parent = parent;
    parent.children.push(file);
    contentByPath.set(entry.path, entry.content);
    cacheByPath.set(entry.path, parseFileCache(entry.content));
    return file;
  });

  const app = {
    vault: {
      getName: () => snapshot.name,
      getRoot: () => root,
      getMarkdownFiles: () => files,
      getFiles: () => files,
      getAbstractFileByPath: (path: string) => folders.get(path) ?? files.find((file) => file.path === path) ?? null,
      cachedRead: async (file: TFile) => contentByPath.get(file.path) ?? "",
    },
    metadataCache: {
      getFileCache: (file: TFile) => cacheByPath.get(file.path) ?? null,
    },
  } as unknown as App;

  return {
    app,
    files,
    readMarkdown: (path) => contentByPath.get(path) ?? "",
  };
}
