import { useState, useMemo, useCallback } from 'react';
import { FileText, Plus, Star, Clock, BarChart3, Trash2, ClipboardCopy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import type { RecentDoc } from '@/store/types/ui-types';

type SortMode = 'recent' | 'frequency';

interface RecentDocsPopoverProps {
  disabled: boolean;
  onInsertPath: (absolutePath: string) => void;
}

/** Smart date formatting: "gerade eben", "vor 5 Min.", "vor 2 Std.", "gestern", etc. */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (Number.isNaN(then)) return '';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/** Source badge color */
function getSourceStyle(source: RecentDoc['source']) {
  if (source === 'clipboard') {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
  }
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
}

function getSourceIcon(source: RecentDoc['source']) {
  return source === 'clipboard' ? ClipboardCopy : FileText;
}

export function RecentDocsPopover({ disabled, onInsertPath }: RecentDocsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const recentDocs = useAppStore((s) => s.recentDocs);
  const toggleRecentDocFavorite = useAppStore((s) => s.toggleRecentDocFavorite);
  const removeRecentDoc = useAppStore((s) => s.removeRecentDoc);
  const clearRecentDocs = useAppStore((s) => s.clearRecentDocs);

  // Split into favorites and regular docs, then sort
  const { favorites, regularDocs } = useMemo(() => {
    const favs: RecentDoc[] = [];
    const regular: RecentDoc[] = [];

    for (const doc of recentDocs) {
      if (doc.isFavorite) {
        favs.push(doc);
      } else {
        regular.push(doc);
      }
    }

    const sortFn =
      sortMode === 'frequency'
        ? (a: RecentDoc, b: RecentDoc) => b.accessCount - a.accessCount
        : (a: RecentDoc, b: RecentDoc) =>
            new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();

    favs.sort(sortFn);
    regular.sort(sortFn);

    return { favorites: favs, regularDocs: regular };
  }, [recentDocs, sortMode]);

  const handleInsert = useCallback(
    (doc: RecentDoc) => {
      onInsertPath(doc.absolutePath);
      setOpen(false);
    },
    [onInsertPath]
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      toggleRecentDocFavorite(path);
    },
    [toggleRecentDocFavorite]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      removeRecentDoc(path);
    },
    [removeRecentDoc]
  );

  const totalCount = recentDocs.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'h-7 w-7 rounded-md border-border shrink-0 relative',
            totalCount > 0 && 'border-blue-500/30'
          )}
          title="Letzte Dokumente"
        >
          <FileText className="w-3.5 h-3.5" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[9px] font-bold text-white leading-none">
              {totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start" side="top">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold text-foreground">Letzte Dokumente</p>
          <div className="flex items-center gap-1">
            {/* Sort toggle */}
            <button
              type="button"
              onClick={() => setSortMode(sortMode === 'recent' ? 'frequency' : 'recent')}
              className={cn(
                'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
              title={sortMode === 'recent' ? 'Nach Häufigkeit sortieren' : 'Nach Zeit sortieren'}
            >
              {sortMode === 'recent' ? (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Zuletzt</span>
                </>
              ) : (
                <>
                  <BarChart3 className="h-3 w-3" />
                  <span>Häufigkeit</span>
                </>
              )}
            </button>
            {/* Clear all */}
            {totalCount > 0 && (
              <button
                type="button"
                onClick={() => clearRecentDocs()}
                className="rounded p-0.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Alle entfernen"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {totalCount === 0 ? (
          <div className="px-3 py-6 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Noch keine Dokumente referenziert.</p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Kopiere einen Pfad im Dateibaum, um ihn hier zu sehen.
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {/* Favorites section */}
            {favorites.length > 0 && (
              <>
                <div className="sticky top-0 z-10 bg-popover/95 backdrop-blur-sm px-3 py-1.5 border-b border-dashed border-yellow-500/20">
                  <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Favoriten
                  </p>
                </div>
                {favorites.map((doc) => (
                  <DocRow
                    key={doc.path}
                    doc={doc}
                    onInsert={handleInsert}
                    onToggleFavorite={handleToggleFavorite}
                    onRemove={handleRemove}
                  />
                ))}
              </>
            )}

            {/* Regular docs */}
            {regularDocs.length > 0 && (
              <>
                {favorites.length > 0 && (
                  <div className="sticky top-0 z-10 bg-popover/95 backdrop-blur-sm px-3 py-1.5 border-b border-border/50">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Verlauf
                    </p>
                  </div>
                )}
                {regularDocs.map((doc) => (
                  <DocRow
                    key={doc.path}
                    doc={doc}
                    onInsert={handleInsert}
                    onToggleFavorite={handleToggleFavorite}
                    onRemove={handleRemove}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Single Doc Row ──────────────────────────────────────────

interface DocRowProps {
  doc: RecentDoc;
  onInsert: (doc: RecentDoc) => void;
  onToggleFavorite: (e: React.MouseEvent, path: string) => void;
  onRemove: (e: React.MouseEvent, path: string) => void;
}

function DocRow({ doc, onInsert, onToggleFavorite, onRemove }: DocRowProps) {
  const SourceIcon = getSourceIcon(doc.source);

  return (
    <button
      type="button"
      className="group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent/50"
      onClick={() => onInsert(doc)}
    >
      {/* Source icon */}
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded border',
          getSourceStyle(doc.source)
        )}
      >
        <SourceIcon className="h-3 w-3" />
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(doc.lastAccessedAt)}
          </span>
          {doc.accessCount > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
              <BarChart3 className="h-2.5 w-2.5" />
              {doc.accessCount}x
            </span>
          )}
        </div>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Favorite toggle */}
        <button
          type="button"
          className={cn(
            'rounded p-0.5 transition-colors',
            doc.isFavorite
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-muted-foreground hover:text-yellow-400'
          )}
          onClick={(e) => onToggleFavorite(e, doc.path)}
          title={doc.isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
        >
          <Star className={cn('h-3 w-3', doc.isFavorite && 'fill-current')} />
        </button>

        {/* Remove */}
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:text-red-400 transition-colors"
          onClick={(e) => onRemove(e, doc.path)}
          title="Entfernen"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Insert indicator */}
        <Plus className="h-3 w-3 text-muted-foreground" />
      </div>
    </button>
  );
}
