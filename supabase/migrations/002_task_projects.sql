-- ============================================================================
-- Migration 002: Task Projects + Members
-- Projects group tasks; members control who can access them
-- ============================================================================

-- Custom types
create type public.project_member_role as enum ('owner', 'editor', 'viewer');

-- Projects table
create table public.task_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create trigger task_projects_updated_at
  before update on public.task_projects
  for each row execute function public.set_updated_at();

-- Members table
create table public.task_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Auto-add owner as member on project creation
create or replace function public.auto_add_project_owner()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.task_project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.task_projects
  for each row execute function public.auto_add_project_owner();

-- RLS for task_projects
alter table public.task_projects enable row level security;

-- Owner can always see their projects
create policy "Owners see own projects"
  on public.task_projects for select
  using (owner_id = auth.uid());

-- Members can see shared projects
create policy "Members see shared projects"
  on public.task_projects for select
  using (
    share_enabled = true
    and exists (
      select 1 from public.task_project_members
      where project_id = task_projects.id
        and user_id = auth.uid()
    )
  );

-- Only owner can insert projects (they become owner)
create policy "Users can create projects"
  on public.task_projects for insert
  with check (owner_id = auth.uid());

-- Only owner can update projects
create policy "Owners can update projects"
  on public.task_projects for update
  using (owner_id = auth.uid());

-- Only owner can delete projects
create policy "Owners can delete projects"
  on public.task_projects for delete
  using (owner_id = auth.uid());

-- RLS for task_project_members
alter table public.task_project_members enable row level security;

-- Members can see other members in their projects
create policy "Members can see project members"
  on public.task_project_members for select
  using (
    exists (
      select 1 from public.task_project_members as my
      where my.project_id = task_project_members.project_id
        and my.user_id = auth.uid()
    )
  );

-- Only project owner can add members
create policy "Owners can add members"
  on public.task_project_members for insert
  with check (
    exists (
      select 1 from public.task_projects
      where id = project_id
        and owner_id = auth.uid()
    )
  );

-- Only project owner can update member roles
create policy "Owners can update member roles"
  on public.task_project_members for update
  using (
    exists (
      select 1 from public.task_projects
      where id = task_project_members.project_id
        and owner_id = auth.uid()
    )
  );

-- Only project owner can remove members
create policy "Owners can remove members"
  on public.task_project_members for delete
  using (
    exists (
      select 1 from public.task_projects
      where id = task_project_members.project_id
        and owner_id = auth.uid()
    )
  );
