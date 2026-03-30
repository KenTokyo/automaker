---
title: Orchestrator NEXT_PHASE_READY Trigger fix
description: Der Trigger prüft nach Chat-Ende zuverlässig die finale Assistant-Nachricht und startet Folgephasen wieder stabil
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view.tsx
tags: [bugfix, ui]
---

## Zusammenfassung

Der Orchestrator hat in manchen Fällen `NEXT_PHASE_READY` nicht erkannt, obwohl es am Ende der Antwort stand.
Die Ursache war ein Timing-Rennen: Der Completion-Check lief manchmal, bevor die finale Assistant-Nachricht vollständig im UI-State angekommen war.

### Was wurde gemacht

- In `agent-view.tsx` eine robuste Fallback-Logik ergänzt, die bei Bedarf die finale Session-History direkt über `agent.getHistory(...)` nachlädt.
- Den Trigger-Check so erweitert, dass er nach einem `processing true -> false` Übergang nicht nur den lokalen Message-State verwendet.
- Einen kurzen Retry-Mechanismus eingebaut (3 Versuche mit kleinem Delay), damit der Trigger auch bei verzögertem Persistieren stabil bleibt.
- Zusätzlich abgesichert: Bei `stopped` oder `error` wird keine automatische Folgephase gestartet.
- Zusätzlich einen projektbezogenen Global-Listener auf `complete`-Stream-Events ergänzt, damit Folgephasen auch im Hintergrund starten (ohne Session-Klick).

### Wichtige Entscheidungen

- Kein Klick-basierter Trigger mehr: Die Logik bleibt an das tatsächliche Ende der Verarbeitung gebunden.
- Fallback über History statt aggressiver Polling-Loops: weniger Seiteneffekte, aber deutlich robuster gegen Race-Conditions.

### Hinweise

- Der Fix adressiert gezielt die Erkennung der finalen Nachricht bei Chat-Ende.
- Der Hintergrund-Trigger ist bewusst auf Sessions des aktuell geöffneten Projekts begrenzt, um projektfremde Trigger zu vermeiden.
