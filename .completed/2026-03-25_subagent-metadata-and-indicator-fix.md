---
title: 'Sub-Agent Anzeige stabilisiert und Session-Metadaten erweitert'
description: 'Hintergrund-Sub-Agents bleiben sichtbar, bis echte Stop-Events kommen. Zusätzlich wurden Parent/Source-Felder für Sessions in Backend und Frontend eingeführt.'
date: 2026-03-25
status: success
effort: M
---

## Was wurde gemacht?

- **Anzeige-Fix im Chat:**
  - In `use-electron-agent.ts` werden Sub-Agents bei `complete` und `stopped` nicht mehr komplett geleert.
  - Nur nicht-Hintergrund-Agents werden entfernt.
  - Hintergrund-Agents bleiben sichtbar, bis `subagent_stopped` eintrifft.

- **Datenmodell erweitert (Basis für Parent/Child):**
  - Neue Session-Felder:
    - `sourceType` (`manual`, `orchestrator`, `subagent`)
    - `parentSessionId`
    - `parentToolUseId`
  - Backend:
    - `AgentService.createSession()` kann diese Felder speichern.
    - Session-List-Route liefert die Felder an die UI aus.
    - Session-Create-Route akzeptiert die Felder.
  - Frontend:
    - Typen (`SessionListItem`, Sessions API) erweitert.
    - API-Client (`sessions.create`) kann die Felder senden.
    - Session-Validation erhält und validiert die Felder.

## Ergebnis

- Sichtbarkeit von laufenden Hintergrund-Sub-Agents ist stabiler.
- Parent/Child-Verknüpfungen sind jetzt im Datenmodell vorbereitet.
- TypeScript-Check läuft ohne Fehler.

## Geänderte Dateien

- `apps/ui/src/hooks/use-electron-agent.ts`
- `apps/server/src/services/agent-service.ts`
- `apps/server/src/routes/sessions/routes/create.ts`
- `apps/server/src/routes/sessions/routes/index.ts`
- `apps/ui/src/types/electron.d.ts`
- `apps/ui/src/lib/http-api-client.ts`
- `apps/ui/src/lib/electron.ts`
- `apps/ui/src/lib/session-utils.ts`
