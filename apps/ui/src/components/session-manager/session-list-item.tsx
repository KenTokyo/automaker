import { memo, useCallback, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Copy,
  Edit2,
  FileCode2,
  FileText,
  MessageSquare,
  PartyPopper,
  Sparkles,
  StopCircle,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ProjectBadge } from '@/components/project-badge';
import { useElapsedTime } from '@/hooks/use-elapsed-time';
import { useSessionFiles } from '@/hooks/use-session-files';
import { buildSessionFilesCopyText } from '@/lib/extract-session-files';
import { cn, getModelDisplayName } from '@/lib/utils';
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
  onSelectSession: (sessionId: string, sessionProjectPath?: string, isDirty?: boolean) => void;
  onToggleSelection: (sessionId: string) => void;
  getProjectName: (projectPath: string | undefined) => string | null;
  getBadgeColor: (projectPath: string | undefined) => string | undefined;
  getProject: (projectPath: string | undefined) => Project | null;
  phaseIndex?: number;
  isSubagentChild?: boolean;
  hasChildren?: boolean;
  childCount?: number;
  isChildrenCollapsed?: boolean;
  onToggleChildren?: (sessionId: string) => void;
}

function SessionListItemRowImpl({
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
  isSubagentChild = false,
  hasChildren = false,
  childCount = 0,
  isChildrenCollapsed = false,
  onToggleChildren,
}: SessionListItemRowProps) {
  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return '--:--';
    try {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const isCurrentSession = currentSessionId === session.id;
  const isSubagentSource =
    session.sourceType === 'subagent' || (!session.sourceType && Boolean(session.parentToolUseId));
  const parentSessionIsRunning =
    !session.parentSessionId ||
    runningSessions.has(session.parentSessionId) ||
    (currentSessionId === session.parentSessionId && isCurrentSessionThinking);
  const rawIsRunning =
    runningSessions.has(session.id) || (isCurrentSession && isCurrentSessionThinking);
  // Defensive guard: sub-agent rows should not stay "running" when parent is already finished.
  const isRunning = isSubagentSource ? rawIsRunning && parentSessionIsRunning : rawIsRunning;
  const hasFailed = session.status === 'failed' && !isRunning;
  const wasStopped = session.status === 'stopped' && !isRunning;
  const isDirty = session.isDirty && !isRunning && !hasFailed && !wasStopped;

  const elapsedTime = useElapsedTime(
    session.totalElapsedMs,
    session.lastStartedAt,
    isRunning,
    session.id
  );
  const hasElapsedTime = (session.totalElapsedMs && session.totalElapsedMs > 0) || isRunning;

  const project = getProject(session.projectPath);
  const sessionBadgeColor = getBadgeColor(session.projectPath);
  const isEditing = editingSessionId === session.id;
  const isPhaseItem = typeof phaseIndex === 'number';
  const isSubagent = isSubagentChild || isSubagentSource;
  const isEmptySubagent =
    isSubagentSource && (session.messageCount ?? 0) === 0 && !session.preview?.trim();
  const isSelectableSession = !session.isArchived && !isEmptySubagent;
  const isRowInteractive = isMultiselectMode || isSelectableSession;

  // File extraction for completed (dirty) sessions
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const { files: sessionFiles } = useSessionFiles(
    session.id,
    !!isDirty && (filesExpanded || copied)
  );

  const handleCopyFiles = useCallback(
    async (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!sessionFiles) return;
      const text = buildSessionFilesCopyText(
        session.name || 'Unbenannte Session',
        session.description,
        sessionFiles
      );
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard not available
      }
    },
    [session.name, session.description, sessionFiles]
  );

  const handleToggleExpand = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setFilesExpanded((v) => !v);
  }, []);

  return (
    <div
      className={cn(
        'group relative rounded-lg border',
        'animate-in fade-in slide-in-from-left-1 duration-200',
        'transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 ease-out',
        isRowInteractive
          ? 'cursor-pointer hover:-translate-y-[1px] hover:bg-accent/60 hover:shadow-sm active:translate-y-0 active:scale-[0.99]'
          : 'cursor-default',
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
        isDirty &&
          !isCurrentSession &&
          'border-emerald-500/70 bg-emerald-500/5 shadow-[0_8px_20px_-16px_theme(colors.emerald.500)]',
        isDirty &&
          isCurrentSession &&
          'border-emerald-500 bg-emerald-500/10 shadow-[0_8px_20px_-16px_theme(colors.emerald.500)]',
        !isRunning &&
          !wasStopped &&
          !isDirty &&
          isCurrentSession &&
          'border-primary bg-primary/10 shadow-[0_8px_20px_-16px_hsl(var(--primary))]',
        session.isArchived && 'opacity-60',
        // Signal-based card styling: violet border for QUESTION signal
        !isRunning &&
          !wasStopped &&
          !isDirty &&
          !hasFailed &&
          session.lastSignal === 'question' &&
          !isCurrentSession &&
          'border-violet-500/60 bg-violet-500/5 shadow-[0_8px_20px_-16px_theme(colors.violet.500)]',
        !isRunning &&
          !wasStopped &&
          !isDirty &&
          !hasFailed &&
          session.lastSignal === 'question' &&
          isCurrentSession &&
          'border-violet-500 bg-violet-500/10 shadow-[0_8px_20px_-16px_theme(colors.violet.500)]',
        isMultiselectMode &&
          isSelected &&
          'border-primary bg-primary/20 shadow-[0_8px_18px_-16px_hsl(var(--primary))]',
        isPhaseItem && 'bg-muted/20',
        isSubagent &&
          'border-sky-500/50 bg-sky-500/5 shadow-[0_8px_20px_-16px_theme(colors.sky.500)]'
      )}
      style={{
        fontSize: `${sessionFontSize}px`,
        padding: isSubagent
          ? `${Math.max(3, sessionFontSize * 0.45)}px ${Math.max(6, sessionFontSize * 0.68)}px`
          : `${Math.max(4, sessionFontSize * 0.6)}px ${Math.max(6, sessionFontSize * 0.75)}px`,
        borderLeftWidth: sessionBadgeColor ? '3px' : undefined,
        borderLeftColor: sessionBadgeColor || undefined,
      }}
      data-active={isCurrentSession ? 'true' : undefined}
      onClick={() => {
        if (isMultiselectMode) {
          onToggleSelection(session.id);
        } else if (isSelectableSession) {
          onSelectSession(session.id, session.projectPath, session.isDirty);
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
              {/* Row 1: Collapse toggle + Status icon + Title (full width) */}
              <div className="mb-0.5 flex items-center gap-1.5">
                {hasChildren && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleChildren?.(session.id);
                    }}
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-sm p-0',
                      'text-muted-foreground transition-all duration-200',
                      'hover:bg-accent hover:text-foreground'
                    )}
                    style={{
                      width: `${sessionFontSize + 2}px`,
                      height: `${sessionFontSize + 2}px`,
                    }}
                    title={isChildrenCollapsed ? 'Sub-Agents anzeigen' : 'Sub-Agents verbergen'}
                  >
                    <ChevronDown
                      className={cn(
                        'transition-transform duration-200',
                        isChildrenCollapsed && '-rotate-90'
                      )}
                      style={{
                        width: `${sessionFontSize - 2}px`,
                        height: `${sessionFontSize - 2}px`,
                      }}
                    />
                  </button>
                )}

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
                ) : isDirty ? (
                  <CheckCircle2
                    style={{
                      width: `${sessionFontSize}px`,
                      height: `${sessionFontSize}px`,
                    }}
                    className="shrink-0 text-emerald-500"
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

                <h3 className="truncate font-medium" style={{ fontSize: 'inherit' }}>
                  {session.name || 'Unbenannte Session'}
                </h3>

                {isSubagentSource && (
                  <span
                    className="shrink-0 text-muted-foreground"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                    title={`Updated ${formatTime(session.updatedAt)}`}
                  >
                    {formatTime(session.updatedAt)}
                  </span>
                )}
              </div>

              {/* Row 2: Badges (status, phase, sub-agent, model, timer) */}
              <div
                className={cn('mb-0.5 flex flex-wrap items-center gap-1', isSubagent && 'mb-0')}
                style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
              >
                {isPhaseItem && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                    Phase {phaseIndex}
                  </span>
                )}

                {isSubagent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-sky-500">
                    <Bot className="h-2.5 w-2.5" />
                    Sub-Agent
                  </span>
                )}

                {isRunning && (
                  <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-500">
                    läuft
                  </span>
                )}

                {wasStopped && (
                  <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-red-500">
                    Gestoppt
                  </span>
                )}

                {isDirty && (
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-500">
                    Fertig
                  </span>
                )}

                {hasFailed && (
                  <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive">
                    Fehler
                  </span>
                )}

                {/* Signal badges: ALL_PHASES_COMPLETE (green) and QUESTION (violet) */}
                {session.lastSignal === 'all_phases_complete' && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-400"
                    title="Alle Phasen abgeschlossen"
                  >
                    <PartyPopper
                      className="shrink-0"
                      style={{
                        width: `${Math.max(8, sessionFontSize - 5)}px`,
                        height: `${Math.max(8, sessionFontSize - 5)}px`,
                      }}
                    />
                    Alle Phasen fertig
                  </span>
                )}

                {session.lastSignal === 'question' && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 font-medium text-violet-400"
                    title="Offene Frage - Antwort wird erwartet"
                  >
                    <CircleHelp
                      className="shrink-0"
                      style={{
                        width: `${Math.max(8, sessionFontSize - 5)}px`,
                        height: `${Math.max(8, sessionFontSize - 5)}px`,
                      }}
                    />
                    Frage offen
                  </span>
                )}

                {session.model && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-violet-400"
                    title={`Model: ${session.model}${session.thinkingLevel && session.thinkingLevel !== 'none' ? ` (${session.thinkingLevel} thinking)` : ''}${session.reasoningEffort && session.reasoningEffort !== 'none' ? ` (${session.reasoningEffort} reasoning)` : ''}`}
                  >
                    <Sparkles
                      className="shrink-0"
                      style={{
                        width: `${Math.max(8, sessionFontSize - 5)}px`,
                        height: `${Math.max(8, sessionFontSize - 5)}px`,
                      }}
                    />
                    <span className="truncate">
                      {getModelDisplayName(session.model).replace('Claude ', '')}
                      {session.thinkingLevel && session.thinkingLevel !== 'none' && (
                        <span className="ml-0.5 text-violet-400/70">
                          (
                          {session.thinkingLevel === 'ultrathink'
                            ? 'Ultra'
                            : session.thinkingLevel === 'medium'
                              ? 'Med'
                              : session.thinkingLevel.charAt(0).toUpperCase() +
                                session.thinkingLevel.slice(1)}
                          )
                        </span>
                      )}
                      {session.reasoningEffort && session.reasoningEffort !== 'none' && (
                        <span className="ml-0.5 text-violet-400/70">
                          (
                          {session.reasoningEffort === 'medium'
                            ? 'Med'
                            : session.reasoningEffort === 'xhigh'
                              ? 'XHigh'
                              : session.reasoningEffort === 'minimal'
                                ? 'Min'
                                : session.reasoningEffort.charAt(0).toUpperCase() +
                                  session.reasoningEffort.slice(1)}
                          )
                        </span>
                      )}
                    </span>
                  </span>
                )}

                {hasElapsedTime && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono tabular-nums',
                      isRunning ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
                    )}
                    title="Elapsed time"
                  >
                    <Timer
                      className="shrink-0"
                      style={{
                        width: `${Math.max(8, sessionFontSize - 5)}px`,
                        height: `${Math.max(8, sessionFontSize - 5)}px`,
                      }}
                    />
                    {elapsedTime}
                  </span>
                )}

                {hasChildren && isChildrenCollapsed && childCount > 0 && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleChildren?.(session.id);
                    }}
                    className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-sky-400 transition-colors hover:bg-sky-500/20 hover:text-sky-300"
                  >
                    <Bot
                      className="shrink-0"
                      style={{
                        width: `${Math.max(8, sessionFontSize - 5)}px`,
                        height: `${Math.max(8, sessionFontSize - 5)}px`,
                      }}
                    />
                    {childCount} eingeklappt
                  </button>
                )}
              </div>

              {!isEmptySubagent && (
                <>
                  {session.description && (
                    <p
                      className={cn(
                        'mt-0.5 overflow-hidden whitespace-pre-line text-muted-foreground',
                        'transition-colors duration-300 ease-out',
                        isCurrentSession
                          ? 'line-clamp-none text-foreground/70'
                          : 'line-clamp-2 group-hover:line-clamp-4 group-hover:text-foreground/60'
                      )}
                      style={{ fontSize: `${Math.max(10, sessionFontSize - 2)}px` }}
                    >
                      {session.description}
                    </p>
                  )}

                  {!session.description && session.preview && (
                    <p
                      className="truncate text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80"
                      style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                    >
                      {session.preview}
                    </p>
                  )}
                </>
              )}

              {session.lastError && (
                <p
                  className="mt-1 overflow-hidden text-destructive/90 line-clamp-2 group-hover:line-clamp-4"
                  style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                >
                  Fehler: {session.lastError}
                </p>
              )}

              {!isSubagentSource && (
                <div
                  className="mt-1 flex flex-wrap items-center gap-2"
                  style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
                >
                  <span className="text-muted-foreground">
                    {session.messageCount ?? 0} messages
                  </span>
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
              )}
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
              onClick={() => onStartEditing(session.id, session.name || '')}
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

            {/* Copy & Expand buttons for completed sessions */}
            {isDirty && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    // Trigger lazy load by briefly setting copied, then actually copy
                    if (!sessionFiles) {
                      setCopied(true);
                      // Will re-render, load files, then user clicks again
                      setTimeout(() => setCopied(false), 200);
                      return;
                    }
                    void handleCopyFiles(e);
                  }}
                  className={cn(
                    'p-0 transition-transform duration-200 hover:scale-105',
                    copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{
                    width: `${sessionFontSize + 6}px`,
                    height: `${sessionFontSize + 6}px`,
                  }}
                  title="Session-Dateien kopieren"
                >
                  {copied ? (
                    <Check
                      style={{
                        width: `${sessionFontSize - 2}px`,
                        height: `${sessionFontSize - 2}px`,
                      }}
                    />
                  ) : (
                    <Copy
                      style={{
                        width: `${sessionFontSize - 2}px`,
                        height: `${sessionFontSize - 2}px`,
                      }}
                    />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToggleExpand}
                  className={cn(
                    'p-0 transition-all duration-200 hover:scale-105',
                    filesExpanded
                      ? 'text-emerald-500'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  style={{
                    width: `${sessionFontSize + 6}px`,
                    height: `${sessionFontSize + 6}px`,
                  }}
                  title={filesExpanded ? 'Dateien einklappen' : 'Dateien anzeigen'}
                >
                  <ChevronDown
                    className={cn(
                      'transition-transform duration-200',
                      filesExpanded && 'rotate-180'
                    )}
                    style={{
                      width: `${sessionFontSize - 2}px`,
                      height: `${sessionFontSize - 2}px`,
                    }}
                  />
                </Button>
              </>
            )}
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

      {/* Expandable file detail panel for completed sessions */}
      {isDirty && filesExpanded && (
        <div
          className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
            {!sessionFiles ? (
              <div
                className="flex items-center gap-2 text-muted-foreground"
                style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
              >
                <Spinner size="sm" className="text-emerald-500" />
                <span>Dateien werden geladen...</span>
              </div>
            ) : sessionFiles.totalCount === 0 ? (
              <p
                className="text-muted-foreground italic"
                style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}
              >
                Keine Dateipfade in dieser Session erkannt.
              </p>
            ) : (
              <>
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className="font-medium text-emerald-600 dark:text-emerald-400"
                    style={{ fontSize: `${Math.max(9, sessionFontSize - 3)}px` }}
                  >
                    {sessionFiles.totalCount} Dateien referenziert
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => void handleCopyFiles(e)}
                    title="Alle Dateien kopieren"
                  >
                    {copied ? (
                      <Check className="mr-1 h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    <span style={{ fontSize: `${Math.max(9, sessionFontSize - 4)}px` }}>
                      Kopieren
                    </span>
                  </Button>
                </div>

                {/* File categories */}
                <div className="space-y-1.5">
                  {sessionFiles.mdFiles.length > 0 && (
                    <FileCategory
                      label="Dokumentation"
                      files={sessionFiles.mdFiles}
                      icon={<FileText className="h-3 w-3 text-blue-400" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                  {sessionFiles.tsFiles.length > 0 && (
                    <FileCategory
                      label="TypeScript"
                      files={sessionFiles.tsFiles}
                      icon={<FileCode2 className="h-3 w-3 text-blue-500" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                  {sessionFiles.jsFiles.length > 0 && (
                    <FileCategory
                      label="JavaScript"
                      files={sessionFiles.jsFiles}
                      icon={<FileCode2 className="h-3 w-3 text-yellow-500" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                  {sessionFiles.configFiles.length > 0 && (
                    <FileCategory
                      label="Konfiguration"
                      files={sessionFiles.configFiles}
                      icon={<FileText className="h-3 w-3 text-orange-400" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                  {sessionFiles.styleFiles.length > 0 && (
                    <FileCategory
                      label="Styles"
                      files={sessionFiles.styleFiles}
                      icon={<FileText className="h-3 w-3 text-pink-400" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                  {sessionFiles.otherFiles.length > 0 && (
                    <FileCategory
                      label="Sonstige"
                      files={sessionFiles.otherFiles}
                      icon={<FileText className="h-3 w-3 text-muted-foreground" />}
                      fontSize={sessionFontSize}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const SessionListItemRow = memo(SessionListItemRowImpl);
SessionListItemRow.displayName = 'SessionListItemRow';

// ---------------------------------------------------------------------------
// Sub-component: FileCategory
// ---------------------------------------------------------------------------

function FileCategory({
  label,
  files,
  icon,
  fontSize,
}: {
  label: string;
  files: string[];
  icon: React.ReactNode;
  fontSize: number;
}) {
  return (
    <div>
      <div
        className="mb-0.5 flex items-center gap-1 font-medium text-muted-foreground"
        style={{ fontSize: `${Math.max(9, fontSize - 4)}px` }}
      >
        {icon}
        <span>{label}</span>
        <span className="text-muted-foreground/60">({files.length})</span>
      </div>
      <ul className="space-y-0">
        {files.map((file) => (
          <li key={file} className="group/file flex items-center gap-1 pl-4">
            <span
              className="min-w-0 flex-1 truncate font-mono text-muted-foreground"
              style={{ fontSize: `${Math.max(9, fontSize - 4)}px` }}
              title={file}
            >
              {file}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 shrink-0 p-0 text-muted-foreground opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-foreground"
              onClick={() => void navigator.clipboard.writeText(file)}
              title="Pfad kopieren"
            >
              <Copy className="h-2.5 w-2.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
