# Phase 8 – Notifications, Realtime, Refresh

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] Notification bei completed-Status
- [x] Realtime-Updates fuer Tasklisten
- [x] Auto-Refresh + manuelles Refresh harmonisieren

## Betroffene Komponenten

- apps/ui/src/hooks/use-task-notifications.ts (NEU)
- apps/ui/src/components/session-manager/task-notifications-popover.tsx (NEU)
- apps/ui/src/components/session-manager/tasks-panel.tsx (GEAENDERT)
- apps/ui/src/hooks/use-supabase-tasks.ts (BESTEHEND - Realtime bereits implementiert)

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert:
  - `use-task-notifications.ts` Hook: Laedt ungelesene Notifications, Realtime-Subscription, markAsRead, markAllAsRead, unreadCount
  - `task-notifications-popover.tsx` Komponente: Bell-Icon mit Neon-Cyan Badge, Popover mit Notification-Liste, Klick markiert als gelesen
  - Toast-Benachrichtigungen via sonner bei neuen task_completed Events (nur wenn App im Fokus)
  - Refresh-Button in tasks-panel.tsx mit Cyan-Styling bei Supabase-Modus
  - Integration der Notifications-Popover im Tasks-Panel Header
  - Bestehende Realtime-Subscription fuer Tasks war bereits in use-supabase-tasks.ts implementiert
- Offene Risiken:
  - Supabase Realtime erfordert korrekt konfigurierte Realtime-Policies in der Datenbank
  - task_notifications Tabelle muss den DB-Trigger aus Migration 004 korrekt ausfuehren
