/**
 * Hook for tasks via Supabase (Team Tasks)
 *
 * Replaces file-based task storage with direct Supabase queries.
 * Includes realtime subscriptions for live updates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';
import type { Database, TaskStatus, TaskPriority } from '@/lib/supabase-types';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];
type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];

export interface SupabaseTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  summary: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  createdBy: string;
  updatedBy: string | null;
  chatSessionId: string | null;
  completedNotes: string | null;
  completedFiles: string[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

function dbToSupabaseTask(row: DbTask): SupabaseTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    chatSessionId: row.chat_session_id,
    completedNotes: row.completed_notes,
    completedFiles: row.completed_files,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapTaskUpdatesToDb(updates: UpdateTaskInput, userId: string): DbTaskUpdate {
  const dbUpdates: DbTaskUpdate = {
    updated_by: userId,
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.summary !== undefined) dbUpdates.summary = updates.summary;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    dbUpdates.completed_at = updates.status === 'completed' ? new Date().toISOString() : null;
  }
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.chatSessionId !== undefined) dbUpdates.chat_session_id = updates.chatSessionId;
  if (updates.completedNotes !== undefined) dbUpdates.completed_notes = updates.completedNotes;
  if (updates.completedFiles !== undefined) dbUpdates.completed_files = updates.completedFiles;

  return dbUpdates;
}

export async function updateSupabaseTaskById(
  id: string,
  updates: UpdateTaskInput,
  userId: string
): Promise<SupabaseTask | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  const dbUpdates = mapTaskUpdatesToDb(updates, userId);
  const { data, error } = await getSupabaseClient()
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;
  return dbToSupabaseTask(data as DbTask);
}

interface UseSupabaseTasksOptions {
  projectId: string | null;
  statusFilter?: TaskStatus[];
}

export interface UseSupabaseTasksResult {
  tasks: SupabaseTask[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<SupabaseTask | null>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<SupabaseTask | null>;
  deleteTask: (id: string) => Promise<boolean>;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  summary?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  summary?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tags?: string[];
  chatSessionId?: string | null;
  completedNotes?: string | null;
  completedFiles?: string[] | null;
}

// Simple force-update hook
function useForceUpdate(): () => void {
  const [, setCount] = useState(0);
  return useCallback(() => setCount((c) => c + 1), []);
}

export function useSupabaseTasks({
  projectId,
  statusFilter,
}: UseSupabaseTasksOptions): UseSupabaseTasksResult {
  const user = useSupabaseAuthStore((s) => s.user);
  const tasksRef = useRef<SupabaseTask[]>([]);
  const loadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const forceUpdate = useForceUpdate();

  // Stable key for statusFilter to use in deps
  const statusKey = statusFilter?.join(',') ?? '';

  const fetchTasks = useCallback(async () => {
    if (!isSupabaseConfigured() || !projectId) {
      tasksRef.current = [];
      forceUpdate();
      return;
    }

    loadingRef.current = true;
    errorRef.current = null;
    forceUpdate();

    try {
      const client = getSupabaseClient();
      let query = client
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      tasksRef.current = ((data ?? []) as DbTask[]).map(dbToSupabaseTask);
      loadingRef.current = false;
      forceUpdate();
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : 'Unknown error';
      loadingRef.current = false;
      forceUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusKey, forceUpdate]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !projectId) return;

    const client = getSupabaseClient();
    const channel = client
      .channel(`tasks:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = dbToSupabaseTask(payload.new as DbTask);
            if (!statusFilter || statusFilter.includes(newTask.status)) {
              tasksRef.current = [newTask, ...tasksRef.current.filter((t) => t.id !== newTask.id)];
              forceUpdate();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToSupabaseTask(payload.new as DbTask);
            if (statusFilter && !statusFilter.includes(updated.status)) {
              tasksRef.current = tasksRef.current.filter((t) => t.id !== updated.id);
            } else {
              const exists = tasksRef.current.some((t) => t.id === updated.id);
              if (exists) {
                tasksRef.current = tasksRef.current.map((t) => (t.id === updated.id ? updated : t));
              } else {
                tasksRef.current = [updated, ...tasksRef.current];
              }
            }
            forceUpdate();
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) {
              tasksRef.current = tasksRef.current.filter((t) => t.id !== oldId);
              forceUpdate();
            }
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusKey, forceUpdate]);

  const createTask = useCallback(
    async (input: CreateTaskInput): Promise<SupabaseTask | null> => {
      if (!isSupabaseConfigured() || !user) return null;

      const insert: DbTaskInsert = {
        project_id: input.projectId,
        title: input.title,
        description: input.description ?? '',
        summary: input.summary ?? '',
        status: input.status ?? 'todo',
        priority: input.priority ?? '',
        tags: input.tags ?? [],
        created_by: user.id,
      };

      const { data, error } = await getSupabaseClient()
        .from('tasks')
        .insert(insert)
        .select()
        .single();

      if (error || !data) return null;
      return dbToSupabaseTask(data as DbTask);
    },
    [user]
  );

  const updateTask = useCallback(
    async (id: string, updates: UpdateTaskInput): Promise<SupabaseTask | null> => {
      if (!isSupabaseConfigured() || !user) return null;
      return updateSupabaseTaskById(id, updates, user.id);
    },
    [user]
  );

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;

    const { error } = await getSupabaseClient().from('tasks').delete().eq('id', id);
    return !error;
  }, []);

  return {
    tasks: tasksRef.current,
    loading: loadingRef.current,
    error: errorRef.current,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
