---
title: Kontext-Token Anzeige auf letzten Chat-Stand korrigiert
description: Falsche Gesamt-Summen bei der Kontextanzeige behoben und Plausibilitäts-Schutz ergänzt
date: 2026-03-26
status: success
effort: M
files:
  - apps/server/src/providers/codex-provider.ts
  - apps/server/src/providers/codex-sdk-client.ts
  - apps/ui/src/components/views/agent-view.tsx
  - History/context-token-anzeige-repariert-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Die Kontextanzeige konnte in einzelnen Chats zu große Token-Werte anzeigen.
Dadurch wurde ein aufsummierter Gesamtwert als aktueller Chat-Kontext dargestellt.

### Was wurde gemacht

- Usage-Auswertung in den Codex-Providern angepasst:
  - `last_token_usage` wird jetzt vor `total_token_usage` priorisiert.
- Anzeige-Logik im Agent-View robust gemacht:
  - Unplausibel hohe Messwerte (deutlich über Fenstergröße) werden verworfen.
  - In dem Fall wird auf die bestehende Schätzung zurückgefallen.
- Verlauf für den aktuellen Chat dokumentiert.

### Wichtige Entscheidungen

- Orientierung an Codex-Referenz:
  - Kontextfenster soll den letzten Turn-Stand zeigen, nicht die aggregierte Gesamtnutzung.
- Kein großer Umbau im Datenmodell:
  - gezielter Fix mit kleinem Risiko und klarer Wirkung in der UI.

### Verifikation

- `npm run typecheck` erfolgreich.
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich.
- UTF-8-Schnellcheck auf den geänderten Dateien ohne fehlerhafte Zeichen.
