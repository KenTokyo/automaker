# Phase 6 -- Task -> Chat Bridge + Modellwahl

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] Task-Aktion An Agent senden / Chat oeffnen einbauen
- [x] Default-Modell Sofortstart + manuelle Modellwahl
- [x] Task-Chat-Verknuepfung (chat_session_id) via Bridge Store vorbereitet

## Betroffene Komponenten

- apps/ui/src/components/session-manager/task-card.tsx (Import + Button hinzugefuegt)
- apps/ui/src/components/session-manager/kanban-task-card.tsx (Supabase-Button hinzugefuegt)
- apps/ui/src/components/session-manager/task-send-to-agent.tsx (NEU - Popover mit Modellwahl)
- apps/ui/src/components/views/agent-view/components/chat-area.tsx (TaskContextBadge integriert)
- apps/ui/src/components/views/agent-view/components/task-context-badge.tsx (NEU - Badge-Anzeige)
- apps/ui/src/components/views/agent-view/components/index.ts (Export hinzugefuegt)
- apps/ui/src/components/views/agent-view.tsx (Bridge-Effect zum Message-Injecting)
- apps/ui/src/store/task-chat-bridge-store.ts (NEU - Zustand Store fuer Bridge-Logik)

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten (TypeScript-Check bestanden)
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Was wurde gebaut

### 1. Task-Chat Bridge Store (`task-chat-bridge-store.ts`)

- Zustand Store mit `sendTaskToAgent()`, `consumePendingMessage()`, `dismissTaskContext()`
- Haelt `activeTaskContext` (Task-Metadaten) und `pendingTaskMessage` (Nachrichtentext)
- `shouldNavigateToAgent` Flag fuer View-Navigation

### 2. "An Agent senden" Button (`task-send-to-agent.tsx`)

- Popover-Dropdown mit 2 Optionen:
  - "Sofort starten" (Quick-Send mit aktuellem Modell)
  - "Modell waehlen..." (zeigt AgentModelSelector)
- Zwei Varianten: `TaskSendToAgent` (file-based Task) und `SupabaseTaskSendToAgent` (Supabase Task)
- Setzt Task-Status auf `in_progress` beim Senden
- Navigiert zum Agent View via `setCurrentView('agent')`

### 3. Task Context Badge (`task-context-badge.tsx`)

- Schmaler Banner ueber dem Chat mit Cyan-Farbe
- Zeigt Task-Titel + ClipboardList-Icon
- Klick navigiert zurueck zum Tasks-Tab
- Dismiss-Button zum Entfernen

### 4. Agent View Integration

- `useEffect` konsumiert `pendingTaskMessage` und injiziert ihn in die Chat-Eingabe
- Navigation-Flag wird automatisch geloescht wenn Agent View aktiv ist
- Kein Endlosschleifen-Risiko durch `getState()`-Pattern statt Selector-Funktionen

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert: Task-Chat Bridge mit Modellwahl, Badge im Chat, Supabase + File-Task Support
- Offene Risiken:
  - `chat_session_id` wird noch nicht in Supabase persistiert (updateTask existiert, aber die Rueckverfolgung Session->Task ist noch nicht verdrahtet)
  - Agent-View ist bereits >700 Zeilen (vorbestehend, kein Regression-Risiko)
