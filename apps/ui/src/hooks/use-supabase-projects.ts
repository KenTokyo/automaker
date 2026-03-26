/**
 * Hook for managing task projects in Supabase
 *
 * Handles CRUD for task_projects and task_project_members.
 */

import { useCallback, useEffect, useState } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';
import type { Database, ProjectMemberRole } from '@/lib/supabase-types';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

type DbProject = Database['public']['Tables']['task_projects']['Row'];
type DbProjectInsert = Database['public']['Tables']['task_projects']['Insert'];
const logger = createLogger('useSupabaseProjects');
const RLS_RECURSION_ERROR =
  'infinite recursion detected in policy for relation "task_project_members"';

export interface TaskProject {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  shareEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  email?: string;
  displayName?: string | null;
  createdAt: string;
}

function dbToProject(row: DbProject): TaskProject {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    shareEnabled: row.share_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeProjectError(message: string): string {
  if (message.includes(RLS_RECURSION_ERROR)) {
    return 'Supabase-Policy-Fehler: Bitte Migration 005 (RLS-Fix) ausführen und dann erneut versuchen.';
  }
  return message;
}

export function useSupabaseProjects() {
  const user = useSupabaseAuthStore((s) => s.user);
  const initialized = useSupabaseAuthStore((s) => s.initialized);
  const initializeAuth = useSupabaseAuthStore((s) => s.initialize);
  const [projects, setProjects] = useState<TaskProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || initialized) return;
    void initializeAuth();
  }, [initialized, initializeAuth]);

  const fetchProjects = useCallback(async () => {
    if (!isSupabaseConfigured() || !user) {
      setProjects([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await getSupabaseClient()
        .from('task_projects')
        .select('*')
        .order('name');

      if (err) throw err;
      setProjects(((data ?? []) as DbProject[]).map(dbToProject));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(
    async (name: string, slug: string, shareEnabled = false): Promise<TaskProject | null> => {
      if (!isSupabaseConfigured()) return null;
      if (!user) {
        setError('Nicht bei Supabase angemeldet.');
        return null;
      }

      const insert: DbProjectInsert = {
        owner_id: user.id,
        name,
        slug,
        share_enabled: shareEnabled,
      };

      const { data, error } = await getSupabaseClient()
        .from('task_projects')
        .insert(insert)
        .select()
        .single();

      if (error || !data) {
        const rawMessage = error?.message ?? 'Projekt konnte nicht erstellt werden.';
        const message = normalizeProjectError(rawMessage);
        setError(message);
        logger.warn('createProject failed:', {
          message: rawMessage,
          normalizedMessage: message,
          slug,
          name,
          userId: user.id,
        });
        return null;
      }

      const project = dbToProject(data as DbProject);
      setProjects((prev) => [...prev, project]);
      return project;
    },
    [user]
  );

  const updateProject = useCallback(
    async (
      id: string,
      updates: { name?: string; slug?: string; shareEnabled?: boolean }
    ): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;
      if (!user) {
        setError('Nicht bei Supabase angemeldet.');
        return false;
      }

      const dbUpdates: Database['public']['Tables']['task_projects']['Update'] = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.shareEnabled !== undefined) dbUpdates.share_enabled = updates.shareEnabled;

      const { error } = await getSupabaseClient()
        .from('task_projects')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        const message = normalizeProjectError(error.message);
        setError(message);
        logger.warn('updateProject failed:', {
          id,
          updates,
          message: error.message,
          normalizedMessage: message,
          userId: user.id,
        });
        return false;
      }

      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      return true;
    },
    [user]
  );

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;

    const { error } = await getSupabaseClient().from('task_projects').delete().eq('id', id);

    if (error) return false;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return true;
  }, []);

  const getMembers = useCallback(async (projectId: string): Promise<ProjectMember[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await getSupabaseClient()
      .from('task_project_members')
      .select('id, project_id, user_id, role, created_at, profiles(email, display_name)')
      .eq('project_id', projectId);

    if (error || !data) return [];

    return data.map((row) => {
      const profile = row.profiles as unknown as {
        email: string;
        display_name: string | null;
      } | null;
      return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        role: row.role,
        email: profile?.email,
        displayName: profile?.display_name,
        createdAt: row.created_at,
      };
    });
  }, []);

  const addMember = useCallback(
    async (
      projectId: string,
      email: string,
      role: ProjectMemberRole
    ): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };

      const client = getSupabaseClient();

      // Look up user by email
      const { data: profile, error: lookupError } = await client
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (lookupError || !profile) {
        return { error: 'User not found. They must register first.' };
      }

      const { error } = await client
        .from('task_project_members')
        .insert({ project_id: projectId, user_id: profile.id, role });

      return { error: error?.message ?? null };
    },
    []
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: ProjectMemberRole): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;

      const { error } = await getSupabaseClient()
        .from('task_project_members')
        .update({ role })
        .eq('id', memberId);

      return !error;
    },
    []
  );

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;

    const { error } = await getSupabaseClient()
      .from('task_project_members')
      .delete()
      .eq('id', memberId);

    return !error;
  }, []);

  const transferOwnership = useCallback(
    async (projectId: string, newOwnerUserId: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
      if (!user) return { error: 'Nicht bei Supabase angemeldet.' };
      if (!projectId || !newOwnerUserId) return { error: 'Projekt oder Nutzer fehlt.' };
      if (newOwnerUserId === user.id) return { error: null };

      const client = getSupabaseClient();

      const { data: existingMember, error: memberLookupError } = await client
        .from('task_project_members')
        .select('id, role')
        .eq('project_id', projectId)
        .eq('user_id', newOwnerUserId)
        .maybeSingle();

      if (memberLookupError) {
        const message = normalizeProjectError(memberLookupError.message);
        setError(message);
        return { error: message };
      }

      if (!existingMember) {
        const { error: insertError } = await client
          .from('task_project_members')
          .insert({ project_id: projectId, user_id: newOwnerUserId, role: 'owner' });
        if (insertError) {
          const message = normalizeProjectError(insertError.message);
          setError(message);
          return { error: message };
        }
      } else if (existingMember.role !== 'owner') {
        const { error: promoteError } = await client
          .from('task_project_members')
          .update({ role: 'owner' })
          .eq('id', existingMember.id);
        if (promoteError) {
          const message = normalizeProjectError(promoteError.message);
          setError(message);
          return { error: message };
        }
      }

      const { error: demoteOldOwnerError } = await client
        .from('task_project_members')
        .update({ role: 'editor' })
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('role', 'owner');

      if (demoteOldOwnerError) {
        const message = normalizeProjectError(demoteOldOwnerError.message);
        setError(message);
        return { error: message };
      }

      const { error: ownerUpdateError } = await client
        .from('task_projects')
        .update({ owner_id: newOwnerUserId })
        .eq('id', projectId)
        .eq('owner_id', user.id);

      if (ownerUpdateError) {
        const message = normalizeProjectError(ownerUpdateError.message);
        setError(message);
        logger.warn('transferOwnership failed:', {
          projectId,
          oldOwnerId: user.id,
          newOwnerUserId,
          message: ownerUpdateError.message,
          normalizedMessage: message,
        });
        // Best-effort rollback for old owner role label.
        await client
          .from('task_project_members')
          .update({ role: 'owner' })
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .eq('role', 'editor');
        return { error: message };
      }

      setProjects((prev) =>
        prev.map((project) =>
          project.id === projectId ? { ...project, ownerId: newOwnerUserId } : project
        )
      );
      return { error: null };
    },
    [user]
  );

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getMembers,
    addMember,
    updateMemberRole,
    removeMember,
    transferOwnership,
  };
}
