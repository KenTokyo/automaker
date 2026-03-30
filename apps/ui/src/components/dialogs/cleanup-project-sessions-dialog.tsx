import { useCallback, useMemo, useState } from 'react';
import { Trash2, Shield, Info, Scissors } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SessionListItem } from '@/types/electron';

interface CleanupProjectSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectPath: string;
  sessions: SessionListItem[];
  currentSessionId: string | null;
  onDeleteSessions: (sessionIds: string[]) => Promise<void>;
}

interface SessionIndex {
  byId: Map<string, SessionListItem>;
  childrenByParentId: Map<string, SessionListItem[]>;
}

function getTimestamp(isoDate: string): number {
  return new Date(isoDate).getTime();
}

function buildSessionIndex(sessions: SessionListItem[]): SessionIndex {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const childrenByParentId = new Map<string, SessionListItem[]>();

  for (const session of sessions) {
    if (!session.parentSessionId) continue;
    const existing = childrenByParentId.get(session.parentSessionId);
    if (existing) {
      existing.push(session);
    } else {
      childrenByParentId.set(session.parentSessionId, [session]);
    }
  }

  return { byId, childrenByParentId };
}

function addDescendantsToSet(
  target: Set<string>,
  rootId: string,
  childrenByParentId: Map<string, SessionListItem[]>
): void {
  const stack = [rootId];
  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || target.has(currentId)) continue;
    target.add(currentId);
    const children = childrenByParentId.get(currentId) || [];
    for (const child of children) {
      stack.push(child.id);
    }
  }
}

function addAncestorsToSet(
  target: Set<string>,
  sessionId: string,
  byId: Map<string, SessionListItem>
): void {
  let cursor: string | undefined = sessionId;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const session = byId.get(cursor);
    if (!session) break;
    target.add(session.id);
    cursor = session.parentSessionId;
  }
}

function computeProjectCleanup(
  sessions: SessionListItem[],
  currentSessionId: string | null,
  keepCount: number
): {
  toDelete: SessionListItem[];
  toKeep: SessionListItem[];
} {
  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)
  );

  const index = buildSessionIndex(sorted);
  const protectedIds = new Set<string>();

  // Always protect current session + its ancestors
  if (currentSessionId && index.byId.has(currentSessionId)) {
    addAncestorsToSet(protectedIds, currentSessionId, index.byId);
  }

  // Identify root/parent sessions (no parent or parent not in this set)
  const rootSessions = sorted.filter(
    (s) => !s.parentSessionId || !index.byId.has(s.parentSessionId)
  );

  // Protect the last N root sessions + all their descendants
  const keepRootIds = rootSessions.slice(0, keepCount).map((s) => s.id);
  for (const rootId of keepRootIds) {
    addDescendantsToSet(protectedIds, rootId, index.childrenByParentId);
  }

  const toDelete = sorted.filter((s) => !protectedIds.has(s.id));
  const toKeep = sorted.filter((s) => protectedIds.has(s.id));

  return { toDelete, toKeep };
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CleanupProjectSessionsDialog({
  open,
  onOpenChange,
  projectName,
  projectPath,
  sessions,
  currentSessionId,
  onDeleteSessions,
}: CleanupProjectSessionsDialogProps) {
  const [keepCount, setKeepCount] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only use sessions for this project
  const projectSessions = useMemo(
    () => sessions.filter((s) => s.projectPath === projectPath),
    [sessions, projectPath]
  );

  const { toDelete, toKeep } = useMemo(
    () => computeProjectCleanup(projectSessions, currentSessionId, keepCount),
    [projectSessions, currentSessionId, keepCount]
  );

  const handleDelete = useCallback(async () => {
    if (toDelete.length === 0 || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDeleteSessions(toDelete.map((s) => s.id));
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }, [toDelete, isDeleting, onDeleteSessions, onOpenChange]);

  // Count root sessions (parents)
  const rootSessionCount = useMemo(() => {
    const byId = new Map(projectSessions.map((s) => [s.id, s]));
    return projectSessions.filter((s) => !s.parentSessionId || !byId.has(s.parentSessionId)).length;
  }, [projectSessions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Scissors className="h-4 w-4 text-orange-400" />
            Sessions aufräumen
          </DialogTitle>
          <DialogDescription className="text-xs">
            Nur die letzten Parent-Sessions für{' '}
            <span className="font-semibold text-foreground">{projectName}</span> behalten.
            Sub-Agent-Sessions werden mit ihrem Parent behalten oder gelöscht.
          </DialogDescription>
        </DialogHeader>

        {/* Keep count control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Die letzten</span>
          <Input
            type="number"
            min={1}
            max={Math.max(rootSessionCount, 1)}
            value={keepCount}
            onChange={(e) =>
              setKeepCount(Math.max(1, Math.min(100, Number.parseInt(e.target.value, 10) || 1)))
            }
            className="h-7 w-16 text-xs"
            disabled={isDeleting}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Parent-Sessions behalten
          </span>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          {toDelete.length > 0 ? (
            <>
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="text-xs">
                <span className="font-bold text-destructive">{toDelete.length}</span>
                {' Sessions werden gelöscht · '}
                <span className="text-emerald-500 font-medium">{toKeep.length}</span>
                {' bleiben'}
              </span>
            </>
          ) : (
            <>
              <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Keine Sessions betroffen – alle {projectSessions.length} bleiben erhalten
              </span>
            </>
          )}
        </div>

        {/* Preview of sessions to delete */}
        {toDelete.length > 0 && (
          <ScrollArea className="max-h-44">
            <div className="space-y-1 pr-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Werden gelöscht:</p>
              {toDelete.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5"
                >
                  <Trash2 className="h-2.5 w-2.5 shrink-0 text-destructive/60" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-foreground/80 truncate block">
                      {session.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {formatDate(session.updatedAt)}
                      {session.parentSessionId && ' · Sub-Agent'}
                      {' · '}
                      {session.messageCount} Nachrichten
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Info */}
        <div className="flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Die aktuelle Session bleibt immer erhalten. Gelöschte Sessions können nicht
            wiederhergestellt werden.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs"
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={toDelete.length === 0 || isDeleting}
            className="h-7 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {isDeleting
              ? 'Lösche...'
              : toDelete.length > 0
                ? `${toDelete.length} löschen`
                : 'Nichts zu löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
