-- ============================================================================
-- Migration 006: RLS performance + FK indexes + stable function search_path
-- Based on Supabase Postgres Best Practices:
-- - Wrap auth.uid() as (select auth.uid()) in policies (initplan optimization)
-- - Add missing indexes for foreign keys used in joins/cascades
-- - Set explicit search_path on trigger helper functions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Missing FK indexes
-- ---------------------------------------------------------------------------
create index if not exists task_attachments_created_by_idx
  on public.task_attachments (created_by);

create index if not exists task_notifications_task_id_idx
  on public.task_notifications (task_id);

create index if not exists task_project_members_user_id_idx
  on public.task_project_members (user_id);

create index if not exists tasks_updated_by_idx
  on public.tasks (updated_by);

-- ---------------------------------------------------------------------------
-- 2) Function hardening: fixed search_path
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_task_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    new.completed_at = now();
  elsif new.status != 'completed' and old.status = 'completed' then
    new.completed_at = null;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) RLS policy performance improvements
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- task_projects
drop policy if exists "Owners see own projects" on public.task_projects;
drop policy if exists "Members see shared projects" on public.task_projects;
drop policy if exists "Users can create projects" on public.task_projects;
drop policy if exists "Owners can update projects" on public.task_projects;
drop policy if exists "Owners can delete projects" on public.task_projects;

create policy "Members and owners see projects"
  on public.task_projects for select
  using (
    owner_id = (select auth.uid())
    or (
      share_enabled = true
      and exists (
        select 1
        from public.task_project_members m
        where m.project_id = task_projects.id
          and m.user_id = (select auth.uid())
      )
    )
  );

create policy "Users can create projects"
  on public.task_projects for insert
  with check (owner_id = (select auth.uid()));

create policy "Owners can update projects"
  on public.task_projects for update
  using (owner_id = (select auth.uid()));

create policy "Owners can delete projects"
  on public.task_projects for delete
  using (owner_id = (select auth.uid()));

-- task_project_members
drop policy if exists "Members can see project members" on public.task_project_members;
drop policy if exists "Owners can add members" on public.task_project_members;
drop policy if exists "Owners can update member roles" on public.task_project_members;
drop policy if exists "Owners can remove members" on public.task_project_members;

create policy "Members can see project members"
  on public.task_project_members for select
  using (public.is_project_member(task_project_members.project_id, (select auth.uid())));

create policy "Owners can add members"
  on public.task_project_members for insert
  with check (
    exists (
      select 1
      from public.task_projects
      where task_projects.id = task_project_members.project_id
        and task_projects.owner_id = (select auth.uid())
    )
  );

create policy "Owners can update member roles"
  on public.task_project_members for update
  using (
    exists (
      select 1
      from public.task_projects
      where task_projects.id = task_project_members.project_id
        and task_projects.owner_id = (select auth.uid())
    )
  );

create policy "Owners can remove members"
  on public.task_project_members for delete
  using (
    exists (
      select 1
      from public.task_projects
      where task_projects.id = task_project_members.project_id
        and task_projects.owner_id = (select auth.uid())
    )
  );

-- tasks
drop policy if exists "Members can read tasks" on public.tasks;
drop policy if exists "Editors can create tasks" on public.tasks;
drop policy if exists "Editors can update tasks" on public.tasks;
drop policy if exists "Editors can delete tasks" on public.tasks;

create policy "Members can read tasks"
  on public.tasks for select
  using (public.is_project_member(tasks.project_id, (select auth.uid())));

create policy "Editors can create tasks"
  on public.tasks for insert
  with check (public.can_edit_project(tasks.project_id, (select auth.uid())));

create policy "Editors can update tasks"
  on public.tasks for update
  using (public.can_edit_project(tasks.project_id, (select auth.uid())));

create policy "Editors can delete tasks"
  on public.tasks for delete
  using (public.can_edit_project(tasks.project_id, (select auth.uid())));

-- task_attachments
drop policy if exists "Members can read attachments" on public.task_attachments;
drop policy if exists "Editors can add attachments" on public.task_attachments;
drop policy if exists "Editors can delete attachments" on public.task_attachments;

create policy "Members can read attachments"
  on public.task_attachments for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and public.is_project_member(t.project_id, (select auth.uid()))
    )
  );

create policy "Editors can add attachments"
  on public.task_attachments for insert
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and public.can_edit_project(t.project_id, (select auth.uid()))
    )
  );

create policy "Editors can delete attachments"
  on public.task_attachments for delete
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and public.can_edit_project(t.project_id, (select auth.uid()))
    )
  );

-- task_notifications
drop policy if exists "Users can read own notifications" on public.task_notifications;
drop policy if exists "Users can mark own notifications read" on public.task_notifications;

create policy "Users can read own notifications"
  on public.task_notifications for select
  using (target_user_id = (select auth.uid()));

create policy "Users can mark own notifications read"
  on public.task_notifications for update
  using (target_user_id = (select auth.uid()));

