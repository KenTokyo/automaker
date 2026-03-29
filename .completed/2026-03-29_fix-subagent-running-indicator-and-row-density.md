---
title: Fix Sub-Agent Running Indicator and Compact Row Layout
description: Sub-Agent-Karten zeigen nur noch aktiven Status bei aktivem Parent; Meta-Zeile wurde verdichtet
date: 2026-03-29
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/components/session-manager/session-list-item.tsx
tags: [bugfix, ui]
---

## Zusammenfassung

Die Sidebar zeigte bei Sub-Agents teilweise dauerhaft "läuft", obwohl der Parent-Task bereits durch war. Außerdem war die Sub-Agent-Karte durch eine untere Meta-Zeile zu voll.

### Was wurde gemacht

- Running-Status für Session-Liste normalisiert: Sub-Agent wird nur als laufend behandelt, wenn Parent ebenfalls aktiv ist.
- Projektgruppen-Rendering auf dasselbe Running-Set umgestellt, damit "laufend" nicht aus stale Statusdaten kommt.
- Sub-Agent-Meta-Zeile unten entfernt und die Updated-Zeit nach oben in die Titelzeile verschoben.

### Wichtige Entscheidungen

- Safety-Net in UI statt ausschließlich auf Backend-Events zu vertrauen.
- Kompaktere Darstellung für Sub-Agent-Karten, weil Parent-Kontext bereits bekannt ist.

### Validierung

- TypeScript erfolgreich geprüft mit `npm run typecheck`.
