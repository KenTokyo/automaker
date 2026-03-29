---
title: Sub-Agent-Indikator bleibt als Standalone-Block sichtbar
description: Sub-Agent-Verlauf bleibt bei Chat-Wechseln stabil und verschwindet nicht mehr sofort
date: 2026-03-27
status: success
effort: L
files:
  - apps/ui/src/hooks/use-electron-agent.ts
  - apps/ui/src/components/views/agent-view/sub-agent-indicator.tsx
  - apps/server/src/services/agent-service.ts
  - apps/ui/src/types/electron.d.ts
  - apps/ui/src/lib/http-api-client.ts
  - apps/ui/src/lib/electron.ts
  - History/subagent-indikator-standalone-block-verlauf.md
tags: [bugfix, ui, performance]
---

## Zusammenfassung

Der Sub-Agent-Block in der Chat-Mitte verschwand nach kurzem Schließen/Wechseln der Ansicht, weil die Daten nur im lokalen UI-State lagen. Jetzt bleibt der Block stabil sichtbar und zeigt auch abgeschlossene Sub-Agent-Läufe als Verlauf.

### Was wurde gemacht

- Sub-Agent-State im UI verbessert:
  - Status pro Eintrag eingeführt (`running` / `completed`).
  - Sessionbezogenen Cache ergänzt, damit kurzer View-Wechsel den Block nicht löscht.
  - Foreground-Sub-Agents werden bei Parent-`complete`/`stopped`/`error` als abgeschlossen markiert.
  - `subagent_stopped` entfernt Einträge nicht mehr sofort, sondern markiert sie als `completed`.
  - Abgeschlossene Einträge werden auf 12 begrenzt, damit die Liste leicht bleibt.
- Server-History erweitert:
  - `getHistory(sessionId)` liefert jetzt aktive Sub-Agents zurück.
  - Dadurch kann die UI laufende Sub-Agents nach Wiederöffnen zuverlässig rekonstruieren.
- Sub-Agent-Indikator visuell erweitert:
  - Header zeigt passend `aktiv` oder `ausgeführt`.
  - Laufende und fertige Einträge werden klar unterschieden.
  - Standalone-Block bleibt erhalten statt sofort auf `Thinking...` zurückzufallen.

### Warum so

- Rein lokaler Live-State ist bei großen UI-Views anfällig für Remounts.
- Mit History-Hydrierung plus Session-Cache bleibt der Zustand stabil.
- Die Begrenzung abgeschlossener Einträge schützt die Render-Performance.

### Checks

- `npm run typecheck` erfolgreich.
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich.
