import { useCallback, useMemo, useState } from 'react';
import { Trash2, FolderOpen, Info, Shield } from 'lucide-react';
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

type DeleteMode = 'older-than' | 'keep-last';

interface ProjectDeletePreview {
  projectPath: string;
  projectName: string;
  totalCount: number;
  deleteCount: number;
  keepCount: number;
  sessionsToDelete: SessionListItem[];
}

interface DeleteOldSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: SessionListItem[];
  currentSessionId: string | null;
  getProjectName: (projectPath: string | undefined) => string | null;
  onDeleteSessions: (sessionIds: string[]) => Promise<void>;
}

interface SessionIndex {
  byId: Map<string, SessionListItem>;
  childrenByParentId: Map<string, SessionListItem[]>;
}

function extractFolderName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || path;
}

function getTimestamp(isoDate: string): number {
  return new Date(isoDate).getTime();
}

function buildSessionIndex(sessions: SessionListItem[]): SessionIndex {
  const byId = new Map(sessions.map((session) => [session.id, session]));
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

/**
 * Berechnet pro Projekt, welche Sessions gelöscht werden.
 * Beachtet:
 * - Die aktuelle Session wird nie gelöscht (auch nicht indirekt via Parent-Cascade).
 * - Bei Parent/Child-Strukturen bleiben geschützte Kinder erhalten, indem Vorfahren geschützt werden.
 */
function computePreview(
  sessions: SessionListItem[],
  currentSessionId: string | null,
  getProjectName: (p: string | undefined) => string | null,
  mode: DeleteMode,
  days: number,
  keepCount: number
): ProjectDeletePreview[] {
  const byProject = new Map<string, SessionListItem[]>();
  for (const session of sessions) {
    const key = session.projectPath || '__no_project__';
    const existing = byProject.get(key);
    if (existing) {
      existing.push(session);
    } else {
      byProject.set(key, [session]);
    }
  }

  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const previews: ProjectDeletePreview[] = [];

  for (const [projectPath, projectSessions] of byProject) {
    const name =
      projectPath === '__no_project__'
        ? 'Unbekannt'
        : getProjectName(projectPath) || extractFolderName(projectPath);

    const sorted = [...projectSessions].sort(
      (a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)
    );
    const index = buildSessionIndex(sorted);
    const protectedIds = new Set<string>();

    if (currentSessionId && index.byId.has(currentSessionId)) {
      addAncestorsToSet(protectedIds, currentSessionId, index.byId);
    }

    let toDelete: SessionListItem[];

    if (mode === 'older-than') {
      for (const session of sorted) {
        const updatedAtMs = getTimestamp(session.updatedAt);
        const shouldKeep =
          !Number.isFinite(updatedAtMs) ||
          updatedAtMs >= cutoffMs ||
          session.id === currentSessionId;

        if (shouldKeep) {
          addAncestorsToSet(protectedIds, session.id, index.byId);
        }
      }

      toDelete = sorted.filter((session) => {
        if (protectedIds.has(session.id)) return false;
        const updatedAtMs = getTimestamp(session.updatedAt);
        return Number.isFinite(updatedAtMs) && updatedAtMs < cutoffMs;
      });
    } else {
      const rootSessions = sorted.filter(
        (session) => !session.parentSessionId || !index.byId.has(session.parentSessionId)
      );
      const keepRootIds = rootSessions.slice(0, keepCount).map((session) => session.id);

      for (const rootId of keepRootIds) {
        addDescendantsToSet(protectedIds, rootId, index.childrenByParentId);
      }

      toDelete = sorted.filter((session) => !protectedIds.has(session.id));
    }

    previews.push({
      projectPath,
      projectName: name,
      totalCount: sorted.length,
      deleteCount: toDelete.length,
      keepCount: sorted.length - toDelete.length,
      sessionsToDelete: toDelete,
    });
  }

  previews.sort((a, b) => a.projectName.toLowerCase().localeCompare(b.projectName.toLowerCase()));
  return previews;
}

function ProjectPreviewRow({
  preview,
  onDeleteProject,
  isDeleting,
}: {
  preview: ProjectDeletePreview;
  onDeleteProject: (sessionIds: string[]) => Promise<void>;
  isDeleting: boolean;
}) {
  const hasDeletes = preview.deleteCount > 0;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-2.5 py-2">
      <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-foreground truncate block">
          {preview.projectName}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {hasDeletes ? (
            <>
              <span className="text-destructive font-medium">{preview.deleteCount}</span>
              {' von '}
              {preview.totalCount}
              {' werden gelöscht'}
              {' · '}
              <span className="text-emerald-500">{preview.keepCount} bleiben</span>
            </>
          ) : (
            <>
              {preview.totalCount} Sessions ·{' '}
              <span className="text-emerald-500">alle bleiben erhalten</span>
            </>
          )}
        </span>
      </div>
      {hasDeletes && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 gap-1 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() =>
            void onDeleteProject(preview.sessionsToDelete.map((session) => session.id))
          }
          disabled={isDeleting}
        >
          <Trash2 className="h-2.5 w-2.5" />
          {preview.deleteCount}
        </Button>
      )}
    </div>
  );
}

