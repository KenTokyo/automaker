---
title: 'Phase 8: Notifications + Realtime + Refresh-Logik'
description: Supabase task_notifications Hook, Bell-Popover mit Cyan-Badge, Toast-Benachrichtigungen, Refresh-Button Styling
date: 2026-03-25
status: success
effort: M
provider: claude
files:
  - apps/ui/src/hooks/use-task-notifications.ts
  - apps/ui/src/components/session-manager/task-notifications-popover.tsx
  - apps/ui/src/components/session-manager/tasks-panel.tsx
  - docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/subplans/2026-03-25-phase-08-notifications-realtime-MASTER-PLAN.md
  - docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/2026-03-25-agentic-supabase-MASTER-PLAN.md
tags: [feature, ui]
---

## Zusammenfassung

Phase 8 des Supabase-Masterplans implementiert das Benachrichtigungssystem fuer Tasks. Wenn ein Task den Status "completed" erhaelt, erzeugt ein DB-Trigger (Migration 004) einen Eintrag in der task_notifications Tabelle. Die UI zeigt diese Benachrichtigungen ueber ein Bell-Icon mit Popover an.

### Was wurde gemacht

- **use-task-notifications.ts** Hook erstellt:
  - Laedt ungelesene Notifications fuer den aktuellen User via Supabase PostgREST Join (task_notifications + tasks.title)
  - Realtime-Subscription fuer INSERT-Events auf task_notifications
  - markAsRead(id) und markAllAsRead() mit optimistischem Update
  - unreadCount als abgeleiteter Wert
  - Toast via sonner bei neuer Notification (nur wenn document.visibilityState === "visible")

- **task-notifications-popover.tsx** Komponente erstellt:
  - Bell-Icon (text-zinc-500) mit Neon-Cyan Badge (bg-cyan-500) bei ungelesenen
  - Ultra-dunkles Popover (bg-zinc-950, border-white/5)
  - Notification-Liste mit Cyan-Akzent am Rand fuer ungelesene Items
  - Relative Zeitangabe auf Deutsch ("vor 5 Min.", "gerade eben")
  - "Alle gelesen" Button im Header

- **tasks-panel.tsx** angepasst:
  - Notifications-Popover im Header neben Kanban-Button integriert
  - Refresh-Button mit Cyan-Styling (text-cyan-400 hover:bg-cyan-500/10) im Supabase-Modus
  - Bestehende Realtime-Subscription fuer Tasks bleibt unveraendert

### Wichtige Entscheidungen

- Ref-basiertes State-Pattern (useRef + forceUpdate) beibehalten, konsistent mit use-supabase-tasks.ts
- Notifications werden mit Tasks gejoint um den Titel anzuzeigen, ohne eine separate API
- Toast nur bei sichtbarer App (document.visibilityState check) um Spam zu vermeiden
- Fehler bei Notifications werden still ignoriert (non-critical feature)
