import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Check,
  Edit2,
  Info,
  MessageSquare,
  StopCircle,
  Trash2,
  X,
} from 'lucide-react';
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
  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isCurrentSession = currentSessionId === session.id;
  const isRunning =
    session.status === 'running' ||
    (isCurrentSession && isCurrentSessionThinking) ||
    runningSessions.has(session.id);
  const hasFailed = session.status === 'failed' && !isRunning;
  const wasStopped = session.status === 'stopped' && !isRunning;

  const project = getProject(session.projectPath);
  const sessionBadgeColor = getBadgeColor(session.projectPath);
  const isEditing = editingSessionId === session.id;
  const isPhaseItem = typeof phaseIndex === 'number';

  return (
    <div
      className={cn(
        'group relative cursor-pointer rounded-lg border',
        'animate-in fade-in slide-in-from-left-1 duration-200',
        'transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 ease-out',
        'hover:-translate-y-[1px] hover:bg-accent/60 hover:shadow-sm active:translate-y-0 active:scale-[0.99]',
        isRunning &&
          !isCurrentSession &&
          'border-amber-500/70 bg-amber-500/5 shadow-[0_8px_20px_-16px_theme(colors.amber.500)]',
        isRunning &&
          isCurrentSession &&
          'border-amber-500 bg-amber-500/10 shadow-[0_8px_20px_-16px_theme(colors.amber.500)]',
        wasStopped &&
          !isCurrentSession &&
          'border-red-500/70 bg-red-500/5 shadow-[0_8px_20px_-16px_theme(colors.red.500)]',
        wasStopped &&
          isCurrentSession &&
          'border-red-500 bg-red-500/10 shadow-[0_8px_20px_-16px_theme(colors.red.500)]',
        !isRunning &&
          !wasStopped &&
          isCurrentSession &&
          'border-primary bg-primary/10 shadow-[0_8px_20px_-16px_hsl(var(--primary))]',
        session.isArchived && 'opacity-60',
        isMultiselectMode &&
          isSelected &&
          'border-primary bg-primary/20 shadow-[0_8px_18px_-16px_hsl(var(--primary))]',
        isPhaseItem && 'bg-muted/20'
      )}
      style={{
        fontSize: `${sessionFontSize}px`,
        padding: `${Math.max(4, sessionFontSize * 0.6)}px ${Math.max(6, sessionFontSize * 0.75)}px`,
        borderLeftWidth: sessionBadgeColor ? '3px' : undefined,
        borderLeftColor: sessionBadgeColor || undefined,
      }}
      data-active={isCurrentSession ? 'true' : undefined}
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
                  <Spinner size="sm" className="shrink-0 text-amber-500" />
                ) : wasStopped ? (
                  <StopCircle
                    style={{
                      width: `${sessionFontSize}px`,
                      height: `${sessionFontSize}px`,
                    }}
                    className="shrink-0 text-red-500"
                  />
                ) : hasFailed ? (
                  <AlertCircle
                    style={{
                      width: `${sessionFontSize}px`,
                      height: `${sessionFontSize}px`,
                    }}
                    className="shrink-0 text-destructive"
                  />
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
                    className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-500"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                  >
                    läuft
                  </span>
                )}

                {wasStopped && (
                  <span
                    className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-red-500"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                  >
                    Gestoppt
                  </span>
                )}

                {hasFailed && (
                  <span
                    className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                  >
                    Fehler
                  </span>
                )}
              </div>

              {session.description && (
                <div
                  className={cn(
                    'mt-1 rounded-md border border-muted-foreground/25 bg-muted/35 px-2 py-1.5',
                    'transition-colors duration-200',
                    isCurrentSession
                      ? 'bg-muted/45'
                      : 'group-hover:border-muted-foreground/35 group-hover:bg-muted/45'
                  )}
                >
                  <div className="flex items-start gap-1.5">
                    <Info
                      className="mt-0.5 shrink-0 text-muted-foreground"
                      style={{
                        width: `${Math.max(10, sessionFontSize - 3)}px`,
                        height: `${Math.max(10, sessionFontSize - 3)}px`,
                      }}
                      aria-hidden
                    />
                    <p
                      className={cn(
                        'overflow-hidden whitespace-pre-line italic text-foreground/85',
                        'transition-[max-height,color] duration-300 ease-out',
                        isCurrentSession
                          ? 'line-clamp-none max-h-44 text-foreground'
                          : 'line-clamp-2 max-h-14 group-hover:line-clamp-4 group-hover:max-h-28 group-hover:text-foreground/95'
                      )}
                      style={{ fontSize: `${Math.max(10, sessionFontSize - 2)}px` }}
                    >
                      {session.description}
                    </p>
                  </div>
                </div>
              )}

              {!session.description && session.preview && (
                <p
                  className="truncate text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80"
                  style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                >
                  {session.preview}
                </p>
              )}

              {session.lastError && (
                <p
                  className="mt-1 overflow-hidden text-destructive/90 transition-[max-height] duration-200 line-clamp-2 group-hover:line-clamp-4"
                  style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                >
                  Fehler: {session.lastError}
                </p>
              )}

              <div
                className="mt-1 flex flex-wrap items-center gap-2"
                style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
              >
                <span className="text-muted-foreground">{session.messageCount} messages</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  Created {formatTime(session.createdAt)}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">
                  Updated {formatTime(session.updatedAt)}
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
          <div
            className="flex flex-col gap-0.5 opacity-80 transition-opacity duration-200 group-hover:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStartEditing(session.id, session.name)}
              className="p-0 transition-transform duration-200 hover:scale-105"
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
              className="p-0 transition-transform duration-200 hover:scale-105"
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
              className="p-0 text-destructive transition-transform duration-200 hover:scale-105 hover:text-destructive"
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
          <div
            className="flex flex-col gap-0.5 opacity-80 transition-opacity duration-200 group-hover:opacity-100"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUnarchiveSession(session.id)}
              className="p-0 transition-transform duration-200 hover:scale-105"
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
              className="p-0 text-destructive transition-transform duration-200 hover:scale-105 hover:text-destructive"
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
