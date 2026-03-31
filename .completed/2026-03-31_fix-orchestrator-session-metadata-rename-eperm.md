---
title: Fix Orchestrator Session-Metadata Rename EPERM
description: Atomic Writer retryt transiente Windows-Rename-Fehler beim Speichern von sessions-metadata.json
date: 2026-03-31
status: success
effort: M
files:
  - libs/utils/src/atomic-writer.ts
  - libs/utils/tests/atomic-writer.test.ts
  - History/orchestrator-next-phase-ready-eperm-verlauf.md
tags: [bugfix, performance, test]
---

## Zusammenfassung

Beim Orchestrator-Phasenwechsel konnte ein neuer Chat sporadisch mit `EPERM` abbrechen.
Die Ursache war ein transienter Dateisperr-Konflikt beim atomaren Rename von
`sessions-metadata.json.tmp.*` auf `sessions-metadata.json` unter Windows.

### Was wurde gemacht

- Retry-Logik mit kurzem Exponential-Backoff für Rename-Schritte ergänzt.
- Retry greift nur bei transienten Fehlercodes: `EPERM`, `EACCES`, `EBUSY`.
- Erfolgs- und Abbruchfall mit neuen Tests abgesichert:
  - Erfolg nach mehreren Rename-Retries.
  - Fehler nach maximalen Retries mit sauberem Cleanup.

### Wichtige Entscheidungen

- Lösung im `atomic-writer` statt nur im Orchestrator umgesetzt, damit alle atomaren JSON-Schreibpfade profitieren.
- Nicht-retrybare Fehler werden weiterhin sofort durchgereicht, damit echte Berechtigungsprobleme sichtbar bleiben.

### Verifikation

- `npx vitest run libs/utils/tests/atomic-writer.test.ts`
- `npm run build --workspace=@automaker/utils`
- `npm run typecheck`
