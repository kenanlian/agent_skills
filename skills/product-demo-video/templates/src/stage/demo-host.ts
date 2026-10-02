// Stands in for FolderCardView: owns the runtime state a scene scripts, and
// derives every panel group through the plugin's own projection functions.
import MiniSearch from "minisearch";
import { DEFAULT_GROUP_SPEC } from "@plugin/card-grouping-settings";
import { getUiStrings, type UiStrings } from "@plugin/i18n";
import { addIcon, setDemoLanguage } from "../shims/obsidian";
import {
  BULK_ADD_TO_BOX_ICON, BULK_ADD_TO_BOX_ICON_SVG, BULK_REMOVE_FROM_BOX_ICON, BULK_REMOVE_FROM_BOX_ICON_SVG,
  CARD_WORKSPACE_ICON, CARD_WORKSPACE_ICON_SVG, PLAIN_FOLDER_ICON, PLAIN_FOLDER_ICON_SVG,
} from "@plugin/icons";
import { resolvePropertyValueSelection, type PropertyFilterClause } from "@plugin/property-filter-settings";
import { prepareSearchableDocument } from "@plugin/search/document-preparation";
import { buildMatchCountsByPath } from "@plugin/search/match-counts";
import { createMiniSearchOptions, MINISEARCH_SEARCH_OPTIONS } from "@plugin/search/minisearch-options";
import type { SearchableDocument } from "@plugin/search/types";
import { createCardRecord } from "@plugin/view/card-record";
import { compareCards } from "@plugin/view/card-sort";
import type { NavLayoutController } from "@plugin/view/controllers/NavLayoutController";
import { buildNavigationFolderTree } from "@plugin/view/controllers/nav-folder-tree";
import { toggleExpandedKey } from "@plugin/view/controllers/property-nav-expansion";
import { resolveEmptyStateMessage } from "@plugin/view/empty-state";
import { DEFAULT_PREVIEW_MAX_VISIBLE_CHARS, buildLightPreview } from "@plugin/view/markdown-utils";
import { collectScopeTagIndex, getFileFrontmatter } from "@plugin/view/metadata-utils";
import { routeNavigationIntent } from "@plugin/view/navigation-host";
import type { NavigationIntent, NavigationRow } from "@plugin/view/navigation-model";
import { projectNavigation } from "@plugin/view/navigation-projection";
import { buildCardsPanelGroup, buildProjectionPanelGroup } from "@plugin/view/panel-group-state";
import { createPanelModel, type PanelModel, type PanelModelState } from "@plugin/view/panel-model";
import { runPipeline, stepsForScope } from "@plugin/view/pipeline";
import { buildPropertyFacets } from "@plugin/view/property-facets";
import { createFolderScope, normalizeScopePath, scopeDisplayPath, scopeIdentity, type CardScope } from "@plugin/view/scope";
import { collectSupportedFiles } from "@plugin/view/scope-files";
import { resolveSourceCapabilities } from "@plugin/view/source-capabilities";
import { buildTagTree } from "@plugin/view/tag-tree";
import type { NoteCardRecord } from "@plugin/view/types";
import type { CardWorkspaceData, DemoVault } from "./demo-vault";

addIcon(CARD_WORKSPACE_ICON, CARD_WORKSPACE_ICON_SVG);
addIcon(PLAIN_FOLDER_ICON, PLAIN_FOLDER_ICON_SVG);
addIcon(BULK_ADD_TO_BOX_ICON, BULK_ADD_TO_BOX_ICON_SVG);
addIcon(BULK_REMOVE_FROM_BOX_ICON, BULK_REMOVE_FROM_BOX_ICON_SVG);

type NavSectionId = CardWorkspaceData["preferences"]["navSectionOrder"][number];

export interface DemoRuntimeState {
  scope: CardScope;
  /** Draft text in the toolbar input. */
  query: string;
  /** Query the published cards represent; set by `commitQuery`. */
  committedQuery: string;
  selectedPath: string | null;
  pinnedPaths: string[];
  filterTags: string[];
  propertyFilters: PropertyFilterClause[];
  expandedFolderPaths: string[];
  expandedTagPaths: string[];
  expandedPropertyKeys: string[];
  sectionCollapsed: Record<NavSectionId, boolean>;
  navFocusId: string | null;
}

export class DemoHost {
  readonly strings: UiStrings;
  readonly model: PanelModel;
  private readonly cardsByPath = new Map<string, NoteCardRecord>();
  private readonly documents = new Map<string, SearchableDocument>();
  private readonly index = new MiniSearch<SearchableDocument>(createMiniSearchOptions());
  private state: DemoRuntimeState;
  private baseCards: NoteCardRecord[] = [];
  private orderedPaths: string[] | undefined;
  private matchCounts: Record<string, number> = {};
  private generation = 1;
  private sequenceRevision = 1;

