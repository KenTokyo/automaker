/**
 * Unified task data source hook.
 *
 * Decides at runtime whether to use Supabase (DB) or the file-based
 * server API as the primary task data source.
 *
 * Decision logic:
 *   1. Supabase is configured (env vars present)  AND
 *   2. The user is authenticated in Supabase       AND
 *   3. A Supabase project matching the current projectPath exists
 *   => use Supabase
 *   Otherwise => fallback to file-based hooks.
 *
 * The hook maps between the two task formats so consumers always get
 * the standard `Task` shape from `@automaker/types`.
 */

import { useCallback, useMemo } from 'react';
import type {
  Task,
  TaskFilter,
  TaskPriority as FileTaskPriority,
  TaskStatus as FileTaskStatus,
} from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import { useShallow } from 'zustand/react/shallow';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';
import { useSupabaseProjects, type TaskProject } from '@/hooks/use-supabase-projects';
import {
  useSupabaseTasks,
  type SupabaseTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/hooks/use-supabase-tasks';
import { useTasks, createTask, updateTask, deleteTask } from '@/hooks/use-tasks';
import type { TaskStatus as DbTaskStatus } from '@/lib/supabase-types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TaskDataSource = 'supabase' | 'file';

export interface TasksSourceResult {
  /** Current data source in use */
  source: TaskDataSource;
  /** Unified task list (always Task shape from @automaker/types) */
  tasks: Task[];
  /** Loading state */
  loading: boolean;
  /** Error message or null */
  error: string | null;
  /** Re-fetch tasks */
  refetch: () => Promise<void> | void;

  // CRUD operations that work with the active source
  /** Returns the created task ID (or null on failure / file-based). */
  handleCreate: (data: TaskCreateInput) => Promise<string | null>;
  handleUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  handleDelete: (taskId: string) => Promise<void>;

  /** The Supabase project id (null when using file source) */
  supabaseProjectId: string | null;
}

export interface TaskCreateInput {
  title: string;
  description: string;
  priority: FileTaskPriority;
  status: FileTaskStatus;
  tags: string[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Status mapping helpers
// ---------------------------------------------------------------------------

/**
 * Map file-based status (open/in_progress/done) to DB status (todo/in_progress/completed).
 */
function fileStatusToDb(status: FileTaskStatus): DbTaskStatus {
  switch (status) {
    case 'open':
      return 'todo';
    case 'in_progress':
      return 'in_progress';
    case 'done':
      return 'completed';
    default:
      return 'todo';
  }
}

/**
 * Map DB status (todo/in_progress/completed) to file-based status (open/in_progress/done).
 */
function dbStatusToFile(status: DbTaskStatus): FileTaskStatus {
  switch (status) {
    case 'todo':
      return 'open';
    case 'in_progress':
      return 'in_progress';
    case 'completed':
      return 'done';
    default:
      return 'open';
  }
}

/**
 * Convert a SupabaseTask to the unified Task shape.
 */
function supabaseTaskToTask(st: SupabaseTask, projectPath?: string, projectName?: string): Task {
  return {
    // Use Supabase id as the "filename" key so existing TaskCard etc. works
    filename: st.id,
    title: st.title,
    description: st.description,
    date: st.createdAt,
    status: dbStatusToFile(st.status),
    priority: (st.priority || '') as FileTaskPriority,
    tags: st.tags ?? [],
    summary: st.summary ?? '',
    projectPath: projectPath,
    projectName: projectName,
  };
}

// ---------------------------------------------------------------------------
// Internal: Supabase source sub-hook
// ---------------------------------------------------------------------------

interface SupabaseSourceInput {
  projectPath: string;
  supabaseProject: TaskProject;
}

function useSupabaseSource({
  projectPath,
  supabaseProject,
}: SupabaseSourceInput): TasksSourceResult {
  const projectId = supabaseProject.id;
  const projectName = supabaseProject.name;

  const {
    tasks: dbTasks,
    loading,
    error,
    refetch,
    createTask: dbCreate,
    updateTask: dbUpdate,
    deleteTask: dbDelete,
  } = useSupabaseTasks({ projectId });

  const tasks: Task[] = useMemo(
    () => dbTasks.map((t) => supabaseTaskToTask(t, projectPath, projectName)),
    [dbTasks, projectPath, projectName]
  );

  const handleCreate = useCallback(
    async (data: TaskCreateInput): Promise<string | null> => {
      const input: CreateTaskInput = {
        projectId,
        title: data.title,
        description: data.description,
        summary: data.summary,
        priority: (data.priority || '') as CreateTaskInput['priority'],
        tags: data.tags,
      };
      const result = await dbCreate(input);
      return result?.id ?? null;
    },
    [projectId, dbCreate]
  );

  const handleUpdate = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const dbUpdates: UpdateTaskInput = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.priority !== undefined)
        dbUpdates.priority = updates.priority as UpdateTaskInput['priority'];
      if (updates.status !== undefined) dbUpdates.status = fileStatusToDb(updates.status);
      await dbUpdate(taskId, dbUpdates);
    },
    [dbUpdate]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      await dbDelete(taskId);
    },
    [dbDelete]
  );

  return {
    source: 'supabase',
    tasks,
    loading,
    error,
    refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
    supabaseProjectId: projectId,
  };
}

