import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SessionProcessStatus } from '../stores/types';
import type { HistoryListItem } from './history-types';

interface HistoryItemProps {
  item: HistoryListItem;
  isActive: boolean;
  searchQuery: string;
  onSelect: (sessionId: string) => void;
  onRename: (sessionId: string, nextName: string) => Promise<boolean>;
  onArchive: (sessionId: string) => Promise<boolean>;
  onDelete: (sessionId: string) => Promise<boolean>;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

function toModelShortLabel(model: string): string {
  const normalized = model.trim().toLowerCase();
  const knownMatch = normalized.match(/(?:claude-)?(sonnet|haiku|opus)-(\d)-(\d)/);

  if (knownMatch) {
    const kind = knownMatch[1];
    const major = knownMatch[2];
    const minor = knownMatch[3];
    const prefix = kind === 'sonnet' ? 'S' : kind === 'haiku' ? 'H' : 'O';
    return `${prefix}${major}.${minor}`;
  }

  if (!normalized) return 'Modell';
  return normalized.slice(0, 8).toUpperCase();
}

function formatRelativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 'Unbekannt';

  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return 'Gerade eben';
  if (diffMin < 60) return `Vor ${diffMin} Min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Vor ${diffHours} Std`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Vor ${diffDays} Tagen`;

  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusConfig(status: SessionProcessStatus): {
  label: string;
  dotClassName: string;
  iconClassName?: string;
} {
  if (status === 'running') {
    return {
      label: 'Läuft',
      dotClassName: 'bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.18)]',
      iconClassName: 'text-sky-500',
    };
  }

  if (status === 'error') {
    return {
      label: 'Fehler',
      dotClassName: 'bg-rose-500',
    };
  }

  if (status === 'stopped') {
    return {
      label: 'Gestoppt',
      dotClassName: 'bg-amber-500',
    };
  }

  return {
    label: 'Bereit',
    dotClassName: 'bg-emerald-500',
  };
}

function clampMenuPosition(position: ContextMenuPosition): ContextMenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = 188;
  const menuHeight = 118;

  return {
    x: Math.max(8, Math.min(position.x, viewportWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(position.y, viewportHeight - menuHeight - 8)),
  };
}

function renderHighlightedText(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(matcher);

  if (parts.length <= 1) return text;

  return parts.map((part, index) => {
    const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
    if (!isMatch) return <span key={`text-${index}`}>{part}</span>;

    return (
      <mark
        key={`match-${index}`}
        className="rounded-sm bg-yellow-100 px-0.5 text-inherit dark:bg-yellow-400/30"
      >
        {part}
      </mark>
    );
  });
}

export function HistoryItem({
  item,
  isActive,
  searchQuery,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}: HistoryItemProps) {
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(null);

  const statusConfig = useMemo(() => getStatusConfig(item.processStatus), [item.processStatus]);
  const updatedLabel = useMemo(() => formatRelativeTime(item.updatedAt), [item.updatedAt]);
  const modelShortLabel = useMemo(() => toModelShortLabel(item.model), [item.model]);

  useEffect(() => {
    if (!menuPosition) return;

    const closeMenu = () => {
      setMenuPosition(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuPosition]);

  return (
    <>
      <button
        type="button"
        className={cn(
          'w-full rounded-md border px-2.5 py-2 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          isActive ? 'border-muted bg-accent' : 'border-muted/70 bg-background hover:bg-accent/60'
        )}
        onClick={() => onSelect(item.id)}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuPosition(clampMenuPosition({ x: event.clientX, y: event.clientY }));
        }}
        title={item.name}
        aria-label={`${item.name} öffnen`}
      >
        <div className="flex items-start gap-2">
          <span
            className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', statusConfig.dotClassName)}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-foreground">
                {renderHighlightedText(item.name, searchQuery)}
              </p>
              {item.processStatus === 'running' ? (
                <LoaderCircle
                  className={cn('h-3.5 w-3.5 shrink-0 animate-spin', statusConfig.iconClassName)}
                />
              ) : null}
            </div>

            {item.preview.trim().length > 0 ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {renderHighlightedText(item.preview, searchQuery)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">Noch keine Nachricht</p>
            )}

            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="rounded border border-muted/70 bg-muted/20 px-1 py-0 leading-4">
                {modelShortLabel}
              </span>
              <span>{statusConfig.label}</span>
              <span>{updatedLabel}</span>
              <span>{item.messageCount} Nachr.</span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              setMenuPosition(clampMenuPosition({ x: event.clientX, y: event.clientY }));
            }}
            aria-label="Aktionen öffnen"
            title="Aktionen öffnen"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>

      {menuPosition ? (
        <div
          className="fixed z-[90] w-44 rounded-md border border-muted bg-popover p-1 shadow-xl"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
            onClick={() => {
              const nextName = window.prompt('Neuer Name für den Chat:', item.name);
              setMenuPosition(null);
              if (!nextName) return;
              void onRename(item.id, nextName);
            }}
          >
            Umbenennen
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
            onClick={() => {
              setMenuPosition(null);
              void onArchive(item.id);
            }}
          >
            Archivieren
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            onClick={() => {
              setMenuPosition(null);
              const confirmed = window.confirm('Willst du diesen Chat wirklich löschen?');
              if (!confirmed) return;
              void onDelete(item.id);
            }}
          >
            Löschen
          </button>
        </div>
      ) : null}
    </>
  );
}
