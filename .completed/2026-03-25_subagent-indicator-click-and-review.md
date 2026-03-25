---
title: 'Live-Sub-Agent-Indikator klickbar + Code-Review'
description: 'Ein Klick auf den laufenden Sub-Agent springt jetzt direkt in die Child-Session. Zusätzlich wurde ein Review gemacht und ein Hänge-Risiko bei Hintergrund-Sub-Agents behoben.'
date: 2026-03-25
status: success
effort: M
---

## Was wurde gemacht?

- Der Live-Indikator für Sub-Agents ist jetzt interaktiv:
  - Einträge mit `childSessionId` sind klickbar.
  - Klick öffnet direkt die passende Child-Session.
- Der Callback wurde sauber durchgereicht:
  - `AgentView` -> `ChatArea` -> `MessageList` -> `SubAgentIndicator`.
- Code-Review auf die Sub-Agent-Umsetzung durchgeführt.

## Gefundener Punkt aus dem Review (und direkt gefixt)

- Beim Parent-Stop oder bei einem Fehler konnten Hintergrund-Sub-Agents in seltenen Fällen als laufend hängen bleiben.
- Fix:
  - Serverseitig werden verbleibende Hintergrund-Sub-Agents beim Parent-Stop/Fehler jetzt beendet.
  - Für diese Fälle wird `subagent_stopped` emittiert, damit UI und Session-Status sauber aktualisieren.

## Geänderte Dateien

- `apps/ui/src/components/views/agent-view/sub-agent-indicator.tsx`
- `apps/ui/src/components/views/agent-view/components/message-list.tsx`
- `apps/ui/src/components/views/agent-view/components/chat-area.tsx`
- `apps/ui/src/components/views/agent-view.tsx`
- `apps/server/src/services/agent-service.ts`
- `History/subagent-parent-child-darstellung-verlauf.md`

## Checks

- `npm run typecheck`: erfolgreich (UI-Workspace).
- `npm run typecheck --workspace=apps/server`: nicht verfügbar (kein Script definiert).
- UTF-8-Schnellcheck auf geänderten Dateien: keine fehlerhaften Zeichenfolgen gefunden.
