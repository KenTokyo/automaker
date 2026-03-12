/**
 * FilesPanel - Project file explorer for the right panel.
 *
 * Shows only markdown files (.md/.mdx/.markdown) loaded in a single batch.
 * Provides tree browsing, search, favorites, time filtering, and file preview.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  ArrowDownAZ,
  ChevronsDownUp,
  Clock,
  Highlighter,
  RefreshCw,
  Search,
  Star,
  TreePine,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore } from '@/store/app-store';
import type { ExplorerTab } from '@/store/explorer-store';
import {
  useExplorerStore,
  TIME_FILTER_OPTIONS,
  SORT_OPTIONS,
  HIGHLIGHT_WINDOW_OPTIONS,
  DEFAULT_TERMINAL_SIZE,
} from '@/store/explorer-store';
import { FileTree } from './file-tree';
import { FileFavorites } from './file-favorites';
import { FileSearch } from './file-search';
import { FilePreview } from './file-preview';
import { FilesPanelTerminalToggle } from './files-panel-terminal-toggle';
import { FilesPanelTerminalSplit } from './files-panel-terminal-split';

const logger = createLogger('FilesPanel');
const EMPTY_FAVORITES: string[] = [];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FilesPanelProps {
  projectPath: string;
}

export function FilesPanel({ projectPath }: FilesPanelProps) {
  const {
    activeTab,
    searchQuery,
    selectedFilePath,
    fileContent,
    isLoadingContent,
    fileContentError,
    totalFileCount,
    filteredFileCount,
    favorites,
    timeFilter,
    sortBy,
    highlightWindow,
    terminalOpen,
    terminalSize,
  } = useExplorerStore(
    useShallow((state) => ({
      activeTab: state.activeTab,
      searchQuery: state.searchQuery,
      selectedFilePath: state.selectedFilePath,
      fileContent: state.fileContent,
      isLoadingContent: state.isLoadingContent,
      fileContentError: state.fileContentError,
      totalFileCount: state.totalFileCount,
      filteredFileCount: state.filteredFileCount,
      favorites: state.favorites[projectPath] ?? EMPTY_FAVORITES,
      timeFilter: state.timeFilter,
      sortBy: state.sortBy,
      highlightWindow: state.highlightWindow,
      terminalOpen: state.terminalOpenByProject[projectPath] ?? false,
      terminalSize: state.terminalSizeByProject[projectPath] ?? DEFAULT_TERMINAL_SIZE,
    }))
  );

  const prevProjectRef = useRef<string | null>(null);

  // Load all markdown files when project changes
  useEffect(() => {
    if (!projectPath || projectPath === prevProjectRef.current) return;
    prevProjectRef.current = projectPath;

    const store = useExplorerStore.getState();
    store.setProjectPath(projectPath);

    void loadAllMarkdownFiles(projectPath);
  }, [projectPath]);

  // Load all markdown files in one batch call
  const loadAllMarkdownFiles = useCallback(async (path: string) => {
    const store = useExplorerStore.getState();
    store.setIsLoadingRoot(true);

    try {
      const api = getHttpApiClient();
      const result = await api.explorerFilesByTime(path, 0, 1000);

      if (result.success && result.files) {
        store.setAllFiles(result.files, path);
      } else {
        store.setAllFiles([], path);
      }
    } catch (err) {
      logger.error('Failed to load markdown files', err);
      store.setAllFiles([], path);
    }
  }, []);

  // Toggle folder expand/collapse (no lazy loading needed - all data already loaded)
  const handleToggleFolder = useCallback((dirPath: string) => {
    useExplorerStore.getState().toggleExpanded(dirPath);
  }, []);

  // Select a file and load its content
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

  // Favorites
  const handleToggleFavorite = useCallback(
    (filePath: string) => {
      useExplorerStore.getState().toggleFavorite(projectPath, filePath);
    },
    [projectPath]
  );

  const handleRemoveFavorite = useCallback(
    (filePath: string) => {
      useExplorerStore.getState().toggleFavorite(projectPath, filePath);
    },
    [projectPath]
  );

  // Tab & search
  const handleTabChange = useCallback((tab: ExplorerTab) => {
    useExplorerStore.getState().setActiveTab(tab);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    useExplorerStore.getState().setSearchQuery(value);
  }, []);

  const handleTimeFilterChange = useCallback((hours: number) => {
    useExplorerStore.getState().setTimeFilter(hours);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    useExplorerStore.getState().setSortBy(value as 'modified' | 'created' | 'name');
  }, []);

  const handleHighlightWindowChange = useCallback((hours: number) => {
    useExplorerStore.getState().setHighlightWindow(hours);
  }, []);

  const handleCollapseAll = useCallback(() => {
    useExplorerStore.getState().collapseAll();
  }, []);

  const handleRefresh = useCallback(() => {
    void loadAllMarkdownFiles(projectPath);
  }, [projectPath, loadAllMarkdownFiles]);

  const handleTerminalToggle = useCallback(() => {
    useExplorerStore.getState().setTerminalOpen(projectPath, !terminalOpen);
  }, [projectPath, terminalOpen]);

  const handleTerminalResize = useCallback(
    (size: number) => {
      useExplorerStore.getState().setTerminalSize(projectPath, size);
    },
    [projectPath]
  );

  const filesFontSize = useAppStore((s) => s.filesPanelFontSize);

  const isFiltered = timeFilter > 0;
  const showPreview = selectedFilePath !== null;

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ fontSize: `${filesFontSize}px` }}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
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

      {/* Toolbar (visible when not previewing a file) */}
      {!showPreview && (
        <div className="border-b border-border px-2 py-1.5 space-y-1">
          {/* Row 1: Sort + Time filter + Highlight window */}
          <div className="flex items-center gap-1">
            <ArrowDownAZ className="h-3 w-3 shrink-0 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Sortierung"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Clock className="h-3 w-3 shrink-0 text-muted-foreground ml-1" />
            <select
              value={timeFilter}
              onChange={(e) => handleTimeFilterChange(Number(e.target.value))}
              className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Zeitfilter"
            >
              {TIME_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <Highlighter className="h-3 w-3 shrink-0 text-muted-foreground ml-1" />
            <select
              value={highlightWindow}
              onChange={(e) => handleHighlightWindowChange(Number(e.target.value))}
              className="h-6 min-w-0 flex-1 rounded border border-border bg-transparent px-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Highlight-Fenster"
            >
              {HIGHLIGHT_WINDOW_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Collapse + Refresh + File count */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={handleCollapseAll}
              title="Alle zuklappen"
            >
              <ChevronsDownUp className="h-3 w-3" />
              Collapse
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={handleRefresh}
              title="Daten neu laden"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
            <FilesPanelTerminalToggle open={terminalOpen} onToggle={handleTerminalToggle} />
            {totalFileCount > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">
                {isFiltered
                  ? `${filteredFileCount} von ${totalFileCount}`
                  : `${totalFileCount} Dateien`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search input (visible when search tab is active) */}
      {activeTab === 'search' && !showPreview && (
        <div className="border-b border-border px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Datei suchen..."
              className="h-8 border-border pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Main content area (may be split with terminal) */}
      {terminalOpen ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <FilesPanelTerminalSplit
            terminalSize={terminalSize}
            onTerminalResize={handleTerminalResize}
          >
            <FilesContent
              showPreview={showPreview}
              selectedFilePath={selectedFilePath}
              fileContent={fileContent}
              isLoadingContent={isLoadingContent}
              fileContentError={fileContentError}
              activeTab={activeTab}
              projectPath={projectPath}
              searchQuery={searchQuery}
              favorites={favorites}
              timeFilter={timeFilter}
              isFiltered={isFiltered}
              totalFileCount={totalFileCount}
              filteredFileCount={filteredFileCount}
              onSelectFile={handleSelectFile}
              onToggleFolder={handleToggleFolder}
              onToggleFavorite={handleToggleFavorite}
              onRemoveFavorite={handleRemoveFavorite}
            />
          </FilesPanelTerminalSplit>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FilesMainContent
              showPreview={showPreview}
              selectedFilePath={selectedFilePath}
              fileContent={fileContent}
              isLoadingContent={isLoadingContent}
              fileContentError={fileContentError}
              activeTab={activeTab}
              projectPath={projectPath}
              searchQuery={searchQuery}
              favorites={favorites}
              timeFilter={timeFilter}
              onSelectFile={handleSelectFile}
              onToggleFolder={handleToggleFolder}
              onToggleFavorite={handleToggleFavorite}
              onRemoveFavorite={handleRemoveFavorite}
            />
          </div>

          {/* Footer / Status */}
          <div className="border-t border-border px-3 py-1.5">
            <FilesFooter
              showPreview={showPreview}
              isFiltered={isFiltered}
              filteredFileCount={filteredFileCount}
              totalFileCount={totalFileCount}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extracted sub-components
// ---------------------------------------------------------------------------

interface FilesMainContentProps {
  showPreview: boolean;
  selectedFilePath: string | null;
  fileContent: string | null;
  isLoadingContent: boolean;
  fileContentError: string | null;
  activeTab: ExplorerTab;
  projectPath: string;
  searchQuery: string;
  favorites: string[];
  timeFilter: number;
  onSelectFile: (fp: string) => Promise<void>;
  onToggleFolder: (dirPath: string) => void;
  onToggleFavorite: (filePath: string) => void;
  onRemoveFavorite: (filePath: string) => void;
}

function FilesMainContent({
  showPreview,
  selectedFilePath,
  fileContent,
  isLoadingContent,
  fileContentError,
  activeTab,
  projectPath,
  searchQuery,
  favorites,
  timeFilter,
  onSelectFile,
  onToggleFolder,
  onToggleFavorite,
  onRemoveFavorite,
}: FilesMainContentProps) {
  if (showPreview) {
    return (
      <FilePreview
        filePath={selectedFilePath}
        content={fileContent}
        isLoading={isLoadingContent}
        error={fileContentError}
      />
    );
  }
  if (activeTab === 'tree') {
    return (
      <FileTree
        projectPath={projectPath}
        onSelectFile={(fp) => void onSelectFile(fp)}
        onToggleFolder={onToggleFolder}
        onToggleFavorite={onToggleFavorite}
      />
    );
  }
  if (activeTab === 'favorites') {
    return (
      <FileFavorites
        favorites={favorites}
        selectedFilePath={selectedFilePath}
        onSelectFile={(fp) => void onSelectFile(fp)}
        onRemoveFavorite={onRemoveFavorite}
      />
    );
  }
  return (
    <FileSearch
      query={searchQuery}
      projectPath={projectPath}
      selectedFilePath={selectedFilePath}
      onSelectFile={(fp) => void onSelectFile(fp)}
      sinceHours={timeFilter > 0 ? timeFilter : undefined}
    />
  );
}

interface FilesFooterProps {
  showPreview: boolean;
  isFiltered: boolean;
  filteredFileCount: number;
  totalFileCount: number;
}

function FilesFooter({
  showPreview,
  isFiltered,
  filteredFileCount,
  totalFileCount,
}: FilesFooterProps) {
  return (
    <p className="text-[10px] text-muted-foreground">
      {showPreview ? (
        <button
          type="button"
          className="hover:text-foreground transition-colors underline"
          onClick={() => useExplorerStore.getState().selectFile(null)}
        >
          &#8592; Zurueck zur Liste
        </button>
      ) : isFiltered ? (
        `${filteredFileCount} von ${totalFileCount} Dateien`
      ) : (
        `${totalFileCount} Dateien`
      )}
    </p>
  );
}

/** Files content with footer, used inside the split top panel. */
function FilesContent({
  showPreview,
  selectedFilePath,
  fileContent,
  isLoadingContent,
  fileContentError,
  activeTab,
  projectPath,
  searchQuery,
  favorites,
  timeFilter,
  isFiltered,
  totalFileCount,
  filteredFileCount,
  onSelectFile,
  onToggleFolder,
  onToggleFavorite,
  onRemoveFavorite,
}: FilesMainContentProps & {
  isFiltered: boolean;
  totalFileCount: number;
  filteredFileCount: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FilesMainContent
          showPreview={showPreview}
          selectedFilePath={selectedFilePath}
          fileContent={fileContent}
          isLoadingContent={isLoadingContent}
          fileContentError={fileContentError}
          activeTab={activeTab}
          projectPath={projectPath}
          searchQuery={searchQuery}
          favorites={favorites}
          timeFilter={timeFilter}
          onSelectFile={onSelectFile}
          onToggleFolder={onToggleFolder}
          onToggleFavorite={onToggleFavorite}
          onRemoveFavorite={onRemoveFavorite}
        />
      </div>
      <div className="border-t border-border px-3 py-1.5 shrink-0">
        <FilesFooter
          showPreview={showPreview}
          isFiltered={isFiltered}
          filteredFileCount={filteredFileCount}
          totalFileCount={totalFileCount}
        />
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
