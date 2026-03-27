---
title: Task Status Sync DB Hotfix
description: DB-Task-Statusspeicherung und verschachtelter Button-Fehler im Fertig-Panel behoben
date: 2026-03-26
status: success
effort: L
files:
  - apps/ui/src/components/session-manager/task-send-to-agent.tsx
  - apps/ui/src/components/session-manager/task-card.tsx
  - apps/ui/src/components/session-manager/tasks-panel.tsx
  - apps/ui/src/components/session-manager/completed-task-project-group.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - docs/tasks-online/tasks/2026-03-26-task-status-sync/2026-03-26-task-status-sync-MASTER-PLAN.md
  - History/todo-status-sync-plan-verlauf.md
tags: [bugfix, ui, docs]
---

## Zusammenfassung

Der Task-Status konnte im DB-Modus nach "Sofort starten" nicht gespeichert werden,
obwohl der Agent-Lauf bereits gestartet war. Zusätzlich gab es im Fertig-Panel einen
DOM-Fehler durch ein verschachteltes `<button>`.

### Was wurde gemacht

- Quelle (`file` vs `supabase`) wird jetzt vom Tasks-Panel bis in den Send-Flow korrekt durchgereicht.
- `TaskSendToAgent` erstellt den Bridge-Kontext nun quellenabhängig.
- Laufstatus-Badges in `TaskCard` nutzen denselben Schlüssel wie der Send-Flow.
- Header in `CompletedTaskProjectGroup` ist jetzt tastaturbedienbar ohne Button-Verschachtelung.
- In `agent-view` wurden strukturierte Logs ergänzt, damit Sync-Fehler schneller auffindbar sind.
- Master-Plan um zwei Hotfix-Phasen erweitert und Verlauf ergänzt.

### Wichtige Entscheidungen

- Kein neues Status-System eingeführt, sondern vorhandenen Datenfluss korrigiert.
- Für den DOM-Fix wurde die äußere Schaltfläche in ein `div` mit `role="button"` umgebaut,
  damit die innere Cleanup-Aktion weiterhin ein echter Button bleiben kann.
- Debug-Logs wurden direkt am Sync-Punkt ergänzt (in_progress + completed), damit die Ursache
  bei fehlender Speicherung sofort erkennbar ist.

### Verifikation

- `npm run typecheck` erfolgreich.
- Im DB-Mode wird der Task jetzt über den Supabase-Branch synchronisiert.
- Verschachtelter Button-Fehler ist strukturell entfernt.
