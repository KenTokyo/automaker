---
title: 'Supabase Phase 9: Migration, Rollout, Deploy-Vorbereitung'
description: 'Migrations-Skript und -UI fuer lokale Tasks nach Supabase, Deploy-Checkliste'
date: 2026-03-25
status: completed
effort: medium
---

## Was wurde gemacht

### 1. Migrations-Skript (`apps/ui/src/lib/task-migration.ts`)

- Funktion `migrateLocalTasksToSupabase()` mit Fortschritts-Callback
- Liest lokale Tasks ueber bestehende Server-API (`/api/tasks?projectPath=...`)
- Status-Mapping: `open` -> `todo`, `in_progress` -> `in_progress`, `done` -> `completed`
- Duplikat-Erkennung: uebergeht Tasks mit gleichem Titel (case-insensitive)
- Gibt detaillierten Report zurueck: migrated, skipped, errors, total
- Hilfsfunktion `fetchLocalTasks()` exportiert fuer Wiederverwendung

### 2. Migrations-Dialog (`apps/ui/src/components/session-manager/task-migration-dialog.tsx`)

- Radix Dialog mit sehr dunklem Design (bg-zinc-950, border-white/5)
- Idle: Quell-/Ziel-Info, Violet Start-Button
- Fortschritt: Cyan-Balken mit Prozentanzeige + aktuellem Task-Titel
- Ergebnis: Emerald bei Erfolg, Rose bei Fehlern, detaillierte Fehler-Liste
- Schliessen-Button nur wenn nicht laufend

### 3. Integration in tasks-panel.tsx

- Neuer ArrowUpFromLine-Button (Violet) im Header
- Nur sichtbar wenn Supabase konfiguriert UND Projekt zugeordnet UND User authentifiziert
- Oeffnet TaskMigrationDialog
- Nach erfolgreicher Migration: automatischer Refetch der Tasks

### 4. Deploy-Checkliste (`DEPLOY-CHECKLIST.md`)

- 12-Punkte-Checkliste: Supabase-Projekt, DB-Schema, Realtime, Storage, Auth, ENV-Variablen, CORS, RLS, Erster Setup, Migration, Vercel Deploy, Rueckfallplan

## Betroffene Dateien

- `apps/ui/src/lib/task-migration.ts` (NEU)
- `apps/ui/src/components/session-manager/task-migration-dialog.tsx` (NEU)
- `apps/ui/src/components/session-manager/tasks-panel.tsx` (GEAENDERT)
- `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/DEPLOY-CHECKLIST.md` (NEU)
- `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/2026-03-25-agentic-supabase-MASTER-PLAN.md` (AKTUALISIERT)
- `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/subplans/2026-03-25-phase-09-migration-rollout-MASTER-PLAN.md` (AKTUALISIERT)
