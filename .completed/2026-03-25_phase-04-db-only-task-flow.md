---
title: Phase 4 DB-only Task-Datenfluss
description: Unified useTasksSource Hook mit Auto-Routing zwischen Supabase und Datei-basiertem Task-System
date: 2026-03-25
status: success
effort: M
provider: claude
files:
  - apps/ui/src/hooks/use-tasks-source.ts
  - apps/ui/src/components/session-manager/tasks-panel.tsx
  - docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/subplans/2026-03-25-phase-04-db-only-task-flow-MASTER-PLAN.md
  - docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/2026-03-25-agentic-supabase-MASTER-PLAN.md
tags: [feature, ui, refactor]
---

## Zusammenfassung

Neuer Wrapper-Hook `useTasksSource` erstellt, der automatisch zwischen Supabase (DB) und
dateibasiertem Task-System routet. Die tasks-panel.tsx nutzt jetzt diesen Hook und zeigt
einen visuellen Indikator (DB/Lokal Badge) an.

### Was wurde gemacht

- `use-tasks-source.ts`: Unified Hook mit Entscheidungslogik (Supabase configured + User auth + Projekt-Match)
- Status-Mapping zwischen File (open/in_progress/done) und DB (todo/in_progress/completed)
- ID-Mapping: Supabase UUID wird ins `filename`-Feld gemappt fuer TaskCard-Kompatibilitaet
- `tasks-panel.tsx`: Nutzt jetzt `useTasksSource` statt direkt `useTasks`
- DataSourceBadge: Cyan "DB" Badge bei Supabase, grau "Lokal" Badge bei Dateien
- Projekt-Filter nur im File-Modus sichtbar (DB-Modus ist projekt-spezifisch)
- CRUD ueber `sourceCreate/sourceUpdate/sourceDelete` vom Hook

### Wichtige Entscheidungen

- Beide Sub-Hooks (Supabase + File) werden immer aufgerufen (React Rules of Hooks), aber der idle Hook macht keine Netzwerk-Requests
- Das `filename`-Feld des Task-Interface wird fuer Supabase-Tasks mit der UUID befuellt -- so funktionieren alle bestehenden Komponenten (TaskCard etc.) ohne Aenderung
- task-card.tsx brauchte keine Aenderungen, da die Abstraktion vollstaendig im Hook liegt
- CompletedTasks (Done-Tab) noch nicht umgestellt -- offener Punkt fuer spaetere Phase
