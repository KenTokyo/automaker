---
title: Tasks-Crash behoben und Supabase-Teamplan erstellt
description: WebSocket-Task-Payload korrekt verarbeitet und klare Architektur für Team-Tasks über Supabase dokumentiert
date: 2026-03-25
status: success
effort: M
files:
  - apps/ui/src/hooks/use-tasks.ts
  - apps/ui/src/hooks/use-completed-tasks.ts
  - docs/tasks-collab/tasks/2026-03-25-supabase-collab/2026-03-25-supabase-collab-ARCHITEKTUR-ANALYSE.md
  - docs/tasks-collab/tasks/2026-03-25-supabase-collab/2026-03-25-supabase-collab-MASTER-PLAN.md
  - History/tasks-panel-crash-und-supabase-plan-verlauf.md
tags: [bugfix, docs, feature]
---

## Zusammenfassung

Der Fehler `t.tags is not iterable` im Tasks-Panel wurde behoben und zusätzlich eine ausführliche Umsetzungsplanung für gemeinsame Tasks über Supabase erstellt.

### Was wurde gemacht

- In `use-tasks.ts` wurde das Event-Payload robust gemacht:
  - unterstützt jetzt sowohl `{ task: ... }` als auch direktes Task-Objekt
  - normalisiert Tags defensiv als Array
  - verhindert doppelte Einträge nach Create-Events
- Dasselbe Schutzmuster wurde in `use-completed-tasks.ts` ergänzt.
- TypeScript-Check lief erfolgreich durch.
- Zwei Planungsdokumente für Supabase-Team-Tasks wurden erstellt:
  - Architektur-Analyse
  - Master-Plan in Phasen
- Chat-Verlauf wurde in `History/` dokumentiert.

### Wichtige Entscheidungen

- Bestehende Tasks-UI wird weiterverwendet statt neu gebaut.
- Zielarchitektur ist DB-only (Supabase) ohne dauerhaftes Dualspeicher-Modell.
- Freigaben pro Projekt sollen im Bereich „Projekte verwalten“ gesteuert werden.
