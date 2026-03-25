---
title: 'Supabase Phase 1+2: Setup, DB-Schema, RLS und Hooks'
description: 'Supabase Client Setup, Auth-Store, SQL-Migrationen (profiles, projects, members, tasks, attachments, notifications), RLS-Policies, TypeScript Database-Types, und React Hooks fuer Tasks + Projekte'
date: 2026-03-25
status: success
effort: L
---

## Was wurde gemacht

### Phase 1 – Supabase Setup & Zugaenge

- `@supabase/supabase-js` als Dependency in `apps/ui` installiert
- `apps/ui/src/lib/supabase.ts` – Client-Factory mit `getSupabaseClient()` + `isSupabaseConfigured()`
- `apps/ui/src/lib/supabase-types.ts` – Vollstaendige Database-Types mit Relationships
- `apps/ui/src/store/supabase-auth-store.ts` – Zustand Auth-Store (initialize/signIn/signUp/signOut)
- `apps/ui/src/vite-env.d.ts` – VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY deklariert
- `apps/server/.env.example` – Supabase ENV-Variablen dokumentiert

### Phase 2 – DB Schema + RLS Rechte

- `supabase/migrations/001_profiles.sql` – Profiles-Tabelle mit auto-create Trigger aus auth.users
- `supabase/migrations/002_task_projects.sql` – Projects + Members mit auto-owner Trigger + RLS
- `supabase/migrations/003_tasks.sql` – Tasks mit Status-Lifecycle (completed_at auto-set), Realtime, RLS
- `supabase/migrations/004_attachments_notifications.sql` – Attachments, Notifications, Storage Bucket + Policies
- `apps/ui/src/hooks/use-supabase-tasks.ts` – Vollstaendiger CRUD + Realtime Hook
- `apps/ui/src/hooks/use-supabase-projects.ts` – Projekt + Mitglieder-Management Hook
- RLS Helper-Funktionen: `is_project_member()`, `can_edit_project()`
- TypeScript-Check: 0 Fehler

### Architektur-Entscheidungen

- Supabase Auth ist separat vom bestehenden Automaker Auth (Team-Feature)
- `supabase` Client kann null sein wenn nicht konfiguriert – graceful degradation
- Hooks nutzen `getSupabaseClient()` (non-null) statt nullable Variable fuer bessere Type-Safety
- Realtime-Subscriptions filtern nach project_id auf DB-Ebene
