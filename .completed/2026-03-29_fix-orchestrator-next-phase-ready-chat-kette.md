---
title: Orchestrator startet Folgechat bei NEXT_PHASE_READY wieder zuverlässig
description: Catch-up-Trigger, erzwungene Neusession und korrekte Systemprompt-Übergabe im Orchestrator-Flow
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view.tsx
  - History/orchestrator-next-phase-ready-neuer-chat-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Der Orchestrator hat in bestimmten Situationen keinen neuen Folgechat gestartet, obwohl `NEXT_PHASE_READY` sichtbar war.
Die Trigger- und Übergabelogik wurde in `agent-view.tsx` stabilisiert, damit die Phasenkette robust weiterläuft.

### Was wurde gemacht

- Zentrale Helferfunktion für den Phasenwechsel eingebaut (`triggerOrchestratorPhaseContinuation`).
- Doppelte Trigger pro Session/Nachricht verhindert (Message-Key-Guard).
- Catch-up-Flow ergänzt: Wenn Orchestrator aktiviert ist und die letzte Assistant-Nachricht bereits `NEXT_PHASE_READY` enthält, startet die nächste Phase ohne neuen Processing-Zyklus.
- Session-Erstellung im Orchestrator-Flow auf sichere Neuanlage umgestellt:
  - `attachOrchestratorRunId: true`
  - `forceCreate: true`
  - `sourceType: 'orchestrator'`
- Fehlerbehandlung ergänzt, falls Session-Erstellung fehlschlägt oder SessionManager nicht verfügbar ist.
- Auto-Send übergibt jetzt wieder eingebettete Systemprompts (`embedSystemPrompts`) statt nacktem Content.

### Wichtige Entscheidungen

- Catch-up wurde zusätzlich zum bestehenden „processing complete“-Trigger eingebaut, statt den alten Trigger zu ersetzen.
  So bleibt der bisher stabile Standardpfad erhalten und der neue Pfad löst nur die verpassten Fälle.
- Bei Erstellungsfehlern wird der Message-Key-Guard wieder freigegeben, damit ein späterer Retry möglich bleibt.
- Die Lösung bleibt im bestehenden `agent-view.tsx`, damit der Datenfluss an einer Stelle nachvollziehbar bleibt.
