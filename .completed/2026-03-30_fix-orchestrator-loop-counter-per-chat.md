---
title: Orchestrator Loop-Zähler wird nicht mehr in neue Chats übernommen
description: Fortschrittsanzeige an Session-Run gekoppelt und frischen Run bei neuem manuellen Chat gestartet
date: 2026-03-30
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/orchestrator-settings.tsx
  - History/orchestrator-loop-counter-pro-chat-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Die Orchestrator-Anzeige zeigte in neuen Chats alte Schrittstände (z. B. `4/100`), obwohl der Chat neu war.
Das wurde korrigiert, sodass Fortschritt nur für den passenden Run angezeigt wird.

### Was wurde gemacht

- `OrchestratorSettings` zeigt den Schrittzähler jetzt run-spezifisch:
  - Anzeige nur, wenn die aktuell geöffnete Session zur aktiven Run-ID gehört.
  - Sonst `0/Max` statt alter globaler Zahl.
- Prop-Kette ergänzt:
  - `AgentView` -> `AgentInputArea` -> `InputControls` -> `OrchestratorSettings`
  - übergibt die `orchestratorRunId` der aktuell geöffneten Session.
- Im Send-Flow (`AgentView`) ergänzt:
  - Beim ersten manuellen Send in einer Session ohne `orchestratorRunId` wird `startNewRun()` ausgeführt.
  - Damit startet ein frischer Orchestrator-Lauf und der Loop-Zähler beginnt logisch neu.

### Wichtige Entscheidungen

- Kein globales Zurücksetzen bei jeder Session-Navigation:
  - Hintergrundläufe bleiben stabil.
  - Nur neue manuelle Chats ohne Run-ID erzeugen einen neuen Run.
- Anzeige und Logik wurden getrennt:
  - UI zeigt keine irreführenden alten Zahlen.
  - Laufsteuerung bleibt robust für echte Orchestrator-Phasen.
