/**
 * Explorer Store - File tree state for the right-panel Files tab.
 *
 * Uses a batch approach: one API call loads all markdown files with timestamps,
 * then the tree is built client-side from the flat file list.
 */

import { create } from 'zustand';
import {
  type SortBy,
  filterFilesByTime,
  sortTreeChildren,
  annotateFolderMeta,
} from '@/components/views/agent-view/components/files-panel/tree-utils';

export type { SortBy };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw file entry from the server (flat list) */
export interface MarkdownFileEntry {
  name: string;
  path: string;
  modified: number;
  created: number;
  size: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileTreeNode[];
  /** Last modified timestamp (ms) - for files: from stat, for folders: newest child */
  modified?: number;
  /** Created timestamp (ms) - for files: from stat, for folders: newest child */
  created?: number;
  /** File size in bytes (files only) */
  size?: number;
  /** Recursive file count (directories only, set by annotateFolderMeta) */
  fileCount?: number;
}

export type ExplorerTab = 'tree' | 'favorites' | 'search';

/** 0 = all files, otherwise hours */
export type ExplorerTimeFilter = number;

export interface TimeFilterOption {
  value: number;
  label: string;
}

export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
  { value: 0, label: 'Alle' },
  { value: 12, label: '12 Stunden' },
  { value: 24, label: '1 Tag' },
  { value: 48, label: '2 Tage' },
  { value: 96, label: '4 Tage' },
  { value: 168, label: '1 Woche' },
  { value: 336, label: '14 Tage' },
  { value: 720, label: '30 Tage' },
];

export interface SortOption {
  value: SortBy;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'modified', label: 'Zuletzt geaendert' },
  { value: 'created', label: 'Zuletzt erstellt' },
  { value: 'name', label: 'Name A-Z' },
];

export interface HighlightWindowOption {
  value: number;
  label: string;
}

export const HIGHLIGHT_WINDOW_OPTIONS: HighlightWindowOption[] = [
  { value: 0, label: 'Kein Highlight' },
  { value: 1, label: '1 Stunde' },
  { value: 2, label: '2 Stunden' },
  { value: 6, label: '6 Stunden' },
  { value: 12, label: '12 Stunden' },
  { value: 24, label: '24 Stunden' },
];

export interface ExplorerStoreState {
  // Raw data from server
  allFiles: MarkdownFileEntry[];

  // Tree state (built from allFiles)
  rootNodes: FileTreeNode[];
  expandedPaths: Set<string>;
  selectedFilePath: string | null;
  isLoadingRoot: boolean;

  // File preview
  fileContent: string | null;
  isLoadingContent: boolean;
  fileContentError: string | null;

  // Tabs & search
  activeTab: ExplorerTab;
  searchQuery: string;

  // Time filter (0 = all, otherwise hours)
  timeFilter: ExplorerTimeFilter;

  // Sorting
  sortBy: SortBy;

  // Recency highlight window (hours, 0 = disabled, default 6)
  highlightWindow: number;

  // Favorites (per-project, keyed by projectPath)
  favorites: Record<string, string[]>;

  // Terminal in files panel (per-project)
  terminalOpenByProject: Record<string, boolean>;
  terminalSizeByProject: Record<string, number>;

  // Status
  totalFileCount: number;
  filteredFileCount: number;
  projectPath: string | null;

