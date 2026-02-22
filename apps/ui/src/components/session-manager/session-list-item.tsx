import { Archive, ArchiveRestore, Check, Edit2, MessageSquare, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ProjectBadge } from '@/components/project-badge';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/electron';
import type { SessionListItem } from '@/types/electron';

interface SessionListItemRowProps {
  session: SessionListItem;
  currentSessionId: string | null;
  isCurrentSessionThinking: boolean;
  runningSessions: Set<string>;
  sessionFontSize: number;
  isMultiselectMode: boolean;
  isSelected: boolean;
  editingSessionId: string | null;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onStartEditing: (sessionId: string, currentName: string) => void;
  onStopEditing: () => void;
  onRenameSession: (sessionId: string) => void;
  onArchiveSession: (sessionId: string) => void;
  onUnarchiveSession: (sessionId: string) => void;
  onDeleteSession: (session: SessionListItem) => void;
  onSelectSession: (sessionId: string, sessionProjectPath?: string) => void;
  onToggleSelection: (sessionId: string) => void;
  getProjectName: (projectPath: string | undefined) => string | null;
  getBadgeColor: (projectPath: string | undefined) => string | undefined;
  getProject: (projectPath: string | undefined) => Project | null;
  phaseIndex?: number;
}

export function SessionListItemRow({
  session,
  currentSessionId,
  isCurrentSessionThinking,
  runningSessions,
  sessionFontSize,
  isMultiselectMode,
  isSelected,
  editingSessionId,
  editingName,
  onEditingNameChange,
  onStartEditing,
  onStopEditing,
  onRenameSession,
  onArchiveSession,
  onUnarchiveSession,
  onDeleteSession,
  onSelectSession,
  onToggleSelection,
  getProjectName,
  getBadgeColor,
  getProject,
  phaseIndex,
}: SessionListItemRowProps) {
  const isRunning =
    (currentSessionId === session.id && isCurrentSessionThinking) ||
    runningSessions.has(session.id);

  const project = getProject(session.projectPath);
  const sessionBadgeColor = getBadgeColor(session.projectPath);
  const isEditing = editingSessionId === session.id;
  const isPhaseItem = typeof phaseIndex === 'number';

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border transition-colors hover:bg-accent/50',
        currentSessionId === session.id && 'border-primary bg-primary/10',
        session.isArchived && 'opacity-60',
        isMultiselectMode && isSelected && 'border-primary bg-primary/20',
        isPhaseItem && 'bg-muted/20'
      )}
      style={{
        fontSize: `${sessionFontSize}px`,
        padding: `${Math.max(4, sessionFontSize * 0.6)}px ${Math.max(6, sessionFontSize * 0.75)}px`,
        borderLeftWidth: sessionBadgeColor ? '3px' : undefined,
        borderLeftColor: sessionBadgeColor || undefined,
      }}
      onClick={() => {
        if (isMultiselectMode) {
          onToggleSelection(session.id);
        } else if (!session.isArchived) {
          onSelectSession(session.id, session.projectPath);
        }
      }}
      data-testid={`session-item-${session.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        {isMultiselectMode && (
          <div className="flex items-center pt-0.5" onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(session.id)}
              data-testid={`session-checkbox-${session.id}`}
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="mb-2 flex gap-2">
              <Input
                value={editingName}
                onChange={(event) => onEditingNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onRenameSession(session.id);
                  if (event.key === 'Escape') onStopEditing();
                }}
                onClick={(event) => event.stopPropagation()}
                autoFocus
                className="h-7"
              />
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onRenameSession(session.id);
                }}
                className="h-7"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onStopEditing();
                }}
                className="h-7"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-0.5 flex items-center gap-1.5">
                {isRunning ? (
                  <Spinner size="sm" className="shrink-0" />
                ) : (
                  <MessageSquare
                    style={{
                      width: `${sessionFontSize}px`,
                      height: `${sessionFontSize}px`,
                    }}
                    className="shrink-0 text-muted-foreground"
                  />
                )}

                {isPhaseItem && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Phase {phaseIndex}
                  </span>
                )}

                <h3 className="truncate font-medium" style={{ fontSize: 'inherit' }}>
                  {session.name}
                </h3>

                {isRunning && (
                  <span
                    className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                  >
                    thinking...
                  </span>
                )}
              </div>

              {session.description && (
                <p
                  className="line-clamp-3 whitespace-pre-line text-foreground/80"
                  style={{ fontSize: `${Math.max(10, sessionFontSize - 2)}px` }}
                >
                  {session.description}
                </p>
              )}

              {!session.description && session.preview && (
                <p
                  className="truncate text-muted-foreground"
                  style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                >
                  {session.preview}
                </p>
              )}

              <div
                className="mt-1 flex flex-wrap items-center gap-2"
                style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
              >
                <span className="text-muted-foreground">{session.messageCount} messages</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </span>

                {session.projectPath && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <ProjectBadge
                      projectName={getProjectName(session.projectPath)}
                      projectPath={session.projectPath}
                      badgeColor={sessionBadgeColor ?? undefined}
                      backgroundColor={project?.backgroundColor}
                      textColor={project?.textColor}
                      iconColor={project?.iconColor}
                      icon={project?.icon}
                      customIconPath={project?.customIconPath}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {!isMultiselectMode && !session.isArchived && (
          <div className="flex gap-0.5" onClick={(event) => event.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEditing(session.id, session.name)}
              className="p-0"
              style={{
                width: `${sessionFontSize + 6}px`,
                height: `${sessionFontSize + 6}px`,
              }}
              title="Rename session"
            >
              <Edit2
                style={{
                  width: `${sessionFontSize - 2}px`,
                  height: `${sessionFontSize - 2}px`,
                }}
              />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onArchiveSession(session.id)}
              className="p-0"
              style={{
                width: `${sessionFontSize + 6}px`,
                height: `${sessionFontSize + 6}px`,
              }}
              data-testid={`archive-session-${session.id}`}
              title="Archive session"
            >
              <Archive
                style={{
                  width: `${sessionFontSize - 2}px`,
                  height: `${sessionFontSize - 2}px`,
                }}
              />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteSession(session)}
              className="p-0 text-destructive hover:text-destructive"
              style={{
                width: `${sessionFontSize + 6}px`,
                height: `${sessionFontSize + 6}px`,
              }}
              data-testid={`delete-session-${session.id}`}
              title="Delete session"
            >
              <Trash2
                style={{
                  width: `${sessionFontSize - 2}px`,
                  height: `${sessionFontSize - 2}px`,
                }}
              />
            </Button>
          </div>
        )}

        {!isMultiselectMode && session.isArchived && (
          <div className="flex gap-0.5" onClick={(event) => event.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnarchiveSession(session.id)}
              className="p-0"
              style={{
                width: `${sessionFontSize + 6}px`,
                height: `${sessionFontSize + 6}px`,
              }}
              title="Restore session"
            >
              <ArchiveRestore
                style={{
                  width: `${sessionFontSize - 2}px`,
                  height: `${sessionFontSize - 2}px`,
                }}
              />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteSession(session)}
              className="p-0 text-destructive hover:text-destructive"
              style={{
                width: `${sessionFontSize + 6}px`,
                height: `${sessionFontSize + 6}px`,
              }}
              data-testid={`delete-archived-session-${session.id}`}
              title="Delete session"
            >
              <Trash2
                style={{
                  width: `${sessionFontSize - 2}px`,
                  height: `${sessionFontSize - 2}px`,
                }}
              />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
