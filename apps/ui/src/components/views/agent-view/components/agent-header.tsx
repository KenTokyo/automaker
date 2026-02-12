import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot,
  PanelLeftClose,
  PanelLeft,
  Wrench,
  Trash2,
  ChevronDown,
  Folder,
  Search,
  Check,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import type { Project } from '@/lib/electron';

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
}: AgentHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  // Reset state when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const currentIndex = filteredProjects.findIndex((p) => p.id === currentProject.id);
      setSelectedIndex(currentIndex !== -1 ? currentIndex : 0);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen]);

  // Update selected index when search changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [searchQuery]);

  // Close dropdown on outside click
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

  // Keyboard navigation
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

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  const IconComponent = getProjectIcon(currentProject);
  const hasCustomIcon = !!currentProject.customIconPath;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">AI Agent</h1>
          {/* Project selector dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'flex items-center gap-1.5 text-sm text-muted-foreground',
                'hover:text-foreground transition-colors duration-150',
                'rounded-md -ml-1 px-1 py-0.5',
                'hover:bg-accent/50',
                isOpen && 'text-foreground bg-accent/50'
              )}
            >
              {hasCustomIcon ? (
                <img
                  src={getAuthenticatedImageUrl(
                    currentProject.customIconPath!,
                    currentProject.path
                  )}
                  alt=""
                  className="w-3.5 h-3.5 rounded object-cover"
                />
              ) : (
                <IconComponent className="w-3.5 h-3.5 text-brand-500" />
              )}
              <span className="max-w-[200px] truncate">{currentProject.name}</span>
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
                {/* Search input */}
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

                {/* Project list */}
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

                      return (
                        <button
                          key={project.id}
                          onClick={() => {
                            onProjectSelect(project);
                            setIsOpen(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm',
                            'transition-colors duration-100',
                            isHighlighted
                              ? 'bg-accent text-foreground'
                              : 'text-foreground/80 hover:bg-accent/50',
                            isActive && 'font-medium'
                          )}
                        >
                          {projHasCustomIcon ? (
                            <img
                              src={getAuthenticatedImageUrl(project.customIconPath!, project.path)}
                              alt=""
                              className="w-4 h-4 rounded object-cover shrink-0"
                            />
                          ) : (
                            <ProjIcon
                              className={cn(
                                'w-4 h-4 shrink-0',
                                isActive ? 'text-brand-500' : 'text-muted-foreground'
                              )}
                            />
                          )}
                          <span className="truncate flex-1 text-left">{project.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Keyboard hint */}
                <div className="px-2 pt-2 mt-1.5 border-t border-border/50">
                  <p className="text-[10px] text-muted-foreground text-center tracking-wide">
                    <span className="text-foreground/60">↑↓</span> navigate{' '}
                    <span className="mx-1 text-foreground/30">|</span>{' '}
                    <span className="text-foreground/60">↵</span> select{' '}
                    <span className="mx-1 text-foreground/30">|</span>{' '}
                    <span className="text-foreground/60">esc</span> close
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status indicators & actions */}
      <div className="flex items-center gap-3">
        {currentTool && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
            <Wrench className="w-3 h-3 text-primary" />
            <span className="font-medium">{currentTool}</span>
          </div>
        )}
        {currentSessionId && messagesCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearChat}
            disabled={isProcessing}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
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
      </div>
    </div>
  );
}