  // Actions
  setProjectPath: (projectPath: string | null) => void;
  setAllFiles: (files: MarkdownFileEntry[], projectPath: string) => void;
  setIsLoadingRoot: (loading: boolean) => void;
  toggleExpanded: (path: string) => void;
  selectFile: (filePath: string | null) => void;
  setFileContent: (content: string | null, error?: string | null) => void;
  setIsLoadingContent: (loading: boolean) => void;
  setActiveTab: (tab: ExplorerTab) => void;
  setSearchQuery: (query: string) => void;
  setTimeFilter: (hours: ExplorerTimeFilter) => void;
  setSortBy: (sortBy: SortBy) => void;
  setHighlightWindow: (hours: number) => void;
  collapseAll: () => void;
  toggleFavorite: (projectPath: string, filePath: string) => void;
  isFavorite: (projectPath: string, filePath: string) => boolean;
  getFavorites: (projectPath: string) => string[];
  setTerminalOpen: (projectPath: string, open: boolean) => void;
  getTerminalOpen: (projectPath: string) => boolean;
  setTerminalSize: (projectPath: string, size: number) => void;
  getTerminalSize: (projectPath: string) => number;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAVORITES_STORAGE_KEY = 'automaker-explorer-favorites';
const TIME_FILTER_STORAGE_KEY = 'automaker-explorer-time-filter';
const HIGHLIGHT_WINDOW_STORAGE_KEY = 'automaker-explorer-highlight-window';
const SORT_BY_STORAGE_KEY = 'automaker-explorer-sort-by';
const TERMINAL_OPEN_STORAGE_KEY = 'automaker-explorer-terminal-open';
const TERMINAL_SIZE_STORAGE_KEY = 'automaker-explorer-terminal-size';

function loadTimeFilter(): ExplorerTimeFilter {
  try {
    const raw = localStorage.getItem(TIME_FILTER_STORAGE_KEY);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveTimeFilter(hours: ExplorerTimeFilter): void {
  try {
    localStorage.setItem(TIME_FILTER_STORAGE_KEY, String(hours));
  } catch {
    // Ignore storage errors
  }
}

function loadHighlightWindow(): number {
  try {
    const raw = localStorage.getItem(HIGHLIGHT_WINDOW_STORAGE_KEY);
    if (!raw) return 6;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : 6;
  } catch {
    return 6;
  }
}

function saveHighlightWindow(hours: number): void {
  try {
    localStorage.setItem(HIGHLIGHT_WINDOW_STORAGE_KEY, String(hours));
  } catch {
    // Ignore storage errors
  }
}

function loadSortBy(): SortBy {
  try {
    const raw = localStorage.getItem(SORT_BY_STORAGE_KEY);
    if (raw === 'modified' || raw === 'created' || raw === 'name') return raw;
    return 'modified';
  } catch {
    return 'modified';
  }
}

function saveSortBy(sortBy: SortBy): void {
  try {
    localStorage.setItem(SORT_BY_STORAGE_KEY, sortBy);
  } catch {
    // Ignore storage errors
  }
}

/** Default terminal panel size in percent (35% of files panel height). */
export const DEFAULT_TERMINAL_SIZE = 35;
const MIN_TERMINAL_SIZE = 15;
const MAX_TERMINAL_SIZE = 85;

function clampTerminalSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_TERMINAL_SIZE;
  return Math.max(MIN_TERMINAL_SIZE, Math.min(MAX_TERMINAL_SIZE, size));
}

function loadTerminalOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(TERMINAL_OPEN_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveTerminalOpen(data: Record<string, boolean>): void {
  try {
    localStorage.setItem(TERMINAL_OPEN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function loadTerminalSize(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TERMINAL_SIZE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveTerminalSize(data: Record<string, number>): void {
  try {
    localStorage.setItem(TERMINAL_SIZE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function loadFavorites(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveFavorites(favorites: Record<string, string[]>): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Internal helper: filter → build → sort → annotate pipeline.
 */
function rebuildTree(
  allFiles: MarkdownFileEntry[],
  projectPath: string,
  timeFilter: number,
  sortBy: SortBy
): { rootNodes: FileTreeNode[]; filteredFileCount: number } {
  const filtered = filterFilesByTime(allFiles, timeFilter);
  const rawNodes = buildTreeFromFiles(filtered, projectPath);
  const sortedNodes = sortTreeChildren(rawNodes, sortBy);
  annotateFolderMeta(sortedNodes);
  return { rootNodes: sortedNodes, filteredFileCount: filtered.length };
}

/**
 * Build a hierarchical tree from a flat list of file entries.
 * Folders are created implicitly from file paths.
 * Folder timestamps = newest child's timestamps.
 *
 * Adapted from the VSCode extension's buildTreeData().
 */
export function buildTreeFromFiles(
  files: MarkdownFileEntry[],
  projectPath: string
): FileTreeNode[] {
  // Normalize project path separator for comparison
  const normalizedProject = projectPath.replace(/\\/g, '/');

  interface FolderNode {
    name: string;
    path: string; // absolute path
    children: Map<string, FolderNode | FileLeaf>;
    modified: number;
    created: number;
  }

  interface FileLeaf {
    name: string;
    path: string; // absolute path
    modified: number;
    created: number;
    size: number;
  }

  const root: FolderNode = {
    name: '',
    path: projectPath,
    children: new Map(),
    modified: 0,
    created: 0,
  };

  for (const file of files) {
    // Get relative path from project root
    const normalizedFilePath = file.path.replace(/\\/g, '/');
    let relativePath = normalizedFilePath;
    if (normalizedFilePath.startsWith(normalizedProject)) {
      relativePath = normalizedFilePath.slice(normalizedProject.length);
      if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    }

    const parts = relativePath.split('/');
    let current = root;

    // Create/traverse folder nodes for each path segment except the last (file name)
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      let existing = current.children.get(folderName);

      if (!existing || !('children' in existing)) {
        // Build absolute path for this folder
        const folderAbsPath = projectPath + '/' + parts.slice(0, i + 1).join('/');
        const folder: FolderNode = {
          name: folderName,
          path: folderAbsPath.replace(/\//g, projectPath.includes('\\') ? '\\' : '/'),
          children: new Map(),
          modified: file.modified,
          created: file.created,
        };
        current.children.set(folderName, folder);
        existing = folder;
      } else {
        // Update folder timestamps to track newest child
        if (file.modified > existing.modified) existing.modified = file.modified;
        if (file.created > existing.created) existing.created = file.created;
      }

      current = existing as FolderNode;
    }

    // Add the file leaf
    const leaf: FileLeaf = {
      name: file.name,
      path: file.path,
      modified: file.modified,
      created: file.created,
      size: file.size,
    };
    current.children.set(file.name, leaf);

    // Update parent folder timestamps
    if (file.modified > current.modified) current.modified = file.modified;
    if (file.created > current.created) current.created = file.created;
  }

  // Convert to FileTreeNode array, sorted: folders first (alphabetical), then files (alphabetical)
  function toTreeNodes(folder: FolderNode): FileTreeNode[] {
    const folders: FileTreeNode[] = [];
    const fileNodes: FileTreeNode[] = [];

    for (const child of folder.children.values()) {
      if ('children' in child) {
        // It's a folder
        const childNodes = toTreeNodes(child as FolderNode);
        // Only include folders that have children (skip empty folders)
        if (childNodes.length > 0) {
          folders.push({
            name: child.name,
            path: child.path,
            isDirectory: true,
            children: childNodes,
            modified: child.modified,
            created: child.created,
          });
        }
      } else {
        // It's a file
        fileNodes.push({
          name: child.name,
          path: child.path,
          isDirectory: false,
          children: [],
          modified: child.modified,
          created: child.created,
          size: child.size,
        });
      }
    }

    // Sort folders alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    // Sort files alphabetically
    fileNodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return [...folders, ...fileNodes];
  }

  return toTreeNodes(root);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useExplorerStore = create<ExplorerStoreState>()((set, get) => ({
  allFiles: [],
  rootNodes: [],
  expandedPaths: new Set<string>(),
  selectedFilePath: null,
  isLoadingRoot: false,

  fileContent: null,
  isLoadingContent: false,
  fileContentError: null,

  activeTab: 'tree',
  searchQuery: '',
  timeFilter: loadTimeFilter(),
  sortBy: loadSortBy(),
  highlightWindow: loadHighlightWindow(),

  favorites: loadFavorites(),

  terminalOpenByProject: loadTerminalOpen(),
  terminalSizeByProject: loadTerminalSize(),

  totalFileCount: 0,
  filteredFileCount: 0,
  projectPath: null,

  setProjectPath: (projectPath) =>
    set({
      projectPath,
      allFiles: [],
      rootNodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      fileContent: null,
      fileContentError: null,
      isLoadingRoot: false,
      isLoadingContent: false,
      searchQuery: '',
      totalFileCount: 0,
      filteredFileCount: 0,
    }),

  setAllFiles: (files, projectPath) => {
    const { timeFilter, sortBy } = get();
    const { rootNodes, filteredFileCount } = rebuildTree(files, projectPath, timeFilter, sortBy);
    set({
      allFiles: files,
      rootNodes,
      totalFileCount: files.length,
      filteredFileCount,
      isLoadingRoot: false,
    });
  },

  setIsLoadingRoot: (loading) => set({ isLoadingRoot: loading }),

  toggleExpanded: (path) =>
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { expandedPaths: next };
    }),

  selectFile: (filePath) =>
    set({
      selectedFilePath: filePath,
      fileContent: null,
      fileContentError: null,
      isLoadingContent: false,
    }),

  setFileContent: (content, error) =>
    set({
      fileContent: content,
      fileContentError: error ?? null,
      isLoadingContent: false,
    }),

  setIsLoadingContent: (loading) => set({ isLoadingContent: loading }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setTimeFilter: (hours) => {
    saveTimeFilter(hours);
    const state = get();
    if (!state.projectPath || state.allFiles.length === 0) {
      set({ timeFilter: hours });
      return;
    }
    const { rootNodes, filteredFileCount } = rebuildTree(
      state.allFiles,
      state.projectPath,
      hours,
      state.sortBy
    );
    set({ timeFilter: hours, rootNodes, filteredFileCount });
  },

  setSortBy: (sortBy) => {
    saveSortBy(sortBy);
    const state = get();
    if (!state.projectPath || state.allFiles.length === 0) {
      set({ sortBy });
      return;
    }
    const { rootNodes, filteredFileCount } = rebuildTree(
      state.allFiles,
      state.projectPath,
      state.timeFilter,
      sortBy
    );
    set({ sortBy, rootNodes, filteredFileCount });
  },

  setHighlightWindow: (hours) => {
    saveHighlightWindow(hours);
    set({ highlightWindow: hours });
  },

  collapseAll: () => set({ expandedPaths: new Set() }),

  toggleFavorite: (projectPath, filePath) =>
    set((state) => {
      const current = state.favorites[projectPath] ?? [];
      const exists = current.includes(filePath);
      const next = exists ? current.filter((p) => p !== filePath) : [...current, filePath];
      const favorites = { ...state.favorites, [projectPath]: next };
      saveFavorites(favorites);
      return { favorites };
    }),

  isFavorite: (projectPath, filePath) => {
    const state = get();
    return (state.favorites[projectPath] ?? []).includes(filePath);
  },

  getFavorites: (projectPath) => {
    const state = get();
    return state.favorites[projectPath] ?? [];
  },

  setTerminalOpen: (projectPath, open) =>
    set((state) => {
      const next = { ...state.terminalOpenByProject, [projectPath]: open };
      saveTerminalOpen(next);
      return { terminalOpenByProject: next };
    }),

  getTerminalOpen: (projectPath) => {
    return get().terminalOpenByProject[projectPath] ?? false;
  },

  setTerminalSize: (projectPath, size) =>
    set((state) => {
      const clamped = clampTerminalSize(size);
      const next = { ...state.terminalSizeByProject, [projectPath]: clamped };
      saveTerminalSize(next);
      return { terminalSizeByProject: next };
    }),

  getTerminalSize: (projectPath) => {
    const raw = get().terminalSizeByProject[projectPath];
    return raw != null ? clampTerminalSize(raw) : DEFAULT_TERMINAL_SIZE;
  },

  reset: () =>
    set({
      allFiles: [],
      rootNodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      fileContent: null,
      fileContentError: null,
      isLoadingRoot: false,
      isLoadingContent: false,
      activeTab: 'tree',
      searchQuery: '',
      timeFilter: 0,
      totalFileCount: 0,
      filteredFileCount: 0,
      projectPath: null,
    }),
}));
