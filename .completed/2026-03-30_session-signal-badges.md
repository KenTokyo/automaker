---
title: Session Signal Badges (Complete/Question)
description: Visuelle Status-Badges in Session-Liste basierend auf letztem KI-Nachrichteninhalt
date: 2026-03-30
status: success
effort: M
files:
  - libs/types/src/session-signal.ts
  - libs/types/src/session.ts
  - libs/types/src/index.ts
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/types/electron.d.ts
  - AGENTS.md
tags: [feature, ui]
---

## Session Signal Badges

Neues Feature: Automatische Erkennung von Signalwoertern in der letzten KI-Nachricht und Darstellung als farbige Badges in der Session-Liste.

### Was wurde gemacht:

- Neuer shared Type `SessionSignal` mit Erkennungslogik in `libs/types/src/session-signal.ts`
- Server-seitige Signal-Erkennung beim Session-Speichern (buildSessionSummary)
- Durchreichung ueber Session-List-Endpoint (inkl. Legacy-Fallback)
- Frontend-Badges: Gruenes Badge "Alle Phasen fertig" und violettes Badge "Frage offen"
- Violette Card-Border fuer Sessions mit offener Frage
- AGENTS.md aktualisiert mit QUESTION-Signal-Regel

### Logik:

- `ALL_PHASES_COMPLETE` wird nur in Orchestrator-Sessions erkannt (orchestratorRunId vorhanden)
- `QUESTION` wird in allen Sessions erkannt
- Signal wird automatisch zurueckgesetzt wenn neue Nachrichten geschrieben werden (buildSessionSummary wird bei saveSession aufgerufen)
- Erkennung erfolgt per Regex Word-Boundary-Match im letzten Assistant-Nachrichtentext
