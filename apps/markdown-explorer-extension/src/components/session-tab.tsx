import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SessionProcessStatus } from '../stores/types';

export interface SessionTabItem {
  id: string;
  name: string;
  processStatus: SessionProcessStatus;
  model: string;
  totalCost: number;
  messageCount: number;
}

interface SessionTabProps {
  session: SessionTabItem;
  isActive: boolean;
  canCloseOthers: boolean;
  onSelect: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onCloseOthers: (sessionId: string) => void;
  onRename: (sessionId: string, nextName: string) => Promise<boolean>;
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

function toCostLabel(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) {
    return '$0.00';
  }

  if (cost < 0.01) {
    return '<$0.01';
  }

  return `$${cost.toFixed(2)}`;
}

function getStatusConfig(status: SessionProcessStatus): {
  dotClassName: string;
  label: string;
} {
  if (status === 'running') {
    return {
      dotClassName: 'bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.2)] animate-pulse',
      label: 'Läuft',
    };
  }

  if (status === 'error') {
    return {
      dotClassName: 'bg-rose-500',
      label: 'Fehler',
    };
  }

  if (status === 'stopped') {
    return {
      dotClassName: 'bg-amber-500',
      label: 'Gestoppt',
    };
  }

  return {
    dotClassName: 'bg-emerald-500',
    label: 'Bereit',
  };
}

function clampMenuPosition(position: ContextMenuPosition): ContextMenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = 196;
  const menuHeight = 134;

  return {
    x: Math.max(8, Math.min(position.x, viewportWidth - menuWidth - 8)),
    y: Math.max(8, Math.min(position.y, viewportHeight - menuHeight - 8)),
  };
}

export function SessionTab({
  session,
  isActive,
  canCloseOthers,
  onSelect,
  onClose,
  onCloseOthers,
  onRename,
}: SessionTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(session.name);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [menuPosition, setMenuPosition] = useState<ContextMenuPosition | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const renamePendingRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftName(session.name);
    }
  }, [isEditing, session.name]);

  useEffect(() => {
    if (!isEditing) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [isEditing]);

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

  const statusConfig = useMemo(
    () => getStatusConfig(session.processStatus),
    [session.processStatus]
  );
  const modelShortLabel = useMemo(() => toModelShortLabel(session.model), [session.model]);
  const costLabel = useMemo(() => toCostLabel(session.totalCost), [session.totalCost]);
  const messageLabel = useMemo(() => {
    return `${session.messageCount} Nachr.`;
  }, [session.messageCount]);

  const startRename = useCallback(() => {
    setMenuPosition(null);
    setDraftName(session.name);
    setIsEditing(true);
  }, [session.name]);

  const cancelRename = useCallback(() => {
    setDraftName(session.name);
    setIsEditing(false);
  }, [session.name]);

  const commitRename = useCallback(async () => {
    if (renamePendingRef.current || isSavingRename) {
      return;
    }

    const trimmedName = draftName.trim();
    if (!trimmedName) {
      cancelRename();
      return;
    }

    if (trimmedName === session.name) {
      cancelRename();
      return;
    }

    renamePendingRef.current = true;
    setIsSavingRename(true);

    try {
      const success = await onRename(session.id, trimmedName);
      if (success) {
        setIsEditing(false);
      }
    } finally {
      renamePendingRef.current = false;
      setIsSavingRename(false);
    }
  }, [cancelRename, draftName, isSavingRename, onRename, session.id, session.name]);

  return (
    <>
      <div
        data-session-tab-id={session.id}
        role="button"
        tabIndex={0}
        aria-pressed={isActive}
        className={cn(
          'group flex h-10 min-w-[220px] max-w-[300px] items-center gap-2 rounded-md border px-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          isActive
            ? 'border-muted bg-accent text-foreground'
            : 'border-muted bg-card/70 text-muted-foreground hover:bg-accent/70 hover:text-foreground'
        )}
        onClick={() => onSelect(session.id)}
        onDoubleClick={startRename}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(session.id);
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuPosition(clampMenuPosition({ x: event.clientX, y: event.clientY }));
        }}
        title={`${session.name} - ${statusConfig.label}`}
      >
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusConfig.dotClassName)} />

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void commitRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              onBlur={() => {
                void commitRename();
              }}
              className="h-7 w-full rounded border border-muted bg-background px-2 text-xs text-foreground"
              maxLength={80}
              disabled={isSavingRename}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs font-medium text-foreground">{session.name}</span>
              {session.processStatus === 'running' ? (
                <LoaderCircle className="h-3 w-3 shrink-0 animate-spin text-sky-500" />
              ) : null}
            </div>
          )}

          {!isEditing ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="rounded border border-muted/70 bg-muted/20 px-1 py-0 leading-4">
                {modelShortLabel}
              </span>
              <span>{costLabel}</span>
              <span>{messageLabel}</span>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-6 w-6 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground',
            !isActive && 'opacity-0 group-hover:opacity-100'
          )}
          onClick={(event) => {
            event.stopPropagation();
            onClose(session.id);
          }}
          aria-label="Chat schließen"
          title="Chat schließen"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {menuPosition ? (
        <div
          className="fixed z-[90] w-48 rounded-md border border-muted bg-popover p-1 shadow-xl"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
            onClick={() => {
              startRename();
            }}
          >
            Umbenennen
          </button>
          <button
            type="button"
            className={cn(
              'w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted',
              canCloseOthers ? 'text-foreground' : 'cursor-not-allowed text-muted-foreground'
            )}
            onClick={() => {
              if (!canCloseOthers) return;
              setMenuPosition(null);
              onCloseOthers(session.id);
            }}
            disabled={!canCloseOthers}
          >
            Andere schließen
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            onClick={() => {
              setMenuPosition(null);
              onClose(session.id);
            }}
          >
            Schließen
          </button>
        </div>
      ) : null}
    </>
  );
}