// ---------------------------------------------------------------------------
// Internal: File source sub-hook
// ---------------------------------------------------------------------------

interface FileSourceInput {
  projectPath: string;
}

function useFileSource({ projectPath }: FileSourceInput): TasksSourceResult {
  const { tasks, loading, error } = useAppStore(
    useShallow((s) => ({
      tasks: s.tasks,
      loading: s.tasksLoading,
      error: s.tasksError,
    }))
  );

  const projects = useAppStore((s) => s.projects);
  const removeFromStore = useAppStore((s) => s.removeTask);
  const updateInStore = useAppStore((s) => s.updateTaskInStore);
  const addToStore = useAppStore((s) => s.addTask);

  // Build allProjects list for multi-project fetching
  const allProjects = useMemo(
    () => projects.map((p) => ({ path: p.path, name: p.name })),
    [projects]
  );

  const { refetch } = useTasks(
    allProjects.length > 0 ? null : projectPath,
    undefined,
    allProjects.length > 0 ? allProjects : undefined
  );

  const handleCreate = useCallback(
    async (data: TaskCreateInput): Promise<string | null> => {
      const today = new Date().toISOString().split('T')[0];
      const newTask = await createTask({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        tags: data.tags,
        summary: data.summary,
        date: today,
        projectPath,
      });
      if (newTask) {
        addToStore(newTask);
        return newTask.filename;
      }
      return null;
    },
    [projectPath, addToStore]
  );

  const handleUpdate = useCallback(
    async (filename: string, updates: Partial<Task>) => {
      const task = tasks.find((t) => t.filename === filename);
      const updatePath = task?.projectPath || projectPath;
      const updated = await updateTask(filename, updatePath, updates);
      if (updated) {
        updateInStore(filename, updated);
      }
    },
    [tasks, projectPath, updateInStore]
  );

  const handleDelete = useCallback(
    async (filename: string) => {
      const task = tasks.find((t) => t.filename === filename);
      const deletePath = task?.projectPath || projectPath;
      const success = await deleteTask(filename, deletePath);
      if (success) {
        removeFromStore(filename);
      }
    },
    [tasks, projectPath, removeFromStore]
  );

  return {
    source: 'file',
    tasks,
    loading,
    error,
    refetch,
    handleCreate,
    handleUpdate,
    handleDelete,
    supabaseProjectId: null,
  };
}

// ---------------------------------------------------------------------------
// Main exported hook
// ---------------------------------------------------------------------------

/**
 * Find the matching Supabase project for a given local projectPath.
 *
 * Matching strategy: the Supabase project slug equals the projectPath,
 * or the Supabase project name matches the last folder segment of the path.
 */
function findSupabaseProject(
  supabaseProjects: TaskProject[],
  projectPath: string
): TaskProject | null {
  // Direct slug match (projects are often registered with the path as slug)
  const bySlug = supabaseProjects.find((p) => p.slug === projectPath);
  if (bySlug) return bySlug;

  // Match by folder name (last segment of path)
  const folderName = projectPath
    .replace(/[\\/]+$/, '')
    .split(/[\\/]/)
    .pop()
    ?.toLowerCase();
  if (folderName) {
    const byName = supabaseProjects.find((p) => p.name.toLowerCase() === folderName);
    if (byName) return byName;
  }

  return null;
}

export function useTasksSource(projectPath: string): TasksSourceResult {
  const supabaseConfigured = isSupabaseConfigured();
  const user = useSupabaseAuthStore((s) => s.user);
  const { projects: supabaseProjects } = useSupabaseProjects();

  const supabaseProject = useMemo(() => {
    if (!supabaseConfigured || !user) return null;
    return findSupabaseProject(supabaseProjects, projectPath);
  }, [supabaseConfigured, user, supabaseProjects, projectPath]);

  const useDb = supabaseProject !== null;

  // We must call both hooks unconditionally (React rules of hooks).
  // Only one will be the "active" source; the other is effectively idle.
  const dbResult = useSupabaseSource({
    projectPath,
    supabaseProject: supabaseProject ?? {
      id: '',
      ownerId: '',
      name: '',
      slug: '',
      shareEnabled: false,
      createdAt: '',
      updatedAt: '',
    },
  });

  const fileResult = useFileSource({ projectPath });

  // Return the active source
  return useDb ? dbResult : fileResult;
}
