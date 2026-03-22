import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: FileTreeNode[] | null;
  isLoading?: boolean;
}

export type ExplorerTab = 'tree' | 'favorites' | 'search';

/** 0 = alle Dateien, sonst Stundenzahl */
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
  { value: 720, label: '30 Tage' },
];

export interface ExplorerStoreState {
  // Tree state
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

  // Favorites (per-project, keyed by projectPath)
  favorites: Record<string, string[]>;

  // Status
  totalFileCount: number;
  projectPath: string | null;

  // Actions
  setProjectPath: (projectPath: string | null) => void;
  setRootNodes: (nodes: FileTreeNode[], totalCount: number) => void;
  setIsLoadingRoot: (loading: boolean) => void;
  toggleExpanded: (path: string) => void;
  setExpanded: (path: string, expanded: boolean) => void;
  setChildren: (parentPath: string, children: FileTreeNode[]) => void;
  setChildrenLoading: (parentPath: string, loading: boolean) => void;
  selectFile: (filePath: string | null) => void;
  setFileContent: (content: string | null, error?: string | null) => void;
  setIsLoadingContent: (loading: boolean) => void;
  setActiveTab: (tab: ExplorerTab) => void;
  setSearchQuery: (query: string) => void;
  setTimeFilter: (hours: ExplorerTimeFilter) => void;
  toggleFavorite: (projectPath: string, filePath: string) => void;
  isFavorite: (projectPath: string, filePath: string) => boolean;
  getFavorites: (projectPath: string) => string[];
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAVORITES_STORAGE_KEY = 'automaker-explorer-favorites';
const TIME_FILTER_STORAGE_KEY = 'automaker-explorer-time-filter';

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

function updateNodeChildren(
  nodes: FileTreeNode[],
  parentPath: string,
  children: FileTreeNode[]
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === parentPath) {
      return { ...node, children, isLoading: false };
    }
    if (node.children && node.isDirectory) {
      return { ...node, children: updateNodeChildren(node.children, parentPath, children) };
    }
    return node;
  });
}

function setNodeLoading(
  nodes: FileTreeNode[],
  parentPath: string,
  loading: boolean
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === parentPath) {
      return { ...node, isLoading: loading };
    }
    if (node.children && node.isDirectory) {
      return { ...node, children: setNodeLoading(node.children, parentPath, loading) };
    }
    return node;
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useExplorerStore = create<ExplorerStoreState>()((set, get) => ({
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

  favorites: loadFavorites(),

  totalFileCount: 0,
  projectPath: null,

  setProjectPath: (projectPath) =>
    set({
      projectPath,
      rootNodes: [],
      expandedPaths: new Set(),
      selectedFilePath: null,
      fileContent: null,
      fileContentError: null,
      isLoadingRoot: false,
      isLoadingContent: false,
      searchQuery: '',
      totalFileCount: 0,
    }),

  setRootNodes: (nodes, totalCount) =>
    set({ rootNodes: nodes, totalFileCount: totalCount, isLoadingRoot: false }),

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

  setExpanded: (path, expanded) =>
    set((state) => {
      const next = new Set(state.expandedPaths);
      if (expanded) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return { expandedPaths: next };
    }),

  setChildren: (parentPath, children) =>
    set((state) => ({
      rootNodes: updateNodeChildren(state.rootNodes, parentPath, children),
    })),

  setChildrenLoading: (parentPath, loading) =>
    set((state) => ({
      rootNodes: setNodeLoading(state.rootNodes, parentPath, loading),
    })),

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
    set({ timeFilter: hours });
  },

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

  reset: () =>
    set({
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
      projectPath: null,
    }),
}));
