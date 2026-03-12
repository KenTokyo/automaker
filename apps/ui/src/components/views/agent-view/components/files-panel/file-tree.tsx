import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Loader2, FolderX } from 'lucide-react';
import type { FileTreeNode } from '@/store/explorer-store';
import { useExplorerStore } from '@/store/explorer-store';
import { FileTreeItem } from './file-tree-item';

const EMPTY_FAVORITES: string[] = [];

interface FileTreeProps {
  projectPath: string;
  onSelectFile: (filePath: string) => void;
  onToggleFolder: (dirPath: string) => void;
  onToggleFavorite: (filePath: string) => void;
}

export function FileTree({
  projectPath,
  onSelectFile,
  onToggleFolder,
  onToggleFavorite,
}: FileTreeProps) {
  const { rootNodes, expandedPaths, selectedFilePath, isLoadingRoot, favorites, highlightWindow } =
    useExplorerStore(
      useShallow((state) => ({
        rootNodes: state.rootNodes,
        expandedPaths: state.expandedPaths,
        selectedFilePath: state.selectedFilePath,
        isLoadingRoot: state.isLoadingRoot,
        favorites: state.favorites[projectPath] ?? EMPTY_FAVORITES,
        highlightWindow: state.highlightWindow,
      })),
    );

  const isFavoriteCheck = useCallback(
    (filePath: string) => favorites.includes(filePath),
    [favorites],
  );

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

  return (
    <div className="space-y-px py-1">
      <TreeNodeList
        nodes={rootNodes}
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
