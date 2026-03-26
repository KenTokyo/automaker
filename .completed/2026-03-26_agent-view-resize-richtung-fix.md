---
title: Agent-View Resize-Richtung stabilisiert
description: Resize-Handles im Agent-View verhalten sich nach Panel-Toggles jetzt konsistent.
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view.tsx
  - History/panel-resize-richtung-fix-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Der Agent-View hatte ein instabiles Resize-Verhalten, sobald linke/rechte Panels ein- oder ausgeblendet wurden.

### Was wurde gemacht

- Stabile Panel-Reihenfolge mit `order` in der horizontalen Hauptaufteilung gesetzt.
- Feste IDs für die beiden Handle-Komponenten ergänzt.
- `autoSaveId` nach sichtbarer Panel-Kombination getrennt (`left-chat-right`, `left-chat`, `chat-right`, `chat-only`).
- Chat-Panel-Default pro Layout-Variante auf sinnvolle Werte gestellt.

### Wichtige Entscheidung

- Kein großer Umbau am Layout.
- Stattdessen ein gezielter Stabilitäts-Fix entlang der Empfehlung der genutzten Resize-Bibliothek für dynamische Panels (`id`/`order`).

### Validierung

- `npm run typecheck` erfolgreich.
- UTF-8-Schnellcheck auf der geänderten UI-Datei ohne Treffer.
