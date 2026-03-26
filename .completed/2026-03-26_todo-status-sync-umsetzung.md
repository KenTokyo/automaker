---
title: Task-Status-Sync komplett umgesetzt
description: To-do -> In Arbeit -> Fertig wurde für Auto-Start und Abschluss-Sync sauber umgesetzt
date: 2026-03-26
status: success
effort: L
files:
  - apps/ui/src/store/task-chat-bridge-store.ts
  - apps/ui/src/components/session-manager/task-send-to-agent.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/hooks/use-electron-agent.ts
  - apps/ui/src/hooks/use-supabase-tasks.ts
  - apps/ui/src/components/session-manager/task-card.tsx
  - apps/ui/src/components/session-manager/kanban-task-card.tsx
  - apps/ui/src/components/session-manager/tasks-panel.tsx
  - apps/server/src/routes/completed-tasks/handlers.ts
  - libs/prompts/src/completed-task-prompt.ts
  - apps/ui/src/components/session-manager/completed-tasks-panel.tsx
tags: [feature, ui, refactor]
---

## Ziel

Der Task-Status sollte zuverlässig und nachvollziehbar von `todo` über `in_progress` nach `completed` laufen – lokal und mit Supabase synchron.

## Umsetzung

1. `Sofort starten` startet jetzt wirklich direkt (Session + Auto-Send), statt nur den Text vorzubereiten.
2. Statuswechsel auf `in_progress` erfolgt erst nach erfolgreichem Send.
3. Supabase-Task bekommt beim Start direkt die `chat_session_id`.
4. Bei echtem `complete`-Event wird auf `completed` gesetzt.
5. `completed_notes` wird aus der letzten Assistant-Antwort übernommen.
6. `stopped`/`error` werden sauber getrennt und nicht als `completed` markiert.
7. Karten zeigen klar den Laufstatus: `Gestartet`, `Läuft`, `Fertig`, `Fehlgeschlagen`.
8. `.completed` bleibt Dokumentation, Supabase `tasks` bleibt die eindeutige Status-Quelle.

## Checks

- `npm run typecheck` (UI): erfolgreich.
- Server-Workspace hat kein `typecheck`-Script (`npm run typecheck --workspace=apps/server` schlägt mit "Missing script" fehl).
- UTF-8-Scan mit Kurz-Regex wurde ausgeführt; Treffer kamen nur aus Doku-/Regeldateien.

## Hinweise

- Der Verlauf wurde in `History/todo-status-sync-plan-verlauf.md` ergänzt.
- Der Master-Plan wurde nach jeder Phase mit Datum und Ergebnis aktualisiert.
