import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, FolderX, SearchX } from 'lucide-react';
import type { FileTreeNode, SearchFilters } from '@/store/explorer-store';
import { useExplorerStore, buildTreeFromFiles } from '@/store/explorer-store';
import { FileTreeItem } from './file-tree-item';
import {
  filterTreeByName,
  collectMatchingFolderPaths,
  sortTreeChildren,
  annotateFolderMeta,
} from './tree-utils';

const EMPTY_FAVORITES: string[] = [];

interface FileTreeProps {
  projectPath: string;
  searchQuery: string;
  searchFilters: SearchFilters;
  onSelectFile: (filePath: string) => void;
  onToggleFolder: (dirPath: string) => void;
  onToggleFavorite: (filePath: string) => void;
}

export function FileTree({
  projectPath,
  searchQuery,
  searchFilters,
  onSelectFile,
  onToggleFolder,
  onToggleFavorite,
}: FileTreeProps) {
  const {
    rootNodes,
    expandedPaths,
    selectedFilePath,
    isLoadingRoot,
    favorites,
    highlightWindow,
    allFiles,
    storeProjectPath,
    sortBy,
  } = useExplorerStore(
    useShallow((state) => ({
      rootNodes: state.rootNodes,
      expandedPaths: state.expandedPaths,
      selectedFilePath: state.selectedFilePath,
      isLoadingRoot: state.isLoadingRoot,
      favorites: state.favorites[projectPath] ?? EMPTY_FAVORITES,
      highlightWindow: state.highlightWindow,
      allFiles: state.allFiles,
      storeProjectPath: state.projectPath,
      sortBy: state.sortBy,
    }))
  );

  const isFavoriteCheck = useCallback(
    (filePath: string) => favorites.includes(filePath),
    [favorites]
  );

  // Bei aktiver Suche: Baum aus ALLEN Dateien (ohne Zeitfilter/Limit) erstellen
  const hasNameSearch = searchQuery.trim().length > 0;

  const unfilteredTree = useMemo(() => {
    if (!hasNameSearch || !storeProjectPath || allFiles.length === 0) return null;
    const rawNodes = buildTreeFromFiles(allFiles, storeProjectPath);
    const sorted = sortTreeChildren(rawNodes, sortBy);
    annotateFolderMeta(sorted);
    return sorted;
  }, [hasNameSearch, allFiles, storeProjectPath, sortBy]);

  // Basis-Baum: bei Suche den ungefilterteten, sonst den normalen (mit Zeitfilter/Limit)
  const baseNodes = hasNameSearch && unfilteredTree ? unfilteredTree : rootNodes;

  // Client-side name filtering
  const filteredNodes = useMemo(() => {
    if (!hasNameSearch) return baseNodes;
    return filterTreeByName(baseNodes, searchQuery, {
      folders: searchFilters.folders,
      files: searchFilters.files,
    });
  }, [baseNodes, searchQuery, hasNameSearch, searchFilters.folders, searchFilters.files]);

  // Auto-expand folders that contain search matches
  const prevQueryRef = useRef('');
  useEffect(() => {
    if (!hasNameSearch) {
      prevQueryRef.current = '';
      return;
    }
    if (searchQuery === prevQueryRef.current) return;
    prevQueryRef.current = searchQuery;

    const matchingPaths = collectMatchingFolderPaths(baseNodes, searchQuery, {
      folders: searchFilters.folders,
      files: searchFilters.files,
    });
    if (matchingPaths.size > 0) {
      const store = useExplorerStore.getState();
      const currentExpanded = store.expandedPaths;
      const merged = new Set(currentExpanded);
      let changed = false;
      for (const p of matchingPaths) {
        if (!merged.has(p)) {
          merged.add(p);
          changed = true;
        }
      }
      if (changed) {
        useExplorerStore.setState({ expandedPaths: merged });
      }
    }
  }, [searchQuery, hasNameSearch, baseNodes, searchFilters.folders, searchFilters.files]);

  if (isLoadingRoot) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <FolderX className="h-6 w-6 opacity-40" />
        <p className="text-sm">Keine Markdown-Dateien gefunden.</p>
      </div>
    );
  }

  if (hasNameSearch && filteredNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <SearchX className="h-6 w-6 opacity-40" />
        <p className="text-sm">Keine Treffer fuer &ldquo;{searchQuery}&rdquo;.</p>
      </div>
    );
  }

  return (
    <div className="space-y-px py-1">
      <TreeNodeList
        nodes={filteredNodes}
        depth={0}
        expandedPaths={expandedPaths}
        selectedFilePath={selectedFilePath}
        highlightWindow={highlightWindow}
        isFavorite={isFavoriteCheck}
        onToggle={onToggleFolder}
        onSelect={onSelectFile}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recursive node list
// ---------------------------------------------------------------------------

interface TreeNodeListProps {
  nodes: FileTreeNode[];
  depth: number;
  expandedPaths: Set<string>;
  selectedFilePath: string | null;
  highlightWindow: number;
  isFavorite: (filePath: string) => boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onToggleFavorite: (path: string) => void;
}

function TreeNodeList({
  nodes,
  depth,
  expandedPaths,
  selectedFilePath,
  highlightWindow,
  isFavorite,
  onToggle,
  onSelect,
  onToggleFavorite,
}: TreeNodeListProps) {
  return (
    <>
      {nodes.map((node) => {
        const isExpanded = expandedPaths.has(node.path);
        return (
          <div key={node.path}>
            <FileTreeItem
              node={node}
              depth={depth}
              isExpanded={isExpanded}
              isSelected={selectedFilePath === node.path}
              isFavorite={isFavorite(node.path)}
              highlightWindow={highlightWindow}
              onToggle={onToggle}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
            {node.isDirectory && isExpanded && node.children.length > 0 && (
              <TreeNodeList
                nodes={node.children}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                selectedFilePath={selectedFilePath}
                highlightWindow={highlightWindow}
                isFavorite={isFavorite}
                onToggle={onToggle}
                onSelect={onSelect}
                onToggleFavorite={onToggleFavorite}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
