import {
  AlertTriangle,
  Database,
  Eye,
  EyeOff,
  Folder,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Project, TrashedProject } from '@/lib/electron';

export type TeamRightsTab = 'all' | 'hidden' | 'trash';

export interface TeamRightsProjectRow {
  project: Project | TrashedProject;
  isTrashTab: boolean;
  isCurrentProject: boolean;
  isHidden: boolean;
  teamDbActive: boolean;
  supabaseProjectId: string | null;
  ownerLabel: string;
  membersCount: number;
  projectColor: string;
}

interface TeamRightsProjectConfigCardProps {
  projectsCount: number;
  hiddenCount: number;
  trashCount: number;
  activeTab: TeamRightsTab;
  setActiveTab: Dispatch<SetStateAction<TeamRightsTab>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  rows: TeamRightsProjectRow[];
  assignmentsLoading: boolean;
  assignmentsError: string | null;
  togglingTeamDb: string | null;
  canManageSupabase: boolean;
  onAddProject: () => void;
  onToggleTeamDb: (project: Project) => Promise<void>;
  onOpenMembers: (supabaseProjectId: string, projectName: string) => void;
  onEditProject: (project: Project) => void;
  onToggleHidden: (projectId: string, isHidden: boolean) => void;
  onMoveToTrash: (projectId: string) => void;
  onRestore: (projectId: string) => void;
  onDeleteTrashed: (projectId: string) => void;
  onEmptyTrash: () => void;
}

export function TeamRightsProjectConfigCard({
  projectsCount,
  hiddenCount,
  trashCount,
  activeTab,
  setActiveTab,
  query,
  setQuery,
  rows,
  assignmentsLoading,
  assignmentsError,
  togglingTeamDb,
  canManageSupabase,
  onAddProject,
  onToggleTeamDb,
  onOpenMembers,
  onEditProject,
  onToggleHidden,
  onMoveToTrash,
  onRestore,
  onDeleteTrashed,
  onEmptyTrash,
}: TeamRightsProjectConfigCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Projekt-Zuständigkeit</CardTitle>
        <CardDescription>
          Owner ist der Admin im Projekt. Owner kann Rollen ändern und den Owner wechseln.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Alle ({projectsCount})
          </button>
          <button
            type="button"
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
            type="button"
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

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddProject}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Projekt hinzufügen
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Projekt, Pfad oder zuständige Person suchen..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={cn(
              'w-full h-9 pl-9 pr-3 text-sm rounded-lg',
              'border border-border bg-background',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-brand-500/40'
            )}
          />
        </div>

        {assignmentsError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {assignmentsError}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Kein Projekt gefunden.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const { project } = row;
              const isToggling = togglingTeamDb === project.id;

              return (
                <div
                  key={project.id}
                  className={cn(
                    'rounded-lg border px-3 py-3 transition-colors',
                    row.isCurrentProject
                      ? 'border-brand-500/40 bg-brand-500/5'
                      : 'border-border bg-muted/20',
                    row.isHidden && 'opacity-70'
                  )}
                  style={{ borderLeftColor: row.projectColor, borderLeftWidth: 3 }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium truncate">{project.name}</p>
                        {row.isCurrentProject && <Badge variant="brand">Aktiv</Badge>}
                        {row.isHidden && <Badge variant="muted">Versteckt</Badge>}
                        {row.isTrashTab && <Badge variant="muted">Papierkorb</Badge>}
                        {!row.isTrashTab &&
                          (row.teamDbActive ? (
                            <Badge variant="info">Team-DB aktiv</Badge>
                          ) : (
                            <Badge variant="muted">Lokal</Badge>
                          ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-1">
                        {project.path}
                      </p>

                      {!row.isTrashTab && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className="gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Zuständig: {row.teamDbActive ? row.ownerLabel : 'Noch lokal'}
                          </Badge>
                          {row.teamDbActive && (
                            <Badge variant="outline" className="gap-1">
                              <Users className="w-3 h-3" />
                              Mitglieder: {assignmentsLoading ? '...' : row.membersCount}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      {!row.isTrashTab ? (
                        <>
                          <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            ) : (
                              <Database
                                className={cn(
                                  'w-3.5 h-3.5',
                                  row.teamDbActive ? 'text-brand-500' : 'text-muted-foreground'
                                )}
                              />
                            )}
                            <Switch
                              checked={row.teamDbActive}
                              disabled={isToggling || !canManageSupabase}
                              onCheckedChange={() => void onToggleTeamDb(project as Project)}
                              className="h-4 w-8 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-4"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={
                              !row.teamDbActive || !row.supabaseProjectId || !canManageSupabase
                            }
                            onClick={() => {
                              if (!row.supabaseProjectId) return;
                              onOpenMembers(row.supabaseProjectId, project.name);
                            }}
                          >
                            Team öffnen
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onEditProject(project as Project)}
                            title="Projekt bearbeiten"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              'h-8 w-8 p-0',
                              row.isHidden
                                ? 'text-brand-500 hover:text-brand-400'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => onToggleHidden(project.id, row.isHidden)}
                            title={row.isHidden ? 'Wieder anzeigen' : 'Ausblenden'}
                          >
                            {row.isHidden ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onMoveToTrash(project.id)}
                            title="In Papierkorb"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onRestore(project.id)}
                            title="Wiederherstellen"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteTrashed(project.id)}
                            title="Endgültig löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'trash' && trashCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {trashCount} {trashCount === 1 ? 'Projekt' : 'Projekte'} im Papierkorb
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onEmptyTrash}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Alle endgültig löschen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
