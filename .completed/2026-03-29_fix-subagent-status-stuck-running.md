---
title: "Fix: Sub-Agent Status bleibt ewig auf 'laeuft' stecken"
description: Sub-Agents wurden nie als fertig markiert wenn Provider-Errors auftraten. Zusaetzlich Safety-Net Cleanup hinzugefuegt.
date: 2026-03-29
status: success
effort: M
files:
  - apps/server/src/services/agent-service.ts
tags: [bugfix, performance]
---

## Root Cause

In `agent-service.ts` fehlte der Aufruf von `finalizeForegroundSubagents()` und `finalizeBackgroundSubagentsAfterParentStop()` im Provider-Error-Pfad (Zeile ~1107). Wenn ein Provider-Fehler auftrat (Rate Limit, Network Error etc.), blieben Sub-Agent-Eintraege fuer immer in der `activeSubagentSessions` Map.

Die Session-List API (`GET /sessions`) berechnet den Status dynamisch:

```ts
const isRunning = runningSessionIds.has(s.id) || runningSubagentSessionIds.has(s.id);
```

Da `runningSubagentSessionIds` aus der nie-aufgeraeumten Map kam, zeigten Sub-Agents ewig "laeuft" mit laufendem Timer an.

## Fixes

### 1. Fehlender Cleanup im Error-Pfad

`finalizeForegroundSubagents()` und `finalizeBackgroundSubagentsAfterParentStop()` werden jetzt auch im Provider-Error-Handler aufgerufen (nach `accumulateElapsedTime`).

### 2. Safety Net - Stale Subagent Cleanup

Neue Methode `cleanupStaleSubagentSessions()` die bei jedem Session-List-Request automatisch prueft:

- Ob der Parent noch laeuft (wenn nicht -> Subagent-Eintrag entfernen)
- Ob der Subagent aelter als 30 Minuten ist (absoluter Timeout)
- Emittiert `subagent_stopped` Events damit die UI sofort aktualisiert

Dies ist ein **doppeltes Sicherheitsnetz** - selbst wenn der normale Cleanup-Pfad aus irgendeinem Grund versagt, werden verwaiste Sub-Agents beim naechsten UI-Polling bereinigt.
