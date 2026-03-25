# Phase 2 – DB Schema + RLS Rechte

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primär: ki_architekt
- Unterstützend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [ ] Tabellen für Projekte, Mitglieder, Tasks, Anhänge und Notifications definieren
- [ ] RLS Regeln für owner/editor/viewer festlegen
- [ ] Status-Lifecycle todo -> in_progress -> completed absichern

## Betroffene Komponenten

- Supabase SQL Migrationen
- RLS Policies
- DB Doku

## Akzeptanzkriterien

- [ ] Zielumfang dieser Phase ist umgesetzt
- [ ] Keine Regression in direkt betroffenen Komponenten
- [ ] Übergabe-Notiz für nächste Phase erstellt

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert:
  - `supabase/migrations/001_profiles.sql` – Profiles + auto-create trigger
  - `supabase/migrations/002_task_projects.sql` – Projects + Members + RLS
  - `supabase/migrations/003_tasks.sql` – Tasks + Status-Lifecycle + RLS + Realtime
  - `supabase/migrations/004_attachments_notifications.sql` – Attachments + Notifications + Storage
  - `apps/ui/src/hooks/use-supabase-tasks.ts` – CRUD + Realtime Hook
  - `apps/ui/src/hooks/use-supabase-projects.ts` – Projekt + Mitglieder Hook
  - RLS Helper-Funktionen: `is_project_member()`, `can_edit_project()`
- Offene Risiken:
  - SQL muss noch in Supabase Dashboard ausgeführt werden
  - Realtime muss im Supabase Dashboard für die tasks-Tabelle aktiviert sein
