import { useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileTreeNode } from '../stores/explorer-store';

// File extensions shown with the markdown icon
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx', '.markdown']);

function isMarkdown(name: string): boolean {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex < 0) return false;
  return MARKDOWN_EXTENSIONS.has(name.slice(dotIndex).toLowerCase());
}

interface MarkdownTreeItemProps {
  node: FileTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onToggleFavorite: (path: string) => void;
}

export function MarkdownTreeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  isFavorite,
  onToggle,
  onSelect,
  onToggleFavorite,
}: MarkdownTreeItemProps) {
  const handleClick = useCallback(() => {
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  }, [node.isDirectory, node.path, onToggle, onSelect]);

  const handleFavoriteClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onToggleFavorite(node.path);
    },
    [node.path, onToggleFavorite]
  );

  const paddingLeft = 8 + depth * 16;

  const FileIcon = node.isDirectory
    ? isExpanded
      ? FolderOpen
      : Folder
    : isMarkdown(node.name)
      ? FileText
      : File;

  const iconColor = node.isDirectory
    ? 'text-blue-400'
    : isMarkdown(node.name)
      ? 'text-emerald-400'
      : 'text-muted-foreground';

  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-1.5 rounded-sm py-1 pr-1 text-left text-sm',
        'hover:bg-muted/60 transition-colors',
        isSelected && !node.isDirectory && 'bg-muted/80 text-foreground'
      )}
      style={{ paddingLeft }}
      onClick={handleClick}
      title={node.path}
    >
      {node.isDirectory ? (
        node.isLoading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )
      ) : (
        <span className="h-3.5 w-3.5 shrink-0" />
      )}

      <FileIcon className={cn('h-3.5 w-3.5 shrink-0', iconColor)} />

      <span className="min-w-0 flex-1 truncate">{node.name}</span>

      {!node.isDirectory && (
        <button
          type="button"
          className={cn(
            'h-4 w-4 shrink-0 transition-opacity',
            isFavorite
              ? 'text-yellow-400 opacity-100'
              : 'text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100'
          )}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        >
          <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
        </button>
      )}
    </button>
  );
}
