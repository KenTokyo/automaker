---
title: Markdown Explorer Lite Extension
description: Neue leichte App mit nur Completed-Ansicht, Markdown Explorer und schlankem Input zum Speichern von Markdown-Dateien.
date: 2026-03-21
status: success
effort: M
files:
  - apps/markdown-explorer-extension/src/chat-layout.tsx
  - apps/markdown-explorer-extension/src/components/markdown-explorer-lite-view.tsx
  - apps/markdown-explorer-extension/src/components/markdown-lite-input.tsx
  - apps/markdown-explorer-extension/package.json
  - apps/markdown-explorer-extension/src/electron/constants.ts
  - apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx
  - apps/ui/src/components/session-manager/completed-tasks-panel.tsx
  - History/markdown-explorer-lite-extension-verlauf.md
tags: [extension, markdown-explorer, completed, input, lightweight]
---

## Was wurde gemacht

- Neue App `apps/markdown-explorer-extension` als leichte Variante erstellt.
- UI auf drei Kernteile reduziert:
  - `Completed`-Bereich
  - `Markdown Explorer`
  - `Input` mit `Save Doc` und `Clear`
- Kein Model-Selector, kein Thinking/MCP, kein Settings-Panel im aktiven Pfad.

## Wichtige Details

- `Save Doc` erstellt Markdown-Dateien im Projektordner unter `History`.
- Dateiname wird aus der ersten sinnvollen Textzeile + Zeitstempel gebaut.
- Nach dem Speichern wird der Zielpfad in die Zwischenablage kopiert.
- Anhänge (Bilder/Textdateien) bleiben im Input möglich.

## Stabilität

- Explorer-Laden hat jetzt einen Timeout und einen klaren Fallback.
- In der Lite-Ansicht erscheint bei zu langem Laden ein Hinweis mit Reload-Knopf.

## Checks

- `npm run typecheck --workspace=apps/markdown-explorer-extension` erfolgreich.
- `npm run typecheck --workspace=apps/ui` erfolgreich.
- UTF-8-Schnellscan ausgeführt; in den betroffenen Dateien keine auffälligen Treffer.
