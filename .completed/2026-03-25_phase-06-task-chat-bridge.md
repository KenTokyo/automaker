---
title: 'Phase 6: Task -> Chat Bridge + Modellwahl'
description: Task-Karten koennen per Button an den Agent-Chat gesendet werden, mit Sofortstart oder manueller Modellwahl
date: 2026-03-25
status: success
effort: M
provider: claude
files:
  - apps/ui/src/store/task-chat-bridge-store.ts
  - apps/ui/src/components/session-manager/task-send-to-agent.tsx
  - apps/ui/src/components/views/agent-view/components/task-context-badge.tsx
  - apps/ui/src/components/views/agent-view/components/chat-area.tsx
  - apps/ui/src/components/views/agent-view/components/index.ts
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/session-manager/task-card.tsx
  - apps/ui/src/components/session-manager/kanban-task-card.tsx
tags: [feature, ui]
---

## Zusammenfassung

Phase 6 des Supabase-Masterplans implementiert die Bridge zwischen Tasks und dem Agent-Chat.
Benutzer koennen Tasks direkt an den KI-Agenten senden, mit Modellwahl oder Sofortstart.

### Was wurde gebaut

1. **Task-Chat Bridge Store** (`task-chat-bridge-store.ts`)
   - Zustand Store mit `sendTaskToAgent()`, `consumePendingMessage()`, `dismissTaskContext()`
   - Haelt aktiven Task-Kontext und Pending-Nachricht
   - Navigation-Flag fuer automatischen View-Wechsel

2. **"An Agent senden" Button** (`task-send-to-agent.tsx`)
   - Popover-Dropdown mit Rocket-Icon, Cyan-Farbe
   - Option 1: "Sofort starten" mit aktuellem Modell (1-Klick)
   - Option 2: "Modell waehlen..." mit AgentModelSelector-Integration
   - Zwei Varianten: `TaskSendToAgent` (file-Tasks) und `SupabaseTaskSendToAgent` (Supabase-Tasks)
   - Setzt Task-Status automatisch auf `in_progress`
   - Navigiert zum Agent View

3. **Task Context Badge** (`task-context-badge.tsx`)
   - Schmaler Cyan-Banner ueber dem Chat
   - Zeigt Task-Titel mit ClipboardList-Icon
   - Klick navigiert zurueck zum Tasks-Tab (left panel)
   - Dismiss-Button zum Entfernen

4. **Agent View Integration** (`agent-view.tsx`)
   - useEffect konsumiert pendingTaskMessage und injiziert es in die Chat-Eingabe
   - Navigation-Flag wird automatisch geloescht
   - Kein Endlosschleifen-Risiko durch `getState()`-Pattern

### Wichtige Entscheidungen

- Zustand Store statt Prop-Drilling: Der Bridge-Store vermeidet tiefes Prop-Drilling durch die Komponentenhierarchie
- `getState()` statt Selector fuer Mutations: Vermeidet re-render-Loops in useEffect
- Zwei Varianten (File/Supabase): TaskSendToAgent und SupabaseTaskSendToAgent wegen unterschiedlicher Task-Typen
- Kein `chat_session_id` Persist: Die Rueckverfolgung Session->Task ist vorbereitet, aber noch nicht vollstaendig verdrahtet
