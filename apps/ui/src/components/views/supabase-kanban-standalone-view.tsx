import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { Loader2, LogOut, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanbanBoard } from '@/components/session-manager/kanban-board';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';
import { useSupabaseProjects } from '@/hooks/use-supabase-projects';
import { useSupabaseTasks } from '@/hooks/use-supabase-tasks';

const logger = createLogger('SupabaseKanbanStandalone');

type AuthMode = 'login' | 'register';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createUniqueSlug(name: string, existingSlugs: string[]): string {
  const base = slugify(name) || 'projekt';
  if (!existingSlugs.includes(base)) return base;
  const suffix = Date.now().toString().slice(-6);
  return `${base}-${suffix}`;
}

export function SupabaseKanbanStandaloneView() {
  const user = useSupabaseAuthStore((s) => s.user);
  const initialized = useSupabaseAuthStore((s) => s.initialized);
  const authLoading = useSupabaseAuthStore((s) => s.loading);
  const initialize = useSupabaseAuthStore((s) => s.initialize);
  const signIn = useSupabaseAuthStore((s) => s.signIn);
  const signUp = useSupabaseAuthStore((s) => s.signUp);
  const signOut = useSupabaseAuthStore((s) => s.signOut);

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState('');
  const [projectCreateError, setProjectCreateError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
    createProject,
  } = useSupabaseProjects();

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    createTask,
    updateTask,
    deleteTask,
  } = useSupabaseTasks({ projectId: selectedProjectId });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    const exists = selectedProjectId
      ? projects.some((project) => project.id === selectedProjectId)
      : false;
    if (!exists) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const handleAuthSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setAuthError(null);
      setAuthNotice(null);

      if (!email.trim() || !password.trim()) {
        setAuthError('Bitte E-Mail und Passwort eingeben.');
        return;
      }

      if (authMode === 'register') {
        const result = await signUp(email.trim(), password, displayName.trim() || undefined);
        if (result.error) {
          setAuthError(result.error);
          return;
        }

        setAuthNotice(
          'Konto erstellt. Falls E-Mail-Bestätigung aktiv ist, bitte zuerst bestätigen und dann einloggen.'
        );
        return;
      }

      const result = await signIn(email.trim(), password);
      if (result.error) {
        setAuthError(result.error);
      }
    },
    [authMode, displayName, email, password, signIn, signUp]
  );

  const handleCreateProject = useCallback(async () => {
    const trimmed = newProjectName.trim();
    if (!trimmed) return;

    setProjectCreateError(null);
    const slug = createUniqueSlug(
      trimmed,
      projects.map((project) => project.slug)
    );

    const created = await createProject(trimmed, slug, true);
    if (!created) {
      setProjectCreateError('Projekt konnte nicht erstellt werden.');
      return;
    }

    setNewProjectName('');
    setSelectedProjectId(created.id);
  }, [createProject, newProjectName, projects]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchProjects(), refetchTasks()]);
  }, [refetchProjects, refetchTasks]);

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-100">Supabase ist nicht verbunden</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Bitte setze lokal in <code>apps/kanban-web/.env.local</code> oder in Vercel die
            Variablen <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </main>
    );
  }

  if (!initialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-2 text-zinc-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Anmeldung wird vorbereitet...</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
          <h1 className="text-2xl font-semibold text-zinc-100">Kanban Login</h1>
          <p className="mt-2 text-sm text-zinc-400">Melde dich mit deinem Supabase-Konto an.</p>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant={authMode === 'login' ? 'default' : 'outline'}
              onClick={() => setAuthMode('login')}
              className="flex-1"
            >
              Einloggen
            </Button>
            <Button
              type="button"
              variant={authMode === 'register' ? 'default' : 'outline'}
              onClick={() => setAuthMode('register')}
              className="flex-1"
            >
              Registrieren
            </Button>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
            <Input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
            {authMode === 'register' && (
              <Input
                type="text"
                placeholder="Name (optional)"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            )}

            {authError && <p className="text-sm text-rose-400">{authError}</p>}
            {authNotice && <p className="text-sm text-emerald-400">{authNotice}</p>}

            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bitte warten...
                </>
              ) : authMode === 'login' ? (
                'Einloggen'
              ) : (
                'Konto erstellen'
              )}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="mr-2">
          <p className="text-sm text-zinc-400">Eingeloggt als</p>
          <p className="text-sm font-semibold">{user.email ?? 'Unbekannt'}</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-white/10 bg-zinc-900 px-2 text-sm text-zinc-100"
            value={selectedProjectId ?? ''}
            onChange={(event) => setSelectedProjectId(event.target.value || null)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <Input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Neues Projekt"
              className="h-9 w-40"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9 gap-1"
              onClick={handleCreateProject}
            >
              <Plus className="h-4 w-4" />
              Anlegen
            </Button>
          </div>

          <Button type="button" variant="outline" className="h-9 gap-1" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Aktualisieren
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1"
            onClick={() => {
              signOut().catch((error) => logger.warn('Sign-out failed:', error));
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {projectCreateError && (
        <p className="px-4 py-2 text-sm text-rose-400">{projectCreateError}</p>
      )}
      {projectsError && <p className="px-4 py-2 text-sm text-rose-400">{projectsError}</p>}

      {projectsLoading && projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-zinc-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Projekte werden geladen...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 text-center">
            <h2 className="text-xl font-semibold">Noch kein Projekt</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Erstelle oben dein erstes Projekt. Danach erscheint sofort dein Kanban-Board.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <KanbanBoard
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            projectId={selectedProject?.id ?? null}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onCreateTask={createTask}
            onRefetch={refetchTasks}
            showSendToAgent={false}
          />
        </div>
      )}
    </main>
  );
}