export function DeleteOldSessionsDialog({
  open,
  onOpenChange,
  sessions,
  currentSessionId,
  getProjectName,
  onDeleteSessions,
}: DeleteOldSessionsDialogProps) {
  const [mode, setMode] = useState<DeleteMode>('older-than');
  const [days, setDays] = useState(7);
  const [keepCount, setKeepCount] = useState(5);
  const [isDeleting, setIsDeleting] = useState(false);

  const previews = useMemo(
    () => computePreview(sessions, currentSessionId, getProjectName, mode, days, keepCount),
    [sessions, currentSessionId, getProjectName, mode, days, keepCount]
  );

  const totalDeleteCount = useMemo(
    () => previews.reduce((sum, preview) => sum + preview.deleteCount, 0),
    [previews]
  );
  const totalKeepCount = useMemo(
    () => previews.reduce((sum, preview) => sum + preview.keepCount, 0),
    [previews]
  );

  const allSessionIdsToDelete = useMemo(
    () => previews.flatMap((preview) => preview.sessionsToDelete.map((session) => session.id)),
    [previews]
  );

  const executeDelete = useCallback(
    async (sessionIds: string[], closeOnSuccess: boolean) => {
      if (sessionIds.length === 0 || isDeleting) return;

      setIsDeleting(true);
      try {
        await onDeleteSessions(sessionIds);
        if (closeOnSuccess) {
          onOpenChange(false);
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [isDeleting, onDeleteSessions, onOpenChange]
  );

  const handleDeleteAll = () => {
    void executeDelete(allSessionIdsToDelete, true);
  };

  const handleDeleteProject = async (sessionIds: string[]) => {
    await executeDelete(sessionIds, false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="delete-old-sessions-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Sessions aufräumen</DialogTitle>
          <DialogDescription className="text-xs">
            Wähle aus, wie du alte Sessions entfernen möchtest. Die aktuelle Session bleibt immer
            erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          <Button
            variant={mode === 'older-than' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 flex-1 text-[11px]"
            onClick={() => setMode('older-than')}
            disabled={isDeleting}
          >
            Älter als X Tage
          </Button>
          <Button
            variant={mode === 'keep-last' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 flex-1 text-[11px]"
            onClick={() => setMode('keep-last')}
            disabled={isDeleting}
          >
            Letzte N behalten
          </Button>
        </div>

        {mode === 'older-than' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Älter als</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(event) =>
                setDays(Math.max(1, Math.min(365, Number.parseInt(event.target.value, 10) || 1)))
              }
              className="h-7 w-20 text-xs"
              disabled={isDeleting}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Tage</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Pro Projekt die letzten
            </span>
            <Input
              type="number"
              min={1}
              max={100}
              value={keepCount}
              onChange={(event) =>
                setKeepCount(
                  Math.max(1, Math.min(100, Number.parseInt(event.target.value, 10) || 1))
                )
              }
              className="h-7 w-16 text-xs"
              disabled={isDeleting}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">behalten</span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          {totalDeleteCount > 0 ? (
            <>
              <Trash2 className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="text-xs">
                <span className="font-bold text-destructive">{totalDeleteCount}</span>
                {' Sessions werden gelöscht · '}
                <span className="text-emerald-500 font-medium">{totalKeepCount}</span>
                {' bleiben'}
              </span>
            </>
          ) : (
            <>
              <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Keine Sessions betroffen – alle {sessions.length} bleiben erhalten
              </span>
            </>
          )}
        </div>

        {previews.length > 0 && (
          <ScrollArea className="max-h-52">
            <div className="space-y-1.5 pr-3">
              {previews.map((preview) => (
                <ProjectPreviewRow
                  key={preview.projectPath}
                  preview={preview}
                  onDeleteProject={handleDeleteProject}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Gelöschte Sessions können nicht wiederhergestellt werden. Du kannst auch einzelne
            Projekte gezielt aufräumen.
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
            onClick={handleDeleteAll}
            disabled={totalDeleteCount === 0 || isDeleting}
            className="h-7 text-xs"
            data-testid="confirm-delete-old-sessions"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {isDeleting
              ? 'Lösche...'
              : totalDeleteCount > 0
                ? `${totalDeleteCount} löschen`
                : 'Nichts zu löschen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
