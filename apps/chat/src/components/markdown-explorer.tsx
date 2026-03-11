import { useCallback, useEffect, useRef } from 'react';
import { Clock, FolderOpen, Search, Star, TreePine, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import type { ExplorerTab, FileTreeNode } from '../stores/explorer-store';
import { useExplorerStore, TIME_FILTER_OPTIONS } from '../stores/explorer-store';
import { MarkdownTree } from './markdown-tree';
import { MarkdownFavorites } from './markdown-favorites';
import { MarkdownSearch } from './markdown-search';
import { MarkdownPreview } from './markdown-preview';

const logger = createLogger('MarkdownExplorer');

// ---------------------------------------------------------------------------
// Ignore patterns for the tree — skip heavy dirs and dotfiles
// ---------------------------------------------------------------------------

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  '.turbo',
  '.vercel',
  '__pycache__',
  '.automaker',
  '.vscode',
  '.idea',
  'coverage',
]);

function shouldIgnore(name: string): boolean {
  return IGNORED_NAMES.has(name) || name.startsWith('.');
}

// ---------------------------------------------------------------------------
// Sort: folders first, then alphabetical
// ---------------------------------------------------------------------------

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

// ---------------------------------------------------------------------------
// Path join helper (works on both Windows and POSIX)
// ---------------------------------------------------------------------------

