-- ============================================================================
-- Migration 004: Attachments + Notifications
-- File attachments via Storage, notifications on task completion
-- ============================================================================

-- Task attachments (metadata, actual files in Supabase Storage)
create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index task_attachments_task_id_idx on public.task_attachments(task_id);

-- RLS
alter table public.task_attachments enable row level security;

create policy "Members can read attachments"
  on public.task_attachments for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id
        and public.is_project_member(t.project_id, auth.uid())
    )
  );

create policy "Editors can add attachments"
  on public.task_attachments for insert
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.can_edit_project(t.project_id, auth.uid())
    )
  );

create policy "Editors can delete attachments"
  on public.task_attachments for delete
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id
        and public.can_edit_project(t.project_id, auth.uid())
    )
  );

-- Notifications
create table public.task_notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'task_completed',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index task_notifications_target_idx on public.task_notifications(target_user_id, read_at);

-- RLS
alter table public.task_notifications enable row level security;

create policy "Users can read own notifications"
  on public.task_notifications for select
  using (target_user_id = auth.uid());

create policy "Users can mark own notifications read"
  on public.task_notifications for update
  using (target_user_id = auth.uid());

-- Auto-create notifications when task completes
create or replace function public.notify_on_task_completed()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    insert into public.task_notifications (task_id, target_user_id, type)
    select new.id, m.user_id, 'task_completed'
    from public.task_project_members m
    where m.project_id = new.project_id
      and m.user_id != auth.uid();
  end if;
  return new;
end;
$$;

create trigger on_task_completed
  after update on public.tasks
  for each row execute function public.notify_on_task_completed();

-- Storage bucket for task attachments
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict do nothing;

-- Storage policies
create policy "Members can read task attachments"
  on storage.objects for select
  using (
    bucket_id = 'task-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can upload task attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'task-attachments'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
