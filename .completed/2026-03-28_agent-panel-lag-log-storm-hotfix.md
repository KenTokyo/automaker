---
title: Agent Panel Lag durch Log-Storm entlastet
description: Hochfrequente Stream-Logs und Event-Timestamps wurden gedrosselt, damit das Agent-Panel bei parallelen Sessions flüssiger bleibt
date: 2026-03-28
status: success
effort: M
files:
  - apps/ui/src/lib/http-api-client.ts
  - apps/ui/src/hooks/use-electron-agent.ts
  - apps/ui/src/hooks/use-event-recency.ts
  - apps/ui/src/hooks/use-settings-sync.ts
  - History/agent-panel-lag-verlauf.md
tags: [bugfix, performance, ui]
---

## Zusammenfassung

Im Agent-Panel gab es bei parallelen Chats starke Verzögerungen. Die übergebene Konsole zeigte sehr viele `agent:stream`-Events und gleichzeitig sehr viele `INFO`-Logs im Frontend. Dadurch wurde der Main-Thread spürbar belastet.

### Was wurde gemacht

- In `http-api-client.ts` den WebSocket-`onmessage`-Pfad entlastet:
  - Kein `info`-Log mehr für jedes einzelne Event.
  - Dispatch-Log nur noch als `debug` und nur wenn Callbacks vorhanden sind.
- In `use-electron-agent.ts` die hochfrequenten Stream-Logs (`Ignoring event`, `Stream event`, `Tool use`, `queue_updated`, Sub-Agent-Status) von `info` auf `debug` gestellt.
- In `use-event-recency.ts` eine Drosselung (`500ms`) eingebaut, damit bei Event-Stürmen nicht bei jedem Event ein Store-Update geschrieben wird.
- In `use-settings-sync.ts` häufige Sync-Info-Logs auf `debug` gestellt.

### Warum so

- Die Konsole selbst kann bei sehr vielen Einträgen ein echter Performance-Killer sein, besonders wenn DevTools offen sind.
- Die Änderungen reduzieren Last im heißen Pfad, ohne das Verhalten der Features zu ändern.

### Verifikation

- TypeScript-Check erfolgreich: `npm run typecheck`
