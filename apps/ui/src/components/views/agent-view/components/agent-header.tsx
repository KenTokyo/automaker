import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  PanelRight,
  PanelRightClose,
  Wrench,
  Trash2,
  ChevronDown,
  Folder,
  FolderOpen,
  Search,
  Check,
  Settings2,
  Copy,
  Plus,
  Pencil,
  FilePlus,
  FileInput,
  EyeOff,
  Eye,
  GitCommit,
  Upload,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { useAppStore } from '@/store/app-store';
import type { Project } from '@/lib/electron';
import { getElectronAPI, isElectron } from '@/lib/electron';
import { initializeProject, hasAutomakerDir, hasAppSpec } from '@/lib/project-init';
import { EditProjectDialog } from '@/components/layout/project-switcher/components/edit-project-dialog';
import { ManageProjectsDialog } from './manage-projects-dialog';
import { WorktreeActionsDropdown } from '@/components/views/board-view/worktree-panel/components/worktree-actions-dropdown';
import type {
  WorktreeInfo,
  GitRepoStatus,
  DevServerInfo,
  TestSessionInfo,
  PRInfo,
} from '@/components/views/board-view/worktree-panel/types';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import { ChatSettingsPopover } from './chat-settings-popover';

interface WorktreeActionsProps {
  mainWorktree: WorktreeInfo;
  aheadCount: number;
  behindCount: number;
  hasRemoteBranch: boolean;
  gitRepoStatus: GitRepoStatus;
  isStartingDevServer: boolean;
  isDevServerRunning: boolean;
  devServerInfo?: DevServerInfo;
  isPulling: boolean;
  isPushing: boolean;
  isAutoModeRunning: boolean;
  hasTestCommand: boolean;
  isStartingTests: boolean;
  isTestRunning: boolean;
  testSessionInfo?: TestSessionInfo;
  hasInitScript: boolean;
  onOpenChange: (open: boolean) => void;
  onPull: (worktree: WorktreeInfo) => void;
  onPush: (worktree: WorktreeInfo) => void;
  onPushNewBranch: (worktree: WorktreeInfo) => void;
  onOpenInEditor: (worktree: WorktreeInfo, editorCommand?: string) => void;
  onOpenInIntegratedTerminal: (worktree: WorktreeInfo, mode?: 'tab' | 'split') => void;
  onOpenInExternalTerminal: (worktree: WorktreeInfo, terminalId?: string) => void;
  onViewChanges: (worktree: WorktreeInfo) => void;
  onDiscardChanges: (worktree: WorktreeInfo) => void;
  onCommit: (worktree: WorktreeInfo) => void;
  onCreatePR: (worktree: WorktreeInfo) => void;
  onAddressPRComments: (worktree: WorktreeInfo, prInfo: PRInfo) => void;
  onResolveConflicts: (worktree: WorktreeInfo) => void;
  onDeleteWorktree: (worktree: WorktreeInfo) => void;
  onStartDevServer: (worktree: WorktreeInfo) => void;
  onStopDevServer: (worktree: WorktreeInfo) => void;
  onOpenDevServerUrl: (worktree: WorktreeInfo) => void;
  onViewDevServerLogs: (worktree: WorktreeInfo) => void;
  onRunInitScript: (worktree: WorktreeInfo) => void;
  onToggleAutoMode: (worktree: WorktreeInfo) => void;
  onMerge: (worktree: WorktreeInfo) => void;
  onStartTests: (worktree: WorktreeInfo) => void;
  onStopTests: (worktree: WorktreeInfo) => void;
  onViewTestLogs: (worktree: WorktreeInfo) => void;
}

