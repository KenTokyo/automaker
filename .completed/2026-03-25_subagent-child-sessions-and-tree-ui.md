---
title: 'Sub-Agent Child-Sessions + Parent/Child-Baum in der Session-Liste'
description: 'Beim Start eines Sub-Agents wird jetzt eine echte Child-Session erstellt. Zusätzlich zeigt der Session-Manager Parent/Child-Beziehungen als klickbaren Baum an.'
date: 2026-03-25
status: success
effort: L
---

## Was wurde gemacht?

- **Server: echte Child-Session für Sub-Agent**
  - Bei `Task`-Tool-Aufruf wird eine Child-Session angelegt (oder wiederverwendet, falls schon vorhanden).
  - Verknüpfung über:
    - `sourceType: subagent`
    - `parentSessionId`
    - `parentToolUseId`
  - `subagent_started` enthält jetzt optional `childSessionId`.
  - Laufstatus von Child-Sessions wird während Sub-Agent-Laufzeit als `running` ausgewiesen.
  - Bei `subagent_stopped` wird die Child-Laufzeit abgeschlossen.

- **UI: Parent/Child-Baum**
  - Session-Manager rendert Sessions rekursiv als Baumstruktur.
  - Child-Sessions werden aus der Top-Ebene ausgeblendet und unter dem Parent angezeigt.
  - Das gilt auch innerhalb von Orchestrator-Gruppen.
  - Child-Sessions sind normal anklickbar und als `Sub-Agent` markiert.

- **Stabilität / Aktualisierung**
  - Session-Invalidierung reagiert jetzt auch auf `subagent_started` und `subagent_stopped`.
  - Projektgruppen berücksichtigen Eltern-Sessions, wenn ein Child in der sichtbaren Teilmenge liegt.
  - Orchestrator-Header nutzt Root-Sessions für Lead/Phase-Zählung, damit Sub-Agent-Children die Phase-Anzahl nicht verfälschen.

## Geänderte Dateien

- `apps/server/src/services/agent-service.ts`
- `apps/server/src/routes/sessions/routes/index.ts`
- `apps/ui/src/types/electron.d.ts`
- `apps/ui/src/hooks/use-electron-agent.ts`
- `apps/ui/src/hooks/use-query-invalidation.ts`
- `apps/ui/src/hooks/use-session-grouping.ts`
- `apps/ui/src/components/session-manager.tsx`
- `apps/ui/src/components/session-manager/project-group-section.tsx`
- `apps/ui/src/components/session-manager/session-list-item.tsx`

## Hinweise

- `npm run typecheck` wurde im Workspace ausgeführt und läuft grün.
