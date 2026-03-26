import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';
import { useSupabaseProjects } from '@/hooks/use-supabase-projects';
import { getElectronAPI, type Project, type TrashedProject } from '@/lib/electron';
import { initializeProject } from '@/lib/project-init';
import { ProjectMembersDialog } from '@/components/views/agent-view/components/project-members-dialog';
import { EditProjectDialog } from '@/components/layout/project-switcher/components/edit-project-dialog';
import {
  TeamRightsProjectConfigCard,
  type TeamRightsProjectRow,
} from '@/components/views/team-rights-view/project-config-card';

interface OwnerInfo {
  userId: string;
  email?: string;
  displayName?: string | null;
}

const SHORT_ID_CHARS = 8;

function getOwnerLabel(owner: OwnerInfo | null): string {
  if (!owner) return 'Noch offen';
  if (owner.displayName && owner.displayName.trim()) return owner.displayName.trim();
  if (owner.email) return owner.email;
  return `User ${owner.userId.slice(0, SHORT_ID_CHARS)}`;
}

export function TeamRightsView() {
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const upsertAndSetCurrentProject = useAppStore((s) => s.upsertAndSetCurrentProject);
  const trashedProjects = useAppStore((s) => s.trashedProjects);
  const toggleProjectHidden = useAppStore((s) => s.toggleProjectHidden);
  const moveProjectToTrash = useAppStore((s) => s.moveProjectToTrash);
  const restoreTrashedProject = useAppStore((s) => s.restoreTrashedProject);
  const deleteTrashedProject = useAppStore((s) => s.deleteTrashedProject);
  const emptyTrash = useAppStore((s) => s.emptyTrash);

  const supabaseEnabled = isSupabaseConfigured();
  const supabaseUser = useSupabaseAuthStore((s) => s.user);
  const supabaseAuthInitialized = useSupabaseAuthStore((s) => s.initialized);
  const supabaseAuthLoading = useSupabaseAuthStore((s) => s.loading);
  const initializeSupabaseAuth = useSupabaseAuthStore((s) => s.initialize);
  const signInSupabase = useSupabaseAuthStore((s) => s.signIn);
  const signOutSupabase = useSupabaseAuthStore((s) => s.signOut);

  const {
    projects: supabaseProjects,
    error: supabaseProjectsError,
    refetch: refetchSupabaseProjects,
    createProject,
    updateProject,
    getMembers,
    addMember,
    updateMemberRole,
    removeMember,
    transferOwnership,
  } = useSupabaseProjects();

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'hidden' | 'trash'>('all');
  const [membersProjectId, setMembersProjectId] = useState<string | null>(null);
  const [membersProjectName, setMembersProjectName] = useState('');
  const [editDialogProject, setEditDialogProject] = useState<Project | null>(null);
  const [supabaseEmail, setSupabaseEmail] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [supabaseConnectError, setSupabaseConnectError] = useState<string | null>(null);
  const [connectingSupabase, setConnectingSupabase] = useState(false);
  const [togglingTeamDb, setTogglingTeamDb] = useState<string | null>(null);
  const [ownerByProjectId, setOwnerByProjectId] = useState<Record<string, OwnerInfo>>({});
  const [memberCountByProjectId, setMemberCountByProjectId] = useState<Record<string, number>>({});
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseEnabled || supabaseAuthInitialized) return;
    void initializeSupabaseAuth();
  }, [supabaseEnabled, supabaseAuthInitialized, initializeSupabaseAuth]);

  const supabaseProjectBySlug = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; shareEnabled: boolean; ownerId: string }
    >();
    for (const project of supabaseProjects) {
      map.set(project.slug, {
        id: project.id,
        name: project.name,
        shareEnabled: project.shareEnabled,
        ownerId: project.ownerId,
      });
    }
    return map;
  }, [supabaseProjects]);

  const loadAssignments = useCallback(async () => {
    if (!supabaseEnabled || !supabaseUser || supabaseProjects.length === 0) {
      setOwnerByProjectId({});
      setMemberCountByProjectId({});
      setAssignmentsError(null);
      return;
    }

    setAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const client = getSupabaseClient();
      const projectIds = supabaseProjects.map((project) => project.id);
      const ownerIds = Array.from(new Set(supabaseProjects.map((project) => project.ownerId)));

      const [membersResult, profilesResult] = await Promise.all([
        client.from('task_project_members').select('project_id').in('project_id', projectIds),
        client.from('profiles').select('id, email, display_name').in('id', ownerIds),
      ]);

      if (membersResult.error) {
        throw membersResult.error;
      }

      const counts: Record<string, number> = {};
      for (const row of membersResult.data ?? []) {
        counts[row.project_id] = (counts[row.project_id] ?? 0) + 1;
      }

      const ownerProfiles = new Map<string, { email: string; display_name: string | null }>();
      if (profilesResult.error) {
        // Profile lookup is optional, we still show IDs if this lookup fails.
        setAssignmentsError(
          'Owner-Profile konnten nicht vollständig geladen werden. IDs bleiben trotzdem sichtbar.'
        );
      } else {
        for (const profile of profilesResult.data ?? []) {
          ownerProfiles.set(profile.id, {
            email: profile.email,
            display_name: profile.display_name,
          });
        }
      }

      const nextOwnerByProjectId: Record<string, OwnerInfo> = {};
      for (const project of supabaseProjects) {
        const profile = ownerProfiles.get(project.ownerId);
        nextOwnerByProjectId[project.id] = {
          userId: project.ownerId,
          email: profile?.email,
          displayName: profile?.display_name,
        };
      }

      setMemberCountByProjectId(counts);
      setOwnerByProjectId(nextOwnerByProjectId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Fehler beim Laden der Zuständigkeiten';
      setAssignmentsError(message);
      setOwnerByProjectId({});
      setMemberCountByProjectId({});
    } finally {
      setAssignmentsLoading(false);
    }
  }, [supabaseEnabled, supabaseProjects, supabaseUser]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const handleSupabaseConnect = useCallback(async () => {
    if (connectingSupabase || supabaseAuthLoading) {
      return;
    }

    const email = supabaseEmail.trim();
    const password = supabasePassword;

    if (!email || !password) {
      setSupabaseConnectError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setSupabaseConnectError(null);
    setConnectingSupabase(true);

    try {
      const result = await signInSupabase(email, password);
      if (result.error) {
        setSupabaseConnectError(result.error);
        toast.error(result.error);
        return;
      }

      await initializeSupabaseAuth();
      setSupabasePassword('');
      toast.success('Supabase verbunden.');
      await refetchSupabaseProjects();
    } finally {
      setConnectingSupabase(false);
    }
  }, [
    connectingSupabase,
    supabaseAuthLoading,
    supabaseEmail,
    supabasePassword,
    signInSupabase,
    initializeSupabaseAuth,
    refetchSupabaseProjects,
  ]);

  const handleSignOut = useCallback(async () => {
    await signOutSupabase();
    setSupabasePassword('');
    setSupabaseConnectError(null);
    setMembersProjectId(null);
    setMembersProjectName('');
    toast.success('Supabase abgemeldet.');
  }, [signOutSupabase]);

  const handleAddProject = useCallback(async () => {
    try {
      const api = getElectronAPI();
      const result = await api.openDirectory();

      if (result.canceled || !result.filePaths[0]) {
        return;
      }

      const path = result.filePaths[0];
      const name = path.split(/[/\\]/).filter(Boolean).pop() || 'Neues Projekt';
      const initResult = await initializeProject(path);
      if (!initResult.success) {
        toast.error(initResult.error || 'Projekt konnte nicht geöffnet werden.');
        return;
      }

      upsertAndSetCurrentProject(path, name);
      toast.success(`Projekt "${name}" hinzugefügt.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Projekt konnte nicht hinzugefügt werden.';
      toast.error(message);
    }
  }, [upsertAndSetCurrentProject]);

  const handleToggleTeamDb = useCallback(
    async (project: Project) => {
      if (!supabaseUser) {
        toast.error('Bitte zuerst bei Supabase anmelden.');
        return;
      }

      setTogglingTeamDb(project.id);
      try {
        const linkedProject = supabaseProjectBySlug.get(project.path);
        if (linkedProject) {
          const nextEnabled = !linkedProject.shareEnabled;
          const ok = await updateProject(linkedProject.id, { shareEnabled: nextEnabled });
          if (!ok) {
            toast.error(supabaseProjectsError || 'Fehler beim Umschalten der Team-DB.');
            return;
          }
          toast.success(
            nextEnabled
              ? `Team-DB für "${project.name}" aktiviert`
              : `Team-DB für "${project.name}" deaktiviert`
          );
        } else {
          const created = await createProject(project.name, project.path, true);
          if (!created) {
            toast.error(
              supabaseProjectsError || 'Projekt konnte nicht für Team-DB angelegt werden.'
            );
            return;
          }
          toast.success(`Team-DB für "${project.name}" aktiviert`);
        }

        await refetchSupabaseProjects();
      } finally {
        setTogglingTeamDb(null);
      }
    },
    [
      supabaseUser,
      supabaseProjectBySlug,
      updateProject,
      createProject,
      supabaseProjectsError,
      refetchSupabaseProjects,
    ]
  );

  const hiddenProjects = useMemo(() => projects.filter((project) => project.isHidden), [projects]);

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list: (Project | TrashedProject)[] =
      activeTab === 'all' ? projects : activeTab === 'hidden' ? hiddenProjects : trashedProjects;
    const sorted = [...list].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    if (!normalized) return sorted;

    return sorted.filter((project) => {
      const linkedProject = supabaseProjectBySlug.get(project.path);
      const owner = linkedProject ? ownerByProjectId[linkedProject.id] : null;
      const ownerLabel = getOwnerLabel(owner);

      return (
        project.name.toLowerCase().includes(normalized) ||
        project.path.toLowerCase().includes(normalized) ||
        ownerLabel.toLowerCase().includes(normalized)
      );
    });
  }, [
    activeTab,
    projects,
    hiddenProjects,
    trashedProjects,
    query,
    supabaseProjectBySlug,
    ownerByProjectId,
  ]);

  const teamEnabledCount = useMemo(
    () => supabaseProjects.filter((project) => project.shareEnabled).length,
    [supabaseProjects]
  );

  const ownersKnownCount = useMemo(() => {
    let count = 0;
    for (const project of supabaseProjects) {
      if (ownerByProjectId[project.id]) {
        count += 1;
      }
    }
    return count;
  }, [supabaseProjects, ownerByProjectId]);

  const hiddenCount = hiddenProjects.length;
  const trashCount = trashedProjects.length;
  const canManageSupabase = !!supabaseUser;

  const projectRows = useMemo<TeamRightsProjectRow[]>(() => {
    return filteredProjects.map((project) => {
      const isTrashTab = activeTab === 'trash';
      const linkedProject = supabaseProjectBySlug.get(project.path);
      const teamDbActive = linkedProject?.shareEnabled ?? false;
      const supabaseProjectId = linkedProject?.id ?? null;
      const owner = supabaseProjectId ? (ownerByProjectId[supabaseProjectId] ?? null) : null;
      const membersCount = supabaseProjectId ? (memberCountByProjectId[supabaseProjectId] ?? 0) : 0;
      const isCurrentProject = currentProject?.id === project.id;
      const isHidden = !isTrashTab && !!(project as Project).isHidden;
      const projectColor = project.badgeColor ? `${project.badgeColor}` : 'transparent';

      return {
        project,
        isTrashTab,
        isCurrentProject,
        isHidden,
        teamDbActive,
        supabaseProjectId,
        ownerLabel: getOwnerLabel(owner),
        membersCount,
        projectColor,
      };
    });
  }, [
    filteredProjects,
    activeTab,
    supabaseProjectBySlug,
    ownerByProjectId,
    memberCountByProjectId,
    currentProject,
  ]);

  const handleOpenMembers = useCallback((supabaseProjectId: string, projectName: string) => {
    setMembersProjectId(supabaseProjectId);
    setMembersProjectName(projectName);
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setEditDialogProject(project);
  }, []);

  const handleToggleHidden = useCallback(
    (projectId: string, isHidden: boolean) => {
      toggleProjectHidden(projectId);
      toast.success(isHidden ? 'Projekt wird wieder angezeigt' : 'Projekt ausgeblendet');
    },
    [toggleProjectHidden]
  );

  const handleMoveToTrash = useCallback(
    (projectId: string) => {
      moveProjectToTrash(projectId);
      toast.success('In den Papierkorb verschoben');
    },
    [moveProjectToTrash]
  );

  const handleRestoreTrashed = useCallback(
    (projectId: string) => {
      restoreTrashedProject(projectId);
      toast.success('Projekt wiederhergestellt');
    },
    [restoreTrashedProject]
  );

  const handleDeleteTrashed = useCallback(
    (projectId: string) => {
      deleteTrashedProject(projectId);
      toast.success('Projekt endgültig gelöscht');
    },
    [deleteTrashedProject]
  );

  const handleEmptyTrash = useCallback(() => {
    emptyTrash();
    toast.success('Papierkorb geleert');
  }, [emptyTrash]);

  return (
    <div className="flex flex-1 flex-col h-screen content-bg" data-testid="team-rights-view">
      <header className="shrink-0 border-b border-border bg-glass backdrop-blur-md">
        <div className="px-4 sm:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Team & Rechte</h1>
              <p className="text-xs text-muted-foreground">
                Wer ist für welches Projekt zuständig und welche Rolle gilt dort.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              void refetchSupabaseProjects();
              void loadAssignments();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aktualisieren
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lokale Projekte</CardDescription>
                <CardTitle className="text-2xl">{projects.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Team-DB aktiv</CardDescription>
                <CardTitle className="text-2xl">{teamEnabledCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Zuständigkeit sichtbar</CardDescription>
                <CardTitle className="text-2xl">{ownersKnownCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {!supabaseEnabled ? (
            <Card>
              <CardHeader>
                <CardTitle>Supabase ist nicht aktiv</CardTitle>
                <CardDescription>
                  Setze `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`, damit Team-Rechte
                  verfügbar sind.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !supabaseUser ? (
            <Card>
              <CardHeader>
                <CardTitle>Supabase verbinden</CardTitle>
                <CardDescription>
                  Melde dich an, damit Team-DB, Rollen und Zuständigkeiten geladen werden können.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <input
                  type="email"
                  placeholder="E-Mail"
                  autoComplete="email"
                  value={supabaseEmail}
                  onChange={(event) => setSupabaseEmail(event.target.value)}
                  className={cn(
                    'w-full h-9 px-3 text-sm rounded-md',
                    'border border-border bg-background',
                    'text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-brand-500/40'
                  )}
                />
                <input
                  type="password"
                  placeholder="Passwort"
                  autoComplete="current-password"
                  value={supabasePassword}
                  onChange={(event) => setSupabasePassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !connectingSupabase && !supabaseAuthLoading) {
                      event.preventDefault();
                      void handleSupabaseConnect();
                    }
                  }}
                  className={cn(
                    'w-full h-9 px-3 text-sm rounded-md',
                    'border border-border bg-background',
                    'text-foreground placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-1 focus:ring-brand-500/40'
                  )}
                />
                {supabaseConnectError && (
                  <p className="text-xs text-destructive">{supabaseConnectError}</p>
                )}
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={
                    connectingSupabase ||
                    supabaseAuthLoading ||
                    !supabaseEmail.trim() ||
                    !supabasePassword.trim()
                  }
                  onClick={() => void handleSupabaseConnect()}
                >
                  {connectingSupabase || supabaseAuthLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Verbinde...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      Jetzt verbinden
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Supabase verbunden</CardTitle>
                <CardDescription>
                  Angemeldet als {supabaseUser.email ?? 'unbekannt'}. Du kannst jetzt Rollen direkt
                  verwalten.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void loadAssignments()}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rechte neu laden
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Abmelden
                </Button>
              </CardContent>
            </Card>
          )}

          <TeamRightsProjectConfigCard
            projectsCount={projects.length}
            hiddenCount={hiddenCount}
            trashCount={trashCount}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            query={query}
            setQuery={setQuery}
            rows={projectRows}
            assignmentsLoading={assignmentsLoading}
            assignmentsError={assignmentsError}
            togglingTeamDb={togglingTeamDb}
            canManageSupabase={canManageSupabase}
            onAddProject={() => void handleAddProject()}
            onToggleTeamDb={handleToggleTeamDb}
            onOpenMembers={handleOpenMembers}
            onEditProject={handleEditProject}
            onToggleHidden={handleToggleHidden}
            onMoveToTrash={handleMoveToTrash}
            onRestore={handleRestoreTrashed}
            onDeleteTrashed={handleDeleteTrashed}
            onEmptyTrash={handleEmptyTrash}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rollen einfach erklärt</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <p className="text-xs font-semibold">Owner</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin im Projekt. Kann Mitglieder und Rollen verwalten.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <p className="text-xs font-semibold">Editor</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kann Aufgaben erstellen und ändern.
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-2">
                <p className="text-xs font-semibold">Viewer</p>
                <p className="text-xs text-muted-foreground mt-1">Kann nur lesen, nichts ändern.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {supabaseEnabled && !!supabaseUser && membersProjectId && (
        <ProjectMembersDialog
          open={!!membersProjectId}
          onOpenChange={(open) => {
            if (!open) {
              setMembersProjectId(null);
              setMembersProjectName('');
              void refetchSupabaseProjects();
            }
          }}
          projectName={membersProjectName}
          supabaseProjectId={membersProjectId}
          getMembers={getMembers}
          addMember={addMember}
          updateMemberRole={updateMemberRole}
          removeMember={removeMember}
          transferOwnership={transferOwnership}
        />
      )}

      {editDialogProject && (
        <EditProjectDialog
          project={editDialogProject}
          open={!!editDialogProject}
          onOpenChange={(open) => {
            if (!open) {
              setEditDialogProject(null);
            }
          }}
        />
      )}
    </div>
  );
}
