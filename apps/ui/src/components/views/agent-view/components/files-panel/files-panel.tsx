/**
 * FilesPanel - Project file explorer for the right panel.
 *
 * Shows only markdown files (.md/.mdx/.markdown) loaded in a single batch.
 * Provides tree browsing, search, favorites, time filtering, and file preview.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  ChevronsDownUp,
  Clock,
  Hash,
  Highlighter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  ArrowDownAZ,
  TreePine,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Input } from '@/components/ui/input';
import { MiniSelect } from '@/components/ui/mini-select';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore } from '@/store/app-store';
import { RIGHT_PANEL_FONT_SIZE_DEFAULT } from '@/store/types/ui-types';
import type { ExplorerTab, SearchFilters } from '@/store/explorer-store';
import {
  useExplorerStore,
  TIME_FILTER_OPTIONS,
  SORT_OPTIONS,
  HIGHLIGHT_WINDOW_OPTIONS,
  FILE_LIMIT_OPTIONS,
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
const EXPLORER_LOAD_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

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
    searchFilters,
    searchFiltersOpen,
    fileLimit,
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
      searchFilters: state.searchFilters,
      searchFiltersOpen: state.searchFiltersOpen,
      fileLimit: state.fileLimit,
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
      const result = await withTimeout(
        api.explorerFilesByTime(path, 0, 5000),
        EXPLORER_LOAD_TIMEOUT_MS,
        'Markdown Explorer loading timeout'
      );

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

  const handleFileLimitChange = useCallback((limit: number) => {
    useExplorerStore.getState().setFileLimit(limit);
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
  const filesPanelZoom = filesFontSize / RIGHT_PANEL_FONT_SIZE_DEFAULT;

  const isFiltered = timeFilter > 0 || (fileLimit > 0 && filteredFileCount < totalFileCount);
  const showPreview = selectedFilePath !== null;

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      style={{
        fontSize: `${filesFontSize}px`,
        zoom: filesPanelZoom,
      }}
    >
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
      </div>

      {/* Toolbar (visible when not previewing a file) */}
      {!showPreview && (
        <div className="border-b border-border px-2 py-1.5 space-y-1">
          {/* Row 1: Sort + Time filter + Highlight window */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <MiniSelect
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={handleSortChange}
              icon={<ArrowDownAZ className="h-3 w-3" />}
              ariaLabel="Sortierung"
            />
            <MiniSelect
              value={timeFilter}
              options={TIME_FILTER_OPTIONS}
              onChange={(v) => handleTimeFilterChange(Number(v))}
              icon={<Clock className="h-3 w-3" />}
              ariaLabel="Zeitfilter"
            />
            <MiniSelect
              value={highlightWindow}
              options={HIGHLIGHT_WINDOW_OPTIONS}
              onChange={(v) => handleHighlightWindowChange(Number(v))}
              icon={<Highlighter className="h-3 w-3" />}
              ariaLabel="Hervorhebung"
            />
            <MiniSelect
              value={fileLimit}
              options={FILE_LIMIT_OPTIONS}
              onChange={(v) => handleFileLimitChange(Number(v))}
              icon={<Hash className="h-3 w-3" />}
              ariaLabel="Anzahl Dateien"
            />
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

      {/* Inline search bar (visible in tree tab when not previewing) */}
      {activeTab === 'tree' && !showPreview && (
        <div className="border-b border-border px-2 py-1.5 space-y-1">
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Suchen..."
                className="h-6 border-border pl-7 text-[11px]"
              />
            </div>
            <button
              type="button"
              className={cn(
                'flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] transition-colors',
                searchFiltersOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              onClick={() => useExplorerStore.getState().setSearchFiltersOpen(!searchFiltersOpen)}
              title="Suchfilter"
            >
              <SlidersHorizontal className="h-3 w-3" />
            </button>
          </div>

          {/* Collapsible search filters */}
          {searchFiltersOpen && (
            <TreeSearchFilters
              filters={searchFilters}
              onFilterChange={(key, value) =>
                useExplorerStore.getState().setSearchFilter(key, value)
              }
            />
          )}
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
              searchFilters={searchFilters}
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
              searchFilters={searchFilters}
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
  searchFilters: SearchFilters;
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
  searchFilters,
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
    // Content search active → show backend search results
    if (searchQuery.trim() && searchFilters.byContent) {
      return (
        <FileSearch
          query={searchQuery}
          projectPath={projectPath}
          selectedFilePath={selectedFilePath}
          onSelectFile={(fp) => void onSelectFile(fp)}
          sinceHours={timeFilter > 0 ? timeFilter : undefined}
          filterFolders={searchFilters.folders}
          filterFiles={searchFilters.files}
        />
      );
    }
    // Name-only search or no search → tree with client-side filtering
    return (
      <FileTree
        projectPath={projectPath}
        searchQuery={searchFilters.byName ? searchQuery : ''}
        searchFilters={searchFilters}
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
  // Fallback (shouldn't normally reach here)
  return (
    <FileTree
      projectPath={projectPath}
      searchQuery=""
      searchFilters={searchFilters}
      onSelectFile={(fp) => void onSelectFile(fp)}
      onToggleFolder={onToggleFolder}
      onToggleFavorite={onToggleFavorite}
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
  // In preview mode, the back button is in the FilePreview header – no footer needed
  if (showPreview) return null;

  return (
    <p className="text-[10px] text-muted-foreground">
      {isFiltered
        ? `${filteredFileCount} von ${totalFileCount} Dateien`
        : `${totalFileCount} Dateien`}
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
  searchFilters,
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
          searchFilters={searchFilters}
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

// ---------------------------------------------------------------------------
// Search filter checkboxes (collapsible)
// ---------------------------------------------------------------------------

interface TreeSearchFiltersProps {
  filters: SearchFilters;
  onFilterChange: (key: keyof SearchFilters, value: boolean) => void;
}

function TreeSearchFilters({ filters, onFilterChange }: TreeSearchFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-0.5">
      <FilterCheckbox
        checked={filters.folders}
        onChange={(v) => onFilterChange('folders', v)}
        label="Ordner"
      />
      <FilterCheckbox
        checked={filters.files}
        onChange={(v) => onFilterChange('files', v)}
        label="Dateien"
      />
      <FilterCheckbox
        checked={filters.byName}
        onChange={(v) => onFilterChange('byName', v)}
        label="Name"
      />
      <FilterCheckbox
        checked={filters.byContent}
        onChange={(v) => onFilterChange('byContent', v)}
        label="Inhalt"
      />
    </div>
  );
}

interface FilterCheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

function FilterCheckbox({ checked, onChange, label }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3 w-3 rounded border-border accent-primary"
      />
      {label}
    </label>
  );
}