function joinPath(base: string, child: string): string {
  const sep = base.includes('\\') ? '\\' : '/';
  const trimmedBase = base.endsWith(sep) ? base.slice(0, -1) : base;
  return `${trimmedBase}${sep}${child}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarkdownExplorerProps {
  projectPath: string | null;
  onClose: () => void;
}

export function MarkdownExplorer({ projectPath, onClose }: MarkdownExplorerProps) {
  const {
    activeTab,
    searchQuery,
    selectedFilePath,
    fileContent,
    isLoadingContent,
    fileContentError,
    totalFileCount,
    favorites,
    timeFilter,
  } = useExplorerStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      searchQuery: state.searchQuery,
      selectedFilePath: state.selectedFilePath,
      fileContent: state.fileContent,
      isLoadingContent: state.isLoadingContent,
      fileContentError: state.fileContentError,
      totalFileCount: state.totalFileCount,
      favorites: projectPath ? (state.favorites[projectPath] ?? []) : [],
      timeFilter: state.timeFilter,
    }))
  );

  const prevProjectRef = useRef<string | null>(null);

  // ── Load root nodes when project changes ──────────────────────────────
  useEffect(() => {
    if (!projectPath || projectPath === prevProjectRef.current) return;
    prevProjectRef.current = projectPath;

    const store = useExplorerStore.getState();
    store.setProjectPath(projectPath);

    void loadDirectory(projectPath, projectPath);
  }, [projectPath]);

  // ── Load a directory's children ───────────────────────────────────────
  const loadDirectory = useCallback(
    async (dirPath: string, rootPath: string) => {
      const store = useExplorerStore.getState();
      const isRoot = dirPath === rootPath;

      if (isRoot) {
        store.setIsLoadingRoot(true);
      } else {
        store.setChildrenLoading(dirPath, true);
      }

      try {
        const api = getHttpApiClient();
        const result = await api.readdir(dirPath);

        if (!result.success || !result.entries) {
          if (isRoot) store.setRootNodes([], 0);
          return;
        }

        const nodes: FileTreeNode[] = result.entries
          .filter((entry) => !shouldIgnore(entry.name))
          .map((entry) => ({
            name: entry.name,
            path: joinPath(dirPath, entry.name),
            isDirectory: entry.isDirectory,
            children: entry.isDirectory ? null : null,
          }));

        const sorted = sortNodes(nodes);

        if (isRoot) {
          store.setRootNodes(sorted, sorted.length);
        } else {
          store.setChildren(dirPath, sorted);
        }
      } catch (err) {
        logger.error('Failed to load directory', err);
        if (isRoot) store.setRootNodes([], 0);
      }
    },
    []
  );

  // ── Toggle folder expand/collapse ─────────────────────────────────────
  const handleToggleFolder = useCallback(
    (dirPath: string) => {
      const store = useExplorerStore.getState();
      const wasExpanded = store.expandedPaths.has(dirPath);
      store.toggleExpanded(dirPath);

      if (!wasExpanded && projectPath) {
        void loadDirectory(dirPath, projectPath);
      }
    },
    [projectPath, loadDirectory]
  );

  // ── Select a file and load its content ────────────────────────────────
  const handleSelectFile = useCallback(async (filePath: string) => {
    const store = useExplorerStore.getState();
    store.selectFile(filePath);
    store.setIsLoadingContent(true);

    try {
      const api = getHttpApiClient();
      const result = await api.readFile(filePath);

      if (result.success && result.content !== undefined) {
        store.setFileContent(result.content);
      } else {
        store.setFileContent(null, result.error ?? 'Datei konnte nicht gelesen werden.');
      }
    } catch (err) {
      logger.error('Failed to read file', err);
      store.setFileContent(null, 'Fehler beim Laden der Datei.');
    }
  }, []);

  // ── Favorites ─────────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(
    (filePath: string) => {
      if (!projectPath) return;
      useExplorerStore.getState().toggleFavorite(projectPath, filePath);
    },
    [projectPath]
  );

  const handleRemoveFavorite = useCallback(
    (filePath: string) => {
      if (!projectPath) return;
      useExplorerStore.getState().toggleFavorite(projectPath, filePath);
    },
    [projectPath]
  );

  // ── Tab & search ──────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab: ExplorerTab) => {
    useExplorerStore.getState().setActiveTab(tab);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    useExplorerStore.getState().setSearchQuery(value);
  }, []);

  const handleTimeFilterChange = useCallback((hours: number) => {
    useExplorerStore.getState().setTimeFilter(hours);
  }, []);

  const activeTimeLabel = TIME_FILTER_OPTIONS.find((o) => o.value === timeFilter)?.label ?? 'Alle';

  // If there's a selected file, show the preview instead of the tab content
  const showPreview = selectedFilePath !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Dateien</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Datei-Bereich schließen"
          title="Datei-Bereich schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-muted px-2 py-1">
        <TabButton
          active={activeTab === 'tree' && !showPreview}
          icon={<TreePine className="h-3.5 w-3.5" />}
          label="Baum"
          onClick={() => {
            useExplorerStore.getState().selectFile(null);
            handleTabChange('tree');
          }}
        />
        <TabButton
          active={activeTab === 'favorites' && !showPreview}
          icon={<Star className="h-3.5 w-3.5" />}
          label="Favoriten"
          onClick={() => {
            useExplorerStore.getState().selectFile(null);
            handleTabChange('favorites');
          }}
        />
        <TabButton
          active={activeTab === 'search' && !showPreview}
          icon={<Search className="h-3.5 w-3.5" />}
          label="Suche"
          onClick={() => {
            useExplorerStore.getState().selectFile(null);
            handleTabChange('search');
          }}
        />
      </div>

      {/* ── Time filter (visible when not previewing a file) ───────────── */}
      {!showPreview && (
        <div className="flex items-center gap-2 border-b border-muted px-3 py-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <select
            value={timeFilter}
            onChange={(e) => handleTimeFilterChange(Number(e.target.value))}
            className="h-7 flex-1 rounded border border-muted bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Zeitraum filtern"
          >
            {TIME_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {timeFilter > 0 && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              Letzte {activeTimeLabel}
            </span>
          )}
        </div>
      )}

      {/* ── Search input (visible when search tab is active) ───────────── */}
      {activeTab === 'search' && !showPreview && (
        <div className="border-b border-muted px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Datei suchen…"
              className="h-8 border-muted pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showPreview ? (
          <MarkdownPreview
            filePath={selectedFilePath}
            content={fileContent}
            isLoading={isLoadingContent}
            error={fileContentError}
          />
        ) : activeTab === 'tree' ? (
          projectPath ? (
            <MarkdownTree
              projectPath={projectPath}
              onSelectFile={(fp) => void handleSelectFile(fp)}
              onToggleFolder={handleToggleFolder}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Kein Projekt ausgewählt.
            </div>
          )
        ) : activeTab === 'favorites' ? (
          <MarkdownFavorites
            favorites={favorites}
            selectedFilePath={selectedFilePath}
            onSelectFile={(fp) => void handleSelectFile(fp)}
            onRemoveFavorite={handleRemoveFavorite}
          />
        ) : (
          <MarkdownSearch
            query={searchQuery}
            projectPath={projectPath}
            selectedFilePath={selectedFilePath}
            onSelectFile={(fp) => void handleSelectFile(fp)}
            sinceHours={timeFilter > 0 ? timeFilter : undefined}
          />
        )}
      </div>

      {/* ── Footer / Status ────────────────────────────────────────────── */}
      <div className="border-t border-muted px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          {showPreview ? (
            <button
              type="button"
              className="hover:text-foreground transition-colors underline"
              onClick={() => useExplorerStore.getState().selectFile(null)}
            >
              ← Zurück zur Liste
            </button>
          ) : (
            `${totalFileCount} Einträge`
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

interface TabButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function TabButton({ active, icon, label, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors',
        active
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
