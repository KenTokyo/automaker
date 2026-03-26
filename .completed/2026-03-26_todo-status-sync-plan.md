---
title: Task-Status-Sync Plan (To-do zu In Arbeit zu Fertig)
description: Analyse und neuer Architektur-/Phasenplan für einen sauberen Status-Flow zwischen Automaker und Supabase
date: 2026-03-26
status: success
effort: S
files:
  - docs/tasks-online/tasks/2026-03-26-task-status-sync/2026-03-26-task-status-sync-ARCHITEKTUR-ANALYSE.md
  - docs/tasks-online/tasks/2026-03-26-task-status-sync/2026-03-26-task-status-sync-MASTER-PLAN.md
  - History/todo-status-sync-plan-verlauf.md
tags: [docs, feature]
---

## Zusammenfassung

Die angefragte History-Datei wurde ausgewertet und mit bestehender Doku/Code-Lage abgeglichen.
Danach wurde ein neuer, konkreter Plan erstellt:

1. Architektur-Analyse mit klarer Ziel-Logik für den Status-Fluss.
2. Master-Plan mit umsetzbaren Phasen.
3. Verlaufseintrag in `History/` für nahtlose Weiterarbeit im nächsten Chat.

## Wichtige Entscheidung

Supabase `tasks` bleibt die Hauptquelle für `todo`, `in_progress`, `completed`.
Die `.completed`-Dateien bleiben optional als Doku-Spur und sollen den Kanban-Status nicht doppelt steuern.
