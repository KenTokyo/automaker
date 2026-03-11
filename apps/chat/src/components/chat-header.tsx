import {
  Clock3,
  Copy,
  FolderOpen,
  Keyboard,
  LoaderCircle,
  Save,
  Settings2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/lib/electron';
import { cn } from '@/lib/utils';
import { RunningSessionsBadge } from './running-sessions-badge';
import { SessionTabBar, type SessionTabItem } from './session-tab-bar';
import { SoundToggle } from './sound-toggle';

export type ChatHeaderSessionTab = SessionTabItem;

interface ChatHeaderProps {
  currentProject: Project;
  projects: Project[];
  sessions: ChatHeaderSessionTab[];
  currentSessionId: string | null;
  isConnected: boolean;
  currentTool: string | null;
  leftOpen: boolean;
  rightOpen: boolean;
  isCreatingSession: boolean;
  onProjectSelect: (project: Project) => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onCloseSession: (sessionId: string) => void;
  onCloseOtherSessions: (sessionId: string) => void;
  onRenameSession: (sessionId: string, nextName: string) => Promise<boolean>;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onCopyAll: () => void;
  onSaveChat: () => void;
  onOpenSettings: () => void;
  onOpenShortcutHelp: () => void;
  copyDisabled: boolean;
  saveDisabled: boolean;
}

export function ChatHeader({
  currentProject,
  projects,
  sessions,
  currentSessionId,
  isConnected,
  currentTool,
  leftOpen,
  rightOpen,
  isCreatingSession,
  onProjectSelect,
  onSelectSession,
  onNewChat,
  onCloseSession,
  onCloseOtherSessions,
  onRenameSession,
  onToggleLeft,
  onToggleRight,
  onCopyAll,
  onSaveChat,
  onOpenSettings,
  onOpenShortcutHelp,
  copyDisabled,
  saveDisabled,
}: ChatHeaderProps) {
  return (
    <header className="border-b border-muted bg-card/80 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="max-w-[280px] justify-start gap-2 overflow-hidden border-muted text-left"
            >
              <span className="truncate font-semibold">{currentProject.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="font-medium">{project.name}</span>
                <span className="max-w-[300px] truncate text-xs text-muted-foreground">
                  {project.path}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          {isConnected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span>Offline</span>
            </>
          )}
        </div>

        {currentTool ? (
          <div className="hidden max-w-[220px] items-center gap-1 rounded-md border border-muted bg-muted/40 px-2 py-1 text-xs text-muted-foreground lg:flex">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="truncate">{currentTool}</span>
          </div>
        ) : null}

        <div className="hidden sm:flex">
          <RunningSessionsBadge />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              leftOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={onToggleLeft}
            title="Verlauf ein- oder ausblenden"
            aria-label="Verlauf ein- oder ausblenden"
          >
            <Clock3 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              rightOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={onToggleRight}
            title="Datei-Bereich ein- oder ausblenden"
            aria-label="Datei-Bereich ein- oder ausblenden"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onCopyAll}
            title="Alles kopieren"
            aria-label="Alles kopieren"
            disabled={copyDisabled}
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onSaveChat}
            title="Chat speichern"
            aria-label="Chat speichern"
            disabled={saveDisabled}
          >
            <Save className="h-4 w-4" />
          </Button>

          <SoundToggle />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenShortcutHelp}
            title="Tastenkuerzel (Ctrl+/)"
            aria-label="Tastenkuerzel anzeigen"
          >
            <Keyboard className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onOpenSettings}
            title="Einstellungen öffnen"
            aria-label="Einstellungen öffnen"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <SessionTabBar
          sessions={sessions}
          activeSessionId={currentSessionId}
          isCreatingSession={isCreatingSession}
          onCreateSession={onNewChat}
          onSelectSession={onSelectSession}
          onCloseSession={onCloseSession}
          onCloseOtherSessions={onCloseOtherSessions}
          onRenameSession={onRenameSession}
        />
      </div>
    </header>
  );
}