  constructor(
    private readonly vault: DemoVault,
    private readonly settings: CardWorkspaceData,
    language: "zh" | "en",
    initial: Partial<DemoRuntimeState> = {},
  ) {
    setDemoLanguage(language);
    this.strings = getUiStrings(language);
    const { previewLines } = settings.preferences;
    for (const file of vault.files) {
      const markdown = vault.readMarkdown(file.path);
      const preview = buildLightPreview(markdown, DEFAULT_PREVIEW_MAX_VISIBLE_CHARS, previewLines);
      this.cardsByPath.set(file.path, {
        ...createCardRecord(vault.app, file, "markdown"),
        previewHtml: preview.html,
        previewMode: preview.mode,
        hydrated: true,
      });
      this.documents.set(file.path, prepareSearchableDocument({
        path: file.path, title: file.basename, markdown,
        mtime: file.stat.mtime, ctime: file.stat.ctime,
      }));
    }
    this.index.addAll([...this.documents.values()]);

    const { workspace, preferences, userData } = settings;
    this.state = {
      scope: createFolderScope("", preferences.includeSubfolders),
      query: "",
      committedQuery: "",
      selectedPath: null,
      pinnedPaths: [...userData.pinnedPaths],
      filterTags: [],
      propertyFilters: [],
      expandedFolderPaths: [...workspace.expandedFolderPaths],
      expandedTagPaths: [...workspace.expandedTagPaths],
      expandedPropertyKeys: [...workspace.expandedPropertyKeys],
      sectionCollapsed: { ...workspace.sectionCollapsed },
      navFocusId: null,
      ...initial,
    };
    this.loadScope();
    if (this.state.committedQuery) this.runSearch(this.state.committedQuery);
    this.model = createPanelModel(this.buildState());
  }

  get runtime(): Readonly<DemoRuntimeState> {
    return this.state;
  }

  setDraftQuery(query: string): void {
    this.state = { ...this.state, query };
    this.model.mutate((draft) => {
      draft.search = this.buildState().search;
    });
  }

  /** Mirrors the search controller's debounced commit, on the scene's schedule. */
  commitQuery(): void {
    this.state = { ...this.state, committedQuery: this.state.query };
    this.runSearch(this.state.committedQuery);
    this.publishAll();
  }

  update(patch: Partial<DemoRuntimeState>): void {
    const scopeChanged = patch.scope !== undefined && scopeIdentity(patch.scope) !== scopeIdentity(this.state.scope);
    this.state = { ...this.state, ...patch };
    if (scopeChanged) {
      this.loadScope();
      this.runSearch(this.state.committedQuery);
    }
    this.publishAll();
  }

  /** Mirrors `FolderCardView.selectFolderFromNav`: folder-to-folder moves reset browse filters. */
  selectFolder(path: string): void {
    const target = normalizeScopePath(path);
    const { scope } = this.state;
    const leaving = scope.kind === "folder" && scope.path !== target;
    this.update({
      scope: createFolderScope(target, this.settings.preferences.includeSubfolders),
      ...(leaving ? { filterTags: [], propertyFilters: [] } : {}),
    });
  }

  handleNavigationIntent(intent: NavigationIntent): void {
    const navLayout = {
      updateQuery: () => {},
      clearQuery: () => {},
      consumeReveal: () => {},
      consumeFocusReturn: () => {},
      setFocus: (rowId: string | null) => this.setNavFocus(rowId),
      getProjection: () => this.model.getState().nav.projection,
      setExpanded: (row: NavigationRow, expanded: boolean) => this.setExpanded(row, expanded),
    } as unknown as NavLayoutController;
    routeNavigationIntent({
      intent,
      navLayout,
      scope: this.state.scope,
      activeTags: this.state.filterTags,
      selectFolder: (path) => this.selectFolder(path),
      switchBox: () => {},
      applyTagFilter: (tags) => this.applyTagFilter(tags),
      activateFavorite: () => {},
      selectPropertyValue: (key, ref, additive) => this.applyPropertyFilters(
        resolvePropertyValueSelection(this.state.propertyFilters, key, ref, additive),
      ),
    });
  }

  /** Mirrors `TagActions.applyTagFilter`: tag and property filters are peers, so a tag selection clears property clauses. */
  private applyTagFilter(tags: string[]): void {
    this.update(tags.length > 0 ? { filterTags: tags, propertyFilters: [] } : { filterTags: tags });
  }

