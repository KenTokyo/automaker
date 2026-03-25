import { useCallback } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  FileText,
  Folder,
  FolderOpen,
  Pencil,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileTreeNode } from '@/store/explorer-store';
import {
  type RecencyClass,
  formatSmartDate,
  getRecencyClass,
  getFolderRecency,
  getFileRecencyStyle,
  getFolderRecencyStyle,
  getDateRecencyColor,
  getDateRecencyFontWeight,
} from './recency-utils';

interface FileTreeItemProps {
  node: FileTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  highlightWindow: number;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onToggleFavorite: (path: string) => void;
}

export function FileTreeItem({
  node,
  depth,
  isExpanded,
  isSelected,
  isFavorite,
  highlightWindow,
  onToggle,
  onSelect,
  onToggleFavorite,
}: FileTreeItemProps) {
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

  const handleCopyPath = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent('docs:insert-path', { detail: node.path }));
    },
    [node.path]
  );

  const paddingLeft = 8 + depth * 16;

  // Recency calculation
  let recency: RecencyClass = '';
  if (node.isDirectory) {
    recency = getFolderRecency(node, highlightWindow);
  } else {
    const ts = Math.max(node.modified ?? 0, node.created ?? 0);
    recency = getRecencyClass(ts, highlightWindow);
  }

  const recencyStyle = node.isDirectory
    ? getFolderRecencyStyle(recency)
    : getFileRecencyStyle(recency);

  // Icon
  const FileIcon = node.isDirectory ? (isExpanded ? FolderOpen : Folder) : FileText;

  const iconColor = node.isDirectory ? 'text-blue-400' : 'text-emerald-400';

  // Date styling for files with strong recency
  const dateColor = getDateRecencyColor(recency);
  const dateFontWeight = getDateRecencyFontWeight(recency);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group flex w-full items-start gap-1.5 rounded-sm py-1 pr-1 text-left text-sm cursor-pointer',
        'hover:bg-muted/60 transition-colors',
        isSelected && !node.isDirectory && 'bg-muted/80 text-foreground'
      )}
      style={{ paddingLeft, ...recencyStyle }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      title={node.path}
    >
      {/* Chevron / spacer */}
      <div className="mt-0.5 shrink-0">
        {node.isDirectory ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )
        ) : (
          <span className="inline-block h-3.5 w-3.5" />
        )}
      </div>

      {/* File/Folder icon */}
      <div className="mt-0.5 shrink-0">
        <FileIcon className={cn('h-3.5 w-3.5', iconColor)} />
      </div>

      {/* Name + dates / folder meta */}
      <div className="min-w-0 flex-1">
        {node.isDirectory ? (
          <div className="flex items-center gap-1.5">
            <span className="truncate">{node.name}</span>
            {/* Folder meta: file count + newest modified */}
            {(node.fileCount != null || node.modified) && (
              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground opacity-70">
                {node.fileCount != null && node.fileCount > 0 && <>{node.fileCount}</>}
                {node.fileCount != null && node.fileCount > 0 && node.modified ? ' · ' : ''}
                {node.modified ? (
                  <>
                    <Pencil className="inline h-2 w-2 opacity-60" />{' '}
                    {formatSmartDate(node.modified)}
                  </>
                ) : null}
              </span>
            )}
          </div>
        ) : (
          <>
            <span className="truncate block">{node.name}</span>
            {/* Date lines (files only) */}
            {(node.created || node.modified) && (
              <div className="mt-0.5 flex items-center gap-3 text-[10px] leading-tight text-muted-foreground">
                {node.created ? (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="h-2.5 w-2.5 shrink-0 opacity-60" />
                    {formatSmartDate(node.created)}
                  </span>
                ) : null}
                {node.modified ? (
                  <span
                    className="flex items-center gap-0.5"
                    style={{
                      color: dateColor,
                      fontWeight: dateFontWeight,
                    }}
                  >
                    <Pencil className="h-2.5 w-2.5 shrink-0 opacity-60" />
                    {formatSmartDate(node.modified)}
                  </span>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons for files */}
      {!node.isDirectory && (
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Copy Path - large, always visible on hover */}
          <button
            type="button"
            className="mt-0.5 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 transition-all
              text-blue-400 opacity-0 group-hover:opacity-100 hover:!bg-blue-500/20 hover:!text-blue-300"
            onClick={handleCopyPath}
            title="Pfad in Chat einfuegen"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Path</span>
          </button>

          {/* Favorite star */}
          <button
            type="button"
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 transition-opacity',
              isFavorite
                ? 'text-yellow-400 opacity-100'
                : 'text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100'
            )}
            onClick={handleFavoriteClick}
            title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufuegen'}
          >
            <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} />
          </button>
        </div>
      )}
    </div>
  );
}
