import { useState, useMemo } from 'react';
import { Eye, EyeOff, Folder, Search, Trash2, Undo2, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { useAppStore } from '@/store/app-store';
import type { Project, TrashedProject } from '@/lib/electron';

function getProjectIcon(project: Project | TrashedProject): LucideIcon {
  if (project.icon && project.icon in LucideIcons) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[project.icon];
  }
  return Folder;
}

interface ManageProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageProjectsDialog({ open, onOpenChange }: ManageProjectsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'hidden' | 'trash'>('all');

  const projects = useAppStore((s) => s.projects);
  const trashedProjects = useAppStore((s) => s.trashedProjects);
  const toggleProjectHidden = useAppStore((s) => s.toggleProjectHidden);
  const moveProjectToTrash = useAppStore((s) => s.moveProjectToTrash);
  const restoreTrashedProject = useAppStore((s) => s.restoreTrashedProject);
  const deleteTrashedProject = useAppStore((s) => s.deleteTrashedProject);
  const emptyTrash = useAppStore((s) => s.emptyTrash);

  const query = searchQuery.toLowerCase().trim();

  const hiddenProjects = useMemo(() => projects.filter((p) => p.isHidden), [projects]);

  const filteredProjects = useMemo(() => {
    let list: (Project | TrashedProject)[] = [];

    if (activeTab === 'all') {
      list = projects;
    } else if (activeTab === 'hidden') {
      list = hiddenProjects;
    } else {
      list = trashedProjects;
    }

    if (query) {
      list = list.filter((p) => p.name.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
  }, [activeTab, projects, hiddenProjects, trashedProjects, query]);

  const hiddenCount = hiddenProjects.length;
  const trashCount = trashedProjects.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Projekte verwalten</DialogTitle>
          <DialogDescription>
            Hier kannst du alle Projekte sehen, ausblenden oder wiederherstellen.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Alle ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('hidden')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'hidden'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center justify-center gap-1">
              <EyeOff className="w-3 h-3" />
              Versteckt ({hiddenCount})
            </span>
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'trash'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex items-center justify-center gap-1">
              <Trash2 className="w-3 h-3" />
              Papierkorb ({trashCount})
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Projekt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-9 pl-9 pr-3 text-sm rounded-lg',
              'border border-border bg-background/50',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500/50',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[400px] space-y-0.5 scrollbar-styled">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              {activeTab === 'hidden' && hiddenCount === 0 ? (
                <>
                  <Eye className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Keine versteckten Projekte</p>
                  <p className="text-xs mt-1">
                    Du kannst Projekte im Dropdown per Klick auf das Auge-Symbol ausblenden.
                  </p>
                </>
              ) : activeTab === 'trash' && trashCount === 0 ? (
                <>
                  <Trash2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Papierkorb ist leer</p>
                </>
              ) : (
                <>
                  <Search className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Kein Projekt gefunden</p>
                </>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => {
              const ProjIcon = getProjectIcon(project);
              const hasCustomIcon = !!project.customIconPath;
              const isTrashed = activeTab === 'trash';
              const isHidden = !isTrashed && !!(project as Project).isHidden;

              return (
                <div
                  key={project.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg group',
                    'transition-colors duration-100',
                    'hover:bg-accent/50',
                    isHidden && 'opacity-60'
                  )}
                  style={{
                    borderLeft: project.badgeColor
                      ? `3px solid ${project.badgeColor}`
                      : '3px solid transparent',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: project.backgroundColor || 'hsl(var(--accent))',
                    }}
                  >
                    {hasCustomIcon ? (
                      <img
                        src={getAuthenticatedImageUrl(project.customIconPath!, project.path)}
                        alt=""
                        className="w-5 h-5 rounded object-cover"
                      />
                    ) : (
                      <ProjIcon
                        className="w-4 h-4"
                        style={{
                          color: project.iconColor || project.badgeColor || 'hsl(var(--primary))',
                        }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{project.path}</p>
                  </div>

                  {/* Status badge */}
                  {isHidden && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      versteckt
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isTrashed ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            restoreTrashedProject(project.id);
                            toast.success('Projekt wiederhergestellt');
                          }}
                          title="Wiederherstellen"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteTrashedProject(project.id);
                            toast.success('Projekt endgültig gelöscht');
                          }}
                          title="Endgültig löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-7 w-7 p-0',
                            isHidden
                              ? 'text-brand-500 hover:text-brand-400'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                          onClick={() => {
                            toggleProjectHidden(project.id);
                            toast.success(
                              isHidden ? 'Projekt wird wieder angezeigt' : 'Projekt ausgeblendet'
                            );
                          }}
                          title={isHidden ? 'Wieder anzeigen' : 'Ausblenden'}
                        >
                          {isHidden ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            moveProjectToTrash(project.id);
                            toast.success('In den Papierkorb verschoben');
                          }}
                          title="In Papierkorb"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Trash footer action */}
        {activeTab === 'trash' && trashCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {trashCount} {trashCount === 1 ? 'Projekt' : 'Projekte'} im Papierkorb
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                emptyTrash();
                toast.success('Papierkorb geleert');
              }}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Alle endgültig löschen
            </Button>
          </div>
        )}

        {/* Help text */}
        {activeTab === 'all' && (
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground text-center">
              💡 Versteckte Projekte tauchen nicht mehr im Projekt-Wechsler auf, bleiben aber hier
              erhalten.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
