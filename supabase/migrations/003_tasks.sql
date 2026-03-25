-- ============================================================================
-- Migration 003: Tasks table
-- Core tasks table with status lifecycle and project association
-- ============================================================================

create type public.task_status as enum ('todo', 'in_progress', 'completed');
create type public.task_priority as enum ('P1', 'P2', 'P3', 'P4', '');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  summary text not null default '',
  status public.task_status not null default 'todo',
  priority public.task_priority not null default '',
  tags text[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  updated_by uuid references public.profiles(id),
  chat_session_id text,
  completed_notes text,
  completed_files text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Indexes
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_status_idx on public.tasks(status);
create index tasks_created_by_idx on public.tasks(created_by);

-- Auto-set completed_at when status changes to completed
create or replace function public.handle_task_status_change()
returns trigger
language plpgsql
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

create trigger tasks_status_change
  before update on public.tasks
  for each row execute function public.handle_task_status_change();

create trigger tasks_updated_at
  before insert on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

-- Helper function: check if user is a member of a project
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.task_project_members
    where project_id = p_project_id
      and user_id = p_user_id
  );
$$;

-- Helper function: check if user can edit in a project
create or replace function public.can_edit_project(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.task_project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and role in ('owner', 'editor')
  );
$$;

-- Members can read tasks in their projects
create policy "Members can read tasks"
  on public.tasks for select
  using (public.is_project_member(project_id, auth.uid()));

-- Editors and owners can create tasks
create policy "Editors can create tasks"
  on public.tasks for insert
  with check (public.can_edit_project(project_id, auth.uid()));

-- Editors and owners can update tasks
create policy "Editors can update tasks"
  on public.tasks for update
  using (public.can_edit_project(project_id, auth.uid()));

-- Editors and owners can delete tasks
create policy "Editors can delete tasks"
  on public.tasks for delete
  using (public.can_edit_project(project_id, auth.uid()));

-- Enable realtime
alter publication supabase_realtime add table public.tasks;
