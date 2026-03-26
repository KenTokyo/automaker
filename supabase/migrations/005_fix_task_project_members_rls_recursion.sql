-- ============================================================================
-- Migration 005: Fix recursive RLS policy on task_project_members
-- Problem:
--   Existing SELECT policy queried task_project_members inside itself, which
--   can trigger "infinite recursion detected in policy".
-- Solution:
--   Use a SECURITY DEFINER helper function in policy condition.
-- ============================================================================

-- Ensure helper exists and runs with definer privileges.
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.task_project_members
    where project_id = p_project_id
      and user_id = p_user_id
  );
$$;

drop policy if exists "Members can see project members" on public.task_project_members;

create policy "Members can see project members"
  on public.task_project_members for select
  using (public.is_project_member(task_project_members.project_id, auth.uid()));
