---
title: Completed Tasks -> Supabase DB Push Feature
description: Erledigte Aufgaben per Button in die Supabase-DB pushen mit Duplikat-Erkennung, Multiselect und Fortschrittsanzeige
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/lib/completed-task-migration.ts
  - apps/ui/src/components/session-manager/completed-task-push-dialog.tsx
  - apps/ui/src/components/session-manager/completed-task-card.tsx
  - apps/ui/src/components/session-manager/completed-task-project-group.tsx
  - apps/ui/src/components/session-manager/completed-tasks-panel.tsx
tags: [feature, ui]
---

## Completed Tasks -> Supabase DB Push

4-Phasen Implementierung:

### Phase 1: Migration-Logik (completed-task-migration.ts)

- `pushCompletedTasksToSupabase()` Funktion
- CompletedTask -> Supabase `tasks` Mapping (status, effort, files, notes)
- Duplikat-Erkennung per title (case-insensitive)
- Fortschritts-Callback

### Phase 2: Push-Dialog UI (completed-task-push-dialog.tsx)

- Dialog mit Vorschau der zu pushenden Aufgaben
- Fortschrittsbalken mit Prozentanzeige
- Ergebnis-Zusammenfassung (gepusht / übersprungen / Fehler)
- Fehler-Liste bei Problemen

### Phase 3: Selection/Checkboxen

- Checkbox in CompletedTaskCard (optional, nur im Selection-Mode)
- "Alle auswählen" Checkbox in CompletedTaskProjectGroup Header
- Indeterminate-State für teilweise Auswahl

### Phase 4: Integration in Panel

- "DB" Push-All Button im Header
- CheckSquare Toggle für Selection-Mode
- Violette Aktionsleiste mit Auswahl-Counter + "Auswahl pushen" Button
- Push-Dialog mit Supabase Auth + Projekt-ID Integration

### Pattern-Referenz

Klont das existierende `task-migration.ts` + `TaskMigrationDialog` Pattern 1:1.
