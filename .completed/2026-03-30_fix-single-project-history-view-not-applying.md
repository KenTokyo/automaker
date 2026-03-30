---
title: Single-Project-Verlauf greift jetzt zuverlässig
description: Lokaler Safety-Filter ergänzt und Default für Single-Project-Historie auf an gesetzt
date: 2026-03-30
status: success
effort: L
provider: codex
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/hooks/use-settings-sync.ts
  - apps/ui/src/hooks/use-settings-migration.ts
  - apps/server/src/services/agent-service.ts
  - libs/types/src/settings.ts
tags: [bugfix, performance, ui]
---

## Zusammenfassung

Der Toggle war sichtbar aktiv, aber in der Session-Historie wurden weiterhin andere Projekte angezeigt. Damit das zuverlässig funktioniert, wurde ein zusätzlicher lokaler Schutz eingebaut und der Standardwert auf `an` gestellt.

### Was wurde gemacht

- `SessionManager` filtert bei aktivem Single-Project-Modus Sessions zusätzlich lokal auf das aktive Projekt.
- Projektpfade werden dafür normalisiert (Slash/Backslash, trailing slash, Groß-/Kleinschreibung), um Windows-Pfadabweichungen robust zu behandeln.
- Store-Default für `singleProjectHistoryView` auf `true` gesetzt, wenn noch kein Wert gespeichert ist.
- Settings-Hydration-Fallbacks auf `true` gesetzt.
- Globale Default-Settings auf `singleProjectHistoryView: true` gesetzt.
- Serverseitiger Session-Filter in `AgentService.listSessions` ebenfalls auf normalisierte Pfadvergleiche umgestellt.

### Wichtige Entscheidungen

- Die lokale Filterung ist ein Safety-Net: selbst bei altem Backend-Stand bleibt die UI korrekt.
- Der serverseitige Filter bleibt bestehen und spart zusätzlich Datenmenge, sobald der Backend-Stand aktuell ist.
- Der Modus ist standardmäßig an, bleibt aber weiterhin abschaltbar.

### Verifikation

- `npm run typecheck` erfolgreich.
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich.
