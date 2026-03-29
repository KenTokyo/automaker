---
title: Sub-Agent-History kompakter und klare Klick-Logik
description: Leere Sub-Agent-Einträge werden kompakt gezeigt und nicht mehr als leerer Chat geöffnet
date: 2026-03-28
status: success
effort: L
provider: claude
files:
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/components/session-manager.tsx
  - docs/session-manager/tasks/2026-03-28-subagent-history-kompakt/2026-03-28-subagent-history-kompakt-MASTER-PLAN.md
  - docs/session-manager/tasks/2026-03-28-subagent-history-kompakt/2026-03-28-subagent-history-kompakt-PHASENPLAN.md
  - docs/session-manager/tasks/2026-03-28-subagent-history-kompakt/2026-03-28-subagent-history-kompakt-PERFORMANCE-TESTPLAN.md
  - docs/session-manager/tasks/2026-03-28-subagent-history-kompakt/2026-03-28-subagent-history-kompakt-EDGE-CASES.md
  - History/subagent-history-kompakt-klicklogik-verlauf.md
tags: [bugfix, ui, docs, performance]
---

## Zusammenfassung

Sub-Agent-Session-Karten in der History wurden so angepasst, dass sie weniger Platz brauchen und nicht mehr irreführend in leere Detailansichten führen.

### Was wurde gemacht

- Echte Sub-Agent-Erkennung in der Session-Row präzisiert:
  - `sourceType === 'subagent'`
  - Alt-Daten-Fallback über `parentToolUseId`
- Leere Sub-Agent-Einträge (`0 messages` + kein Preview) als eigener Zustand eingeführt.
- Klick auf leere Sub-Agent-Einträge deaktiviert, damit kein leerer Chat geöffnet wird.
- Sub-Agent-Karten kompakter gemacht (geringere Abstände, reduzierte Meta-Zeile).
- Klarer Hinweistext ergänzt: Ergebnis liegt im Eltern-Chat.
- Session-Manager-Markierung angepasst, damit manuelle Child-Sessions nicht fälschlich als Sub-Agent gelabelt werden.

### Wichtige Entscheidungen

- Nur leere Sub-Agent-Einträge sind nicht klickbar.
- Sub-Agent-Sessions mit Inhalt bleiben weiterhin normal zugänglich.
- Kein Backend-Umbau in dieser Aufgabe, um Risiko klein zu halten.

### Verifikation

- `npm run typecheck` erfolgreich.
