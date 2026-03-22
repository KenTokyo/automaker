---
title: Session Elapsed Time Timer in Session List
description: Zeitanzeige neben Status-Badge in der Session-Liste mit live-updating Timer
date: 2026-03-18
status: success
effort: M
files:
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - libs/types/src/session.ts
  - apps/ui/src/types/electron.d.ts
  - apps/ui/src/hooks/use-elapsed-time.ts
  - apps/ui/src/components/session-manager/session-list-item.tsx
tags: [feature, ui]
---

## Session Timer Feature

### Was wurde gemacht

- `totalElapsedMs` und `lastStartedAt` Felder zur `SessionMetadata` (Server) und `SessionListItem` / `AgentSession` (Types) hinzugefuegt
- Timing-Tracking im `agent-service.ts`: `lastStartedAt` wird gesetzt wenn ein Run startet, `accumulateElapsedTime()` wird an allen 5 Stellen aufgerufen wo `isRunning = false` gesetzt wird
- API-Response um `totalElapsedMs` und `lastStartedAt` erweitert
- `useElapsedTime` Hook erstellt mit live-updating Timer (1s Intervall) und `formatElapsedTime` Helper
- Timer-Badge in `SessionListItemRow` neben den Status-Badges (lauft/Gestoppt/Fertig/Fehler) eingebaut
- Rot bei laufenden Sessions, gedaempft bei nicht-laufenden Sessions

### Design-Entscheidungen

- Zeit akkumuliert ueber mehrere Runs (pause/resume) - wenn Session gestoppt und wieder gestartet wird, zaehlt die Zeit weiter
- Timer-Icon (lucide Timer) fuer visuelle Erkennung
- Monospace + tabular-nums fuer stabiles Layout (Ziffern springen nicht)
- Rote Farbe bei laufenden Tasks, gedaempftes Grau bei abgeschlossenen
