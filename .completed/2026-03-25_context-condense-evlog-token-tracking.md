---
title: 'Kontext-Messung stabilisiert und EVLOG für AI-Calls integriert'
description: 'Codex-Token-Auslese erweitert, Lag-Warnungen aus dem Chat gefiltert und strukturierte EVLOG-Metriken für AI-Calls ergänzt.'
date: '2026-03-25'
status: 'done'
effort: 'medium'
---

## Zusammenfassung

Der Kontextverbrauch wird jetzt deutlich robuster aus echten Provider-Usage-Daten gelesen. Zusätzlich werden störende App-Server-Lag-Zeilen aus dem Chat-Ausgabestrom entfernt. Für AI-Calls wurde EVLOG-basierte Observability ergänzt, damit Token-, Tool- und Laufzeitdaten sauber nachvollziehbar sind.

## Umgesetzte Punkte

- Verbesserte Usage-Erkennung im Codex-CLI-Pfad (`codex-provider.ts`)
  - Mehr verschachtelte Usage-Felder
  - Unterstützung für Detailfelder (Cache/Reasoning)
  - Weitergabe der zuletzt erkannten Usage an Stream-Events
- Verbesserte Usage-Erkennung im Codex-SDK-Pfad (`codex-sdk-client.ts`)
- Robuster Filter für
  - `in-process app-server event stream lagged; dropped X event(s)`
  - auch in gemischten Textblöcken und Command-Outputs
- EVLOG-Observability für AI-Calls in `AgentService.sendMessage()`
  - `ai.model`, `ai.provider`
  - `ai.inputTokens`, `ai.outputTokens`, `ai.totalTokens`
  - `ai.cacheReadTokens`, `ai.cacheWriteTokens`, `ai.reasoningTokens`
  - `ai.toolCalls`, `ai.steps`
  - `ai.msToFirstChunk`, `ai.msToFinish`, `ai.tokensPerSecond`
  - Outcome-Felder für Erfolg/Fehler/Abbruch

## Technische Validierung

- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich

## Geänderte Dateien

- `apps/server/src/providers/codex-provider.ts`
- `apps/server/src/providers/codex-sdk-client.ts`
- `apps/server/src/services/agent-service.ts`
- `History/2026-03-25-context-condense-evlog-verlauf.md`