  /** Mirrors the property actions' clause save: a property selection clears the tag filter. */
  private applyPropertyFilters(clauses: PropertyFilterClause[]): void {
    this.update(clauses.length > 0 ? { filterTags: [], propertyFilters: clauses } : { propertyFilters: clauses });
  }

  private setNavFocus(rowId: string | null): void {
    if (rowId === this.state.navFocusId) return;
    this.state = { ...this.state, navFocusId: rowId };
    this.model.mutate((draft) => {
      draft.nav = this.buildState().nav;
    });
  }

  /** The persisted-expansion arm of `NavLayoutController.setExpanded` (no nav query in the stage). */
  private setExpanded(row: NavigationRow, expanded: boolean): void {
    if (!row.expandable || row.expanded === expanded) return;
    const { state } = this;
    if (row.kind === "section") {
      this.update({ sectionCollapsed: { ...state.sectionCollapsed, [row.section]: !expanded } });
    } else if (row.kind === "property") {
      this.update({ expandedPropertyKeys: toggleExpandedKey(state.expandedPropertyKeys, row.propertyKey, expanded) });
    } else if (row.kind === "folder") {
      this.update({ expandedFolderPaths: toggleExpandedKey(state.expandedFolderPaths, row.folderPath, expanded) });
    } else if (row.kind === "tag") {
      this.update({ expandedTagPaths: toggleExpandedKey(state.expandedTagPaths, row.tagPath, expanded) });
    }
  }

  private loadScope(): void {
    const { scope } = this.state;
    const { sort } = this.settings.preferences;
    const files = scope.kind === "folder"
      ? collectSupportedFiles(this.vault.app, scope.path, scope.includeSubfolders)
      : [];
    this.baseCards = files
      .map((file) => this.cardsByPath.get(file.path))
      .filter((card): card is NoteCardRecord => card !== undefined)
      .sort((left, right) => compareCards(left, right, sort.field, sort.direction));
    this.generation += 1;
  }

  private publishAll(): void {
    this.sequenceRevision += 1;
    const next = this.buildState();
    this.model.batch((draft) => {
      draft.scope = next.scope;
      draft.cards = next.cards;
      draft.search = next.search;
      draft.projection = next.projection;
      draft.nav = next.nav;
    });
  }

