---
title: Codex Kontext-Usage auf last-turn stabilisiert
description: Kumulative Token-Totals überschreiben die Kontextanzeige nicht mehr, last-turn-Usage wird priorisiert
date: 2026-03-30
status: success
effort: M
files:
  - apps/server/src/providers/codex-provider.ts
  - apps/server/src/providers/codex-sdk-client.ts
tags: [bugfix]
---

## Zusammenfassung

Die Kontextanzeige für Codex konnte in langen Chats auf Schätzung (`~`) zurückfallen, weil kumulative Token-Totals in manchen Payloads die turn-bezogene Usage verdrängt haben.

### Was wurde gemacht

- In beiden Codex-Ausführungswegen (`CLI` und `SDK`) wird jetzt explizit nach `last_token_usage`-Containern gesucht und dieser Wert bevorzugt.
- Im Codex-CLI-Stream wurde `turn.started` berücksichtigt, um turn-lokale last-Usage sauber zu führen.
- Bei `turn.completed` wird, wenn vorhanden, die turn-lokale last-Usage bevorzugt statt kumulativer Totals.

### Wichtige Entscheidungen

- Keine Änderung an UI-Schwellenwerten oder Auto-Condense-Triggern.
- Fix wurde bewusst im Provider umgesetzt, damit die UI wieder verlässliche Eingangsdaten bekommt.

### Verifikation

- `npm run typecheck` (UI) erfolgreich
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich
