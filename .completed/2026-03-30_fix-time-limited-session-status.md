---
title: Time-Limited Session Status eingeführt
description: Zeitlimit-Stopps werden jetzt als eigener Session-Status dargestellt und von manuellen Stopps getrennt
date: 2026-03-30
status: success
effort: M
provider: codex
files:
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/agent/routes/stop.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - apps/ui/src/hooks/use-electron-agent.ts
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/components/session-manager/orchestrator-run-header.tsx
  - apps/ui/src/lib/http-api-client.ts
  - apps/ui/src/lib/electron.ts
  - apps/ui/src/lib/session-utils.ts
  - apps/ui/src/types/electron.d.ts
  - libs/types/src/session.ts
tags: [bugfix, ui]
---

## Zusammenfassung

Der Time-Limiter hat zwar technisch gestoppt, aber die Session wurde in der Historie nur als
`Gestoppt` angezeigt. Dadurch war nicht klar unterscheidbar, ob ein User gestoppt hat oder ob
das Zeitlimit gegriffen hat.

### Was wurde gemacht

- Neuer Stop-Grund eingeführt: `time_limit` (neben `manual`).
- Stop-Route akzeptiert jetzt optional `reason`.
- Agent-Service speichert `stopReason` in den Session-Metadaten.
- Session-Status-Mapping ergänzt:
  - `time_limit` -> `time_limited`
  - `manual` -> `stopped`
- Time-Limiter sendet jetzt explizit `stopExecution('time_limit')`.
- UI erweitert:
  - Session-Liste zeigt `Zeitlimit` als eigenes Badge/Farbzustand.
  - Orchestrator-Run-Header berücksichtigt `time_limited`.
- Runtime-Validator und Typen erweitert (`time_limited`, `stopReason`).

### Wichtige Entscheidungen

- Der Stop-Grund wird im Backend gespeichert (nicht nur im UI), damit die Statusanzeige robust
  bleibt und auch nach Daten-Neuladen korrekt ist.
- `time_limited` ist ein eigener Status, statt `stopped` mit Text-Hack, damit Filter/Styles
  eindeutig bleiben.

### Verifikation

- `npm run typecheck` erfolgreich (UI).
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich.
