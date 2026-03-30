---
title: Single-Project-History-View für bessere Session-Performance
description: Option eingebaut, um in der Historie nur das aktive Projekt zu laden und anzuzeigen
date: 2026-03-30
status: success
effort: XL
provider: codex
files:
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - apps/ui/src/lib/http-api-client.ts
  - apps/ui/src/lib/electron.ts
  - apps/ui/src/types/electron.d.ts
  - apps/ui/src/lib/query-keys.ts
  - apps/ui/src/hooks/queries/use-sessions.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/hooks/use-settings-sync.ts
  - apps/ui/src/hooks/use-settings-migration.ts
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/hooks/use-agent-session.ts
  - apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx
  - libs/types/src/settings.ts
  - libs/types/dist/settings.d.ts
  - libs/types/dist/settings.js
tags: [feature, ui, performance]
---

## Zusammenfassung

Die Session-Historie hat bisher projektübergreifend geladen und gerendert. Bei vielen Sessions in mehreren Projekten kann das im linken Panel zu spürbarem Lag führen.

### Was wurde gemacht

- Backend-Filter ergänzt: `/api/sessions` akzeptiert jetzt optional `projectPath`.
- AgentService kann Sessions optional nach Projektpfad filtern.
- UI-Query-Key und Session-Hook wurden auf projektbezogene Abfragen erweitert.
- Zustand-Store um `singleProjectHistoryView` erweitert (inkl. Persistenz in localStorage).
- Settings-Sync und Migration um das neue Feld ergänzt, damit Client und Server konsistent bleiben.
- In den Projekt-Einstellungen wurde ein neuer Toggle ergänzt:
  - `Single-Project-Verlauf`
  - `Nur aktuelles Projekt in der Historie anzeigen`
- SessionManager lädt bei aktivem Toggle nur Sessions des aktiven Projekts.
- AgentView nutzt ebenfalls projektbezogenes Session-Scoping für Orchestrator-Kontext.
- Typdefinitionen in `libs/types` wurden um die neuen Settings-Felder ergänzt (inkl. dist-Typen).

### Wichtige Entscheidungen

- Der Filter wurde serverseitig eingeführt, damit nicht erst alle Sessions geladen und dann im UI weggefiltert werden.
- Der Schalter ist optional (Default `false`), damit vorhandene Workflows nicht erzwungen umgestellt werden.
- Query-Invalidierung wurde auf einen robusten Prefix-Fallback (`['sessions']`) angepasst, damit scoped und unscoped Session-Queries zuverlässig aktualisiert werden.

### Verifikation

- `npm run typecheck` erfolgreich.
