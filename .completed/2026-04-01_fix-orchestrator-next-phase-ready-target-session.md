---
title: Fix Orchestrator NEXT_PHASE_READY target session routing
description: Auto-Folgephase wird jetzt strikt in die erzeugte Ziel-Session gesendet und auf den aktiven Run begrenzt
date: 2026-04-01
status: success
effort: M
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/hooks/use-agent-shortcuts.ts
  - docs/orchestrator/tasks/2026-04-01-next-phase-ready-neuer-chat-fix.md
  - History/orchestrator-next-phase-ready-falscher-chat-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

`NEXT_PHASE_READY` wurde zwar erkannt, aber in Grenzfällen lief der Auto-Send in den falschen Chat.
Die Ursache war fehlende Ziel-Session-Bindung plus zu breite globale Completion-Filterung.

### Was wurde gemacht

- `SessionManager` Quick-Create gibt jetzt ein strukturiertes Ergebnis zurück:
  - `{ success, sessionId }`
- Orchestrator in `agent-view.tsx`:
  - speichert beim Erzeugen der Folgephase die konkrete `targetSessionId`
  - sendet erst, wenn exakt diese Session aktiv ist
  - räumt Source/Target-Refs nach Erfolg oder Fehler sauber auf
- Globaler Completion-Listener:
  - reagiert nicht mehr auf alle Projekt-Sessions
  - erlaubt nur aktive Session oder Sessions aus dem aktiven Orchestrator-Run

### Wichtige Entscheidungen

- Session-ID-basierte Bindung statt indirekter Heuristik (`currentSessionId !== sourceSessionId`), weil das in Mehr-Chat-Szenarien nicht eindeutig genug ist.
- Run-basierte Filterung im globalen Listener, damit Background-Flow bleibt, aber Cross-Chat-Trigger vermieden werden.

### Hinweise

- Verifikation erfolgte über `npm run typecheck`.
- Der Fix adressiert gezielt die Fehlroute beim Folge-Send und die Trigger-Entkopplung zwischen parallelen Chats.