interface AgentHeaderProps {
  currentProject: Project;
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  currentSessionId: string | null;
  isConnected: boolean;
  isProcessing: boolean;
  currentTool: string | null;
  messagesCount: number;
  showSessionManager: boolean;
  onToggleSessionManager: () => void;
  onClearChat: () => void;
  onCopyAll: () => void;
  copySuccess: boolean;
  canCopyAll: boolean;
  canSaveToDocs: boolean;
  hasCurrentDocPath: boolean;
  isSavingToDoc: boolean;
  chatDisplaySettings: ChatDisplaySettings;
  onChatDisplaySettingsChange: (settings: ChatDisplaySettings) => void;
  onSaveAsNewDoc: () => void;
  onAppendChatToCurrent: () => void;
  worktreeActions?: WorktreeActionsProps;
}

function getProjectIcon(project: Project): LucideIcon {
  if (project.icon && project.icon in LucideIcons) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[project.icon];
  }
  return Folder;
}

export function AgentHeader({
  currentProject,
  projects,
  onProjectSelect,
  currentSessionId,
  isConnected,
  isProcessing,
  currentTool,
  messagesCount,
  showSessionManager,
  onToggleSessionManager,
  onClearChat,
  onCopyAll,
  copySuccess,
  canCopyAll,
  canSaveToDocs,
  hasCurrentDocPath,
  isSavingToDoc,
  chatDisplaySettings,
  onChatDisplaySettingsChange,
  onSaveAsNewDoc,
  onAppendChatToCurrent,
  worktreeActions,
}: AgentHeaderProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editDialogTab, setEditDialogTab] = useState<'general' | 'appearance' | 'settings'>(
    'general'
  );
  const [pathCopied, setPathCopied] = useState(false);
  const [isSaveDocMenuOpen, setIsSaveDocMenuOpen] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const projectBgColor = currentProject.backgroundColor;
  const projectBorderColor = currentProject.badgeColor;
  const projectTextColor = currentProject.textColor;
  const projectIconColor = currentProject.iconColor;

  const toggleProjectHidden = useAppStore((s) => s.toggleProjectHidden);
  const setProjectName = useAppStore((s) => s.setProjectName);
  const upsertAndSetCurrentProject = useAppStore((s) => s.upsertAndSetCurrentProject);
  const moveProjectToTrash = useAppStore((s) => s.moveProjectToTrash);

  // Open folder handler (works in Electron)
  const handleOpenFolder = useCallback(async () => {
    if (!isElectron()) {
      toast.info('Open folder is only available in the desktop app');
      return;
    }
    try {
      const api = getElectronAPI();
      const result = await api.openDirectory();
      if (!result.canceled && result.filePaths[0]) {
        const path = result.filePaths[0];
        const name = path.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project';
        await initializeProject(path);
        upsertAndSetCurrentProject(path, name);
        setIsOpen(false);
        toast.success('Project opened', { description: `Opened ${name}` });
        navigate({ to: '/board' });
      }
    } catch (error) {
      toast.error('Failed to open project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [upsertAndSetCurrentProject, navigate]);

  // Rename project handler
  const handleStartRename = useCallback((project: Project) => {
    setIsRenamingProject(project.id);
    setRenameValue(project.name);
    requestAnimationFrame(() => renameInputRef.current?.select());
  }, []);

  const handleConfirmRename = useCallback(() => {
    if (isRenamingProject && renameValue.trim()) {
      setProjectName(isRenamingProject, renameValue.trim());
    }
    setIsRenamingProject(null);
    setRenameValue('');
  }, [isRenamingProject, renameValue, setProjectName]);

  // Filtered and sorted projects: alphabetical, hidden projects at the end
  // When searching, show all projects (including hidden); otherwise hide hidden ones
  const filteredProjects = useMemo(() => {
    const isSearching = searchQuery.trim().length > 0;
    const query = searchQuery.toLowerCase();

    let result = isSearching
      ? projects.filter((p) => p.name.toLowerCase().includes(query))
      : projects.filter((p) => !p.isHidden);

    // Sort alphabetically, with hidden projects at the end when searching
    result = [...result].sort((a, b) => {
      if (isSearching) {
        if (a.isHidden && !b.isHidden) return 1;
        if (!a.isHidden && b.isHidden) return -1;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return result;
  }, [projects, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const currentIndex = filteredProjects.findIndex((p) => p.id === currentProject.id);
      setSelectedIndex(currentIndex !== -1 ? currentIndex : 0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen, filteredProjects, currentProject.id]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredProjects.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredProjects[selectedIndex]) {
          onProjectSelect(filteredProjects[selectedIndex]);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredProjects, onProjectSelect]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  const hiddenProjectCount = useMemo(() => projects.filter((p) => p.isHidden).length, [projects]);

  const browserPanelOpen = useAppStore((s) => s.browserPanelOpen);
  const toggleBrowserPanel = useAppStore((s) => s.toggleBrowserPanel);

  const IconComponent = getProjectIcon(currentProject);
  const hasCustomIcon = !!currentProject.customIconPath;
  const hasCustomStyling = projectBgColor || projectBorderColor;
  const hasGitRepo = worktreeActions?.gitRepoStatus.isGitRepo ?? false;
  const hasGitCommits = worktreeActions?.gitRepoStatus.hasCommits ?? false;
  const canQuickPush = Boolean(
    worktreeActions &&
    hasGitRepo &&
    hasGitCommits &&
    !worktreeActions.isPushing &&
    (!worktreeActions.hasRemoteBranch || worktreeActions.aheadCount > 0)
  );

  const handleOpenGitPanel = useCallback(() => {
    if (!worktreeActions) return;
    worktreeActions.onCommit(worktreeActions.mainWorktree);
  }, [worktreeActions]);

  const handleQuickPush = useCallback(() => {
    if (!worktreeActions || !hasGitRepo || !hasGitCommits) return;
    if (worktreeActions.hasRemoteBranch) {
      worktreeActions.onPush(worktreeActions.mainWorktree);
      return;
    }
    worktreeActions.onPushNewBranch(worktreeActions.mainWorktree);
  }, [hasGitCommits, hasGitRepo, worktreeActions]);

  return (
    <>
      <div
        className={cn(
          'relative z-50 flex flex-wrap items-center justify-between gap-y-1 px-4 py-2.5 border-b backdrop-blur-sm',
          !hasCustomStyling && 'border-border bg-card/50'
        )}
        style={{
          backgroundColor: projectBgColor || undefined,
          borderColor: projectBorderColor || undefined,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              setEditDialogTab('general');
              setShowEditDialog(true);
            }}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              'transition-all duration-200 border border-transparent hover:border-border hover:bg-accent/40',
              !projectBgColor &&
                'bg-orange-400/10 shadow-[0_0_10px_-2px_theme(colors.orange.400/0.25)]'
            )}
            style={{ backgroundColor: projectBorderColor ? `${projectBorderColor}20` : undefined }}
            title="Projekt-Icon bearbeiten/hochladen"
          >
            {hasCustomIcon ? (
              <img
                src={getAuthenticatedImageUrl(currentProject.customIconPath!, currentProject.path)}
                alt={currentProject.name}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <IconComponent
                className="w-4 h-4"
                style={{ color: projectIconColor || projectBorderColor || 'hsl(var(--primary))' }}
              />
            )}
          </button>

          <div className="relative min-w-0" ref={dropdownRef}>
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  'flex items-center gap-1.5 text-sm text-muted-foreground',
                  'hover:text-foreground transition-colors duration-150',
                  'rounded-md px-1 py-0.5',
                  'hover:bg-accent/50',
                  isOpen && 'text-foreground bg-accent/50'
                )}
              >
                <span
                  className="max-w-[260px] truncate text-base font-semibold text-foreground drop-shadow-[0_0_8px_theme(colors.orange.400/0.35)]"
                  style={{ color: projectTextColor || undefined }}
                >
                  {currentProject.name}
                </span>
                {currentSessionId && !isConnected && (
                  <span className="text-muted-foreground"> - Connecting...</span>
                )}
                <ChevronDown
                  className={cn(
                    'w-3 h-3 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              <div className="flex items-center gap-1 min-w-0">
                <p
                  className="text-[11px] text-foreground/70 truncate max-w-[380px]"
                  title={currentProject.path}
                >
                  {currentProject.path}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(currentProject.path);
                    setPathCopied(true);
                    setTimeout(() => setPathCopied(false), 1500);
                  }}
                  className="p-0.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy path"
                >
                  {pathCopied ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {isOpen && (
              <div
                className={cn(
                  'absolute top-full left-0 mt-1 z-50',
                  'w-72 rounded-xl',
                  'bg-popover/95 backdrop-blur-xl',
                  'border border-border shadow-xl',
                  'p-1.5',
                  'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150'
                )}
              >
                <div className="px-1 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        'w-full h-8 pl-8 pr-3 text-sm rounded-lg',
                        'border border-border bg-background/50',
                        'text-foreground placeholder:text-muted-foreground',
                        'focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500/50',
                        'transition-all duration-200'
                      )}
                    />
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No projects found
                  </div>
                ) : (
                  <div
                    ref={listRef}
                    className="max-h-64 overflow-y-auto space-y-0.5 scrollbar-styled"
                  >
                    {filteredProjects.map((project, index) => {
                      const ProjIcon = getProjectIcon(project);
                      const isActive = project.id === currentProject.id;
                      const isHighlighted = index === selectedIndex;
                      const projHasCustomIcon = !!project.customIconPath;
                      const isRenaming = isRenamingProject === project.id;

                      return (
                        <div
                          key={project.id}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs group',
                            'transition-colors duration-100 cursor-pointer',
                            isHighlighted
                              ? 'bg-accent text-foreground'
                              : 'text-foreground/80 hover:bg-accent/50',
                            isActive && 'font-medium',
                            project.isHidden && 'opacity-50 hover:opacity-100'
                          )}
                          style={{
                            borderLeft: project.badgeColor
                              ? `2px solid ${project.badgeColor}`
                              : undefined,
                            backgroundColor:
                              !isHighlighted && project.backgroundColor
                                ? `${project.backgroundColor}15`
                                : undefined,
                          }}
                          onClick={() => {
                            if (!isRenaming) {
                              onProjectSelect(project);
                              setIsOpen(false);
                            }
                          }}
                        >
                          {projHasCustomIcon ? (
                            <img
                              src={getAuthenticatedImageUrl(project.customIconPath!, project.path)}
                              alt=""
                              className="w-3.5 h-3.5 rounded object-cover shrink-0"
                            />
                          ) : (
                            <ProjIcon
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color:
                                  project.iconColor ||
                                  project.badgeColor ||
                                  (isActive ? 'hsl(var(--brand-500))' : undefined),
                              }}
                            />
                          )}

                          {/* Inline rename input */}
                          {isRenaming ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleConfirmRename();
                                if (e.key === 'Escape') {
                                  setIsRenamingProject(null);
                                  setRenameValue('');
                                }
                              }}
                              onBlur={handleConfirmRename}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500/30 min-w-0"
                              autoFocus
                            />
                          ) : (
                            <span className="truncate flex-1 text-left">{project.name}</span>
                          )}

                          {/* Action buttons on hover */}
                          {!isRenaming && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              {/* Rename */}
                              <span
                                role="button"
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(project);
                                }}
                                className="p-0.5 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
                                title="Rename project"
                              >
                                <Pencil className="w-3 h-3" />
                              </span>
                              {/* Hide/Show */}
                              <span
                                role="button"
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProjectHidden(project.id);
                                }}
                                className="p-0.5 rounded hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
                                title={project.isHidden ? 'Show project' : 'Hide project'}
                              >
                                {project.isHidden ? (
                                  <Eye className="w-3 h-3" />
                                ) : (
                                  <EyeOff className="w-3 h-3" />
                                )}
                              </span>
                              {/* Remove to trash */}
                              <span
                                role="button"
                                tabIndex={-1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveProjectToTrash(project.id);
                                  toast.success('Project moved to trash');
                                }}
                                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Move to trash"
                              >
                                <Trash2 className="w-3 h-3" />
                              </span>
                            </div>
                          )}

                          {/* Hidden indicator */}
                          {project.isHidden && !isRenaming && (
                            <EyeOff className="w-2.5 h-2.5 text-muted-foreground/50 shrink-0 group-hover:hidden" />
                          )}

                          {isActive && !isRenaming && (
                            <Check className="w-3 h-3 text-brand-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden projects hint */}
                {hiddenProjectCount > 0 && searchQuery.trim().length === 0 && (
                  <div className="mx-1.5 mt-1 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setShowManageDialog(true);
                      }}
                      className="w-full flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <EyeOff className="w-3 h-3 shrink-0" />
                      <span>
                        {hiddenProjectCount} {hiddenProjectCount === 1 ? 'Projekt' : 'Projekte'}{' '}
                        ausgeblendet
                      </span>
                      <span className="ml-auto text-[10px] underline">Verwalten</span>
                    </button>
                  </div>
                )}

                {/* Action buttons: New Project, Open Folder, Manage */}
                <div className="mt-1.5 border-t border-border/50 pt-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate({ to: '/overview' });
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Neues Projekt</span>
                  </button>
                  {isElectron() && (
                    <button
                      onClick={handleOpenFolder}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Ordner öffnen</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowManageDialog(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Projekte verwalten</span>
                    {hiddenProjectCount > 0 && (
                      <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                        {hiddenProjectCount} versteckt
                      </span>
                    )}
                  </button>
                </div>

                {/* Keyboard hints */}
                <div className="px-2 pt-1.5 mt-1 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground text-center tracking-wide">
                    <span className="text-foreground/60">↑↓</span> navigieren{' '}
                    <span className="mx-1 text-foreground/30">|</span>{' '}
                    <span className="text-foreground/60">↵</span> auswählen{' '}
                    <span className="mx-1 text-foreground/30">|</span>{' '}
                    <span className="text-foreground/60">esc</span> schließen
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {worktreeActions && (
            <WorktreeActionsDropdown
              worktree={worktreeActions.mainWorktree}
              isSelected={true}
              standalone={true}
              aheadCount={worktreeActions.aheadCount}
              behindCount={worktreeActions.behindCount}
              hasRemoteBranch={worktreeActions.hasRemoteBranch}
              isPulling={worktreeActions.isPulling}
              isPushing={worktreeActions.isPushing}
              isStartingDevServer={worktreeActions.isStartingDevServer}
              isDevServerRunning={worktreeActions.isDevServerRunning}
              devServerInfo={worktreeActions.devServerInfo}
              gitRepoStatus={worktreeActions.gitRepoStatus}
              isAutoModeRunning={worktreeActions.isAutoModeRunning}
              hasTestCommand={worktreeActions.hasTestCommand}
              isStartingTests={worktreeActions.isStartingTests}
              isTestRunning={worktreeActions.isTestRunning}
              testSessionInfo={worktreeActions.testSessionInfo}
              onOpenChange={worktreeActions.onOpenChange}
              onPull={worktreeActions.onPull}
              onPush={worktreeActions.onPush}
              onPushNewBranch={worktreeActions.onPushNewBranch}
              onOpenInEditor={worktreeActions.onOpenInEditor}
              onOpenInIntegratedTerminal={worktreeActions.onOpenInIntegratedTerminal}
              onOpenInExternalTerminal={worktreeActions.onOpenInExternalTerminal}
              onViewChanges={worktreeActions.onViewChanges}
              onDiscardChanges={worktreeActions.onDiscardChanges}
              onCommit={worktreeActions.onCommit}
              onCreatePR={worktreeActions.onCreatePR}
              onAddressPRComments={worktreeActions.onAddressPRComments}
              onResolveConflicts={worktreeActions.onResolveConflicts}
              onDeleteWorktree={worktreeActions.onDeleteWorktree}
              onStartDevServer={worktreeActions.onStartDevServer}
              onStopDevServer={worktreeActions.onStopDevServer}
              onOpenDevServerUrl={worktreeActions.onOpenDevServerUrl}
              onViewDevServerLogs={worktreeActions.onViewDevServerLogs}
              onRunInitScript={worktreeActions.onRunInitScript}
              onToggleAutoMode={worktreeActions.onToggleAutoMode}
              onMerge={worktreeActions.onMerge}
              onStartTests={worktreeActions.onStartTests}
              onStopTests={worktreeActions.onStopTests}
              onViewTestLogs={worktreeActions.onViewTestLogs}
              hasInitScript={worktreeActions.hasInitScript}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Project settings"
            title="Project settings"
            onClick={() => {
              setEditDialogTab('settings');
              setShowEditDialog(true);
            }}
          >
            <Settings2 className="w-4 h-4" />
          </Button>

          <div className="hidden sm:flex">
            <ChatSettingsPopover
              settings={chatDisplaySettings}
              onChange={onChatDisplaySettingsChange}
            />
          </div>

          {currentTool && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
              <Wrench className="w-3 h-3 text-primary" />
              <span className="font-medium">{currentTool}</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyAll}
            disabled={!canCopyAll}
            className={cn(
              'h-8 w-8 p-0 text-muted-foreground hover:text-foreground',
              copySuccess && 'text-green-600'
            )}
            title="Copy entire chat history"
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>

          {canSaveToDocs && (
            <DropdownMenu open={isSaveDocMenuOpen} onOpenChange={setIsSaveDocMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSavingToDoc}
                  className={cn(
                    'h-8 gap-1.5 px-2.5 text-emerald-400 hover:text-emerald-300',
                    'hover:bg-emerald-500/15 border border-emerald-500/30 hover:border-emerald-500/50',
                    'transition-all duration-200',
                    isSavingToDoc && 'animate-pulse'
                  )}
                  title="Klick: Verlauf in History/ speichern + Pfad ins Input. Alt+Klick: Optionen."
                  onPointerDown={(event) => {
                    const isAltLeftClick = event.altKey && event.button === 0;
                    if (!isAltLeftClick) {
                      event.preventDefault();
                      setIsSaveDocMenuOpen(false);
                    }
                  }}
                  onClick={(event) => {
                    if (event.altKey) return;
                    event.preventDefault();
                    onSaveAsNewDoc();
                  }}
                >
                  <FilePlus className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Save</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={onSaveAsNewDoc} disabled={isSavingToDoc}>
                  <FilePlus className="w-3.5 h-3.5 mr-2" />
                  Neues Verlauf-Dokument
                </DropdownMenuItem>
                {hasCurrentDocPath && (
                  <DropdownMenuItem onClick={onAppendChatToCurrent} disabled={isSavingToDoc}>
                    <FileInput className="w-3.5 h-3.5 mr-2" />
                    An aktuelles Dokument anhaengen
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {worktreeActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenGitPanel}
              disabled={!hasGitRepo}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
              title="Git Panel oeffnen (Commit + Changes)"
              aria-label="Git Panel oeffnen"
            >
              <GitCommit className="h-4 w-4" />
              <span className="hidden sm:inline">Commit</span>
            </Button>
          )}

          {worktreeActions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleQuickPush}
              disabled={!canQuickPush}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
              title="Aenderungen direkt pushen"
              aria-label="Aenderungen pushen"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Push</span>
            </Button>
          )}

          {currentSessionId && messagesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              disabled={isProcessing}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/15"
              title="Clear conversation"
              aria-label="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSessionManager}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label={showSessionManager ? 'Hide sessions panel' : 'Show sessions panel'}
          >
            {showSessionManager ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBrowserPanel}
            className={cn(
              'h-8 w-8 p-0 hidden lg:inline-flex',
              browserPanelOpen
                ? 'text-primary hover:text-primary/80'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={browserPanelOpen ? 'Hide right panel' : 'Show right panel'}
            title={browserPanelOpen ? 'Hide Right Panel' : 'Show Right Panel'}
          >
            {browserPanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <EditProjectDialog
        project={currentProject}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        defaultTab={editDialogTab}
      />

      <ManageProjectsDialog open={showManageDialog} onOpenChange={setShowManageDialog} />
    </>
  );
}