  private runSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      this.orderedPaths = undefined;
      this.matchCounts = {};
      return;
    }
    const allowed = new Set(this.baseCards.map((card) => card.path));
    const ordered = this.index.search(trimmed, MINISEARCH_SEARCH_OPTIONS)
      .map((result) => String(result.id))
      .filter((path) => allowed.has(path));
    this.orderedPaths = ordered;
    this.matchCounts = buildMatchCountsByPath(trimmed, ordered, this.documents) ?? {};
  }

  private buildState(): PanelModelState {
    const { app } = this.vault;
    const { preferences, workspace, userData } = this.settings;
    const { scope, selectedPath, pinnedPaths, filterTags, propertyFilters } = this.state;
    const strings = this.strings;
    const capabilities = resolveSourceCapabilities(scope);
    const activeTags = capabilities.browseTagFilter ? filterTags : [];
    const activeClauses = capabilities.browsePropertyFilter ? propertyFilters : [];

    const pipeline = runPipeline([...this.baseCards], stepsForScope(scope), {
      app,
      filterTags: activeTags,
      propertyFilters: activeClauses,
      search: { query: this.state.committedQuery, execution: "indexed-ready", orderedPaths: this.orderedPaths },
      pinnedPaths,
      group: { spec: DEFAULT_GROUP_SPEC, buckets: new Map() },
      collapsedGroupKeys: new Set(),
    });

    const tagIndex = collectScopeTagIndex(app, this.baseCards.map((card) => card.file));
    const projection = buildProjectionPanelGroup({
      sortField: preferences.sort.field,
      sortDirection: preferences.sort.direction,
      deriveAvailableTags: () => tagIndex.availableTags,
      deriveTagCounts: () => tagIndex.tagCounts,
      activeFilterTags: filterTags,
      pinnedPaths,
      group: DEFAULT_GROUP_SPEC,
      availableGroupDimensions: [...capabilities.groupDimensions],
      groupSegmentCount: pipeline.segments.length,
    });

    const propertyFacets = buildPropertyFacets(
      this.baseCards, preferences.visiblePropertyKeys, propertyFilters,
      (file) => getFileFrontmatter(app, file), strings.property,
    );
    const folderTree = buildNavigationFolderTree(app);
    const boxSummaries = userData.boxes.map((box) => ({
      id: box.id,
      name: box.name,
      cardCount: box.manualPaths.filter((path) => this.documents.has(path)).length,
    }));
    const includeSubfolders = scope.kind === "folder" ? scope.includeSubfolders : preferences.includeSubfolders;
    const sectionCollapsed = this.state.sectionCollapsed;
    const navProjection = projectNavigation({
      query: "",
      scope,
      activeTags: filterTags,
      selectedPath,
      favorites: [],
      folders: folderTree,
      tags: buildTagTree(tagIndex.availableTags),
      boxes: boxSummaries,
      tagCounts: tagIndex.tagCounts,
      includeSubfolders,
      tagsDisabled: !capabilities.browseTagFilter,
      propertiesDisabled: !capabilities.browsePropertyFilter,
      sectionCollapsed,
      sectionOrder: preferences.navSectionOrder,
      sectionLabels: {
        favorites: { label: strings.toolbar.navPane.favoritesSection, emptyLabel: strings.toolbar.navPane.favoritesEmpty },
        folders: { label: strings.toolbar.navPane.foldersSection, emptyLabel: null },
        tags: { label: strings.toolbar.navPane.tagsSection, emptyLabel: null },
        properties: { label: strings.property.sectionLabel, emptyLabel: strings.property.sectionEmpty },
        boxes: { label: strings.toolbar.navPane.boxesSection, emptyLabel: strings.toolbar.navPane.boxesEmpty },
        links: { label: strings.links.sectionLabel, emptyLabel: null },
      },
      rootFolderLabel: strings.toolbar.folderMenu.rootFolder,
      expansion: {
        folders: { manual: this.state.expandedFolderPaths, reveal: [], query: [], suppressed: [] },
        tags: { manual: this.state.expandedTagPaths, reveal: [], query: [], suppressed: [] },
        properties: { manual: this.state.expandedPropertyKeys, reveal: [], query: [], suppressed: [] },
        queryCollapsedSections: [],
      },
      properties: propertyFacets,
      propertyClauses: propertyFilters,
      linksLeafLabels: { backlinks: strings.links.directionBacklinks, outgoing: strings.links.directionOutgoing },
      linksDisabled: selectedPath === null,
    });

    const displayPath = scopeDisplayPath(scope);
    return {
      strings,
      scope: {
        displayPath: displayPath === "" ? "/" : displayPath,
        includeSubfolders,
        activeBoxId: scope.kind === "box" ? scope.boxId : null,
        activeBoxName: scope.kind === "box" ? userData.boxes.find((box) => box.id === scope.boxId)?.name ?? null : null,
        boxExcludedCount: 0,
        emptyStateMessage: resolveEmptyStateMessage({
          strings, query: this.state.committedQuery.trim(), activeTagCount: activeTags.length,
          baseCardCount: this.baseCards.length, visibleCardCount: pipeline.cards.length,
          propertyClauseCount: activeClauses.length,
        }),
        sourceIdentity: scopeIdentity(scope),
        browseTagFilterEnabled: capabilities.browseTagFilter,
        browsePropertyFilterEnabled: capabilities.browsePropertyFilter,
        supportsIncludeSubfolders: capabilities.supportsIncludeSubfolders,
        supportsBoxRuleSeeding: capabilities.supportsBoxRuleSeeding,
      },
      cards: buildCardsPanelGroup({
        records: pipeline.cards,
        searchMatchCountsByPath: this.matchCounts,
        selectedPath,
        loading: false,
        generation: this.generation,
        sequenceRevision: this.sequenceRevision,
        hydrationRevision: 1,
        groupSegments: pipeline.segments,
        groupRevision: 1,
      }),
      search: {
        query: this.state.query,
        committedQuery: this.state.committedQuery,
        status: "ready",
        focusToken: 0,
      },
      projection,
      bulk: {
        bulkMode: false, selectedPaths: [], selectedCount: 0, bulkAnchorPath: null,
        canBulkSelectAll: false, canBulkClearSelection: false, canBulkMoveSelected: false,
        canBulkAddTagSelected: false, canBulkRemoveTagSelected: false, canBulkDeleteSelected: false,
        canBulkMergeSelected: false,
      },
      nav: {
        folderTree,
        favorites: [],
        boxSummaries,
        paneWidth: workspace.navPaneWidth,
        layoutMode: "dual",
        visible: true,
        sectionCollapsed,
        showItemCounts: preferences.showNavItemCounts,
        tooltipSide: "right",
        propertyFilterCount: propertyFilters.reduce((total, clause) => total + clause.values.length, 0),
        visibleGroupProperties: propertyFacets.map(({ key, label }) => ({ key, label })),
        projection: navProjection,
        query: "",
        focusId: this.state.navFocusId,
        focusRequest: null,
        revealRequest: null,
      },
      appearance: { cardCornerRadius: preferences.cardCornerRadius, previewLines: preferences.previewLines },
    };
  }
}
