---
title: Datei-Limiter für FilesPanel eingebaut
description: Neuen MiniSelect mit Datei-Limit (10/20/50/100/150/200/Alle) im FilesPanel eingebaut
date: 2026-03-28
status: success
effort: M
files:
  - apps/ui/src/store/explorer-store.ts
  - apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx
tags: [feature, ui]
---

## Datei-Limiter im FilesPanel

### Was wurde gemacht?

- Neuen `fileLimit` State im Explorer Store eingebaut (mit LocalStorage-Speicherung)
- `rebuildTree` Pipeline erweitert: erst Zeitfilter, dann flache Liste sortieren, dann auf N limitieren, dann Baum bauen
- Neue `FILE_LIMIT_OPTIONS` definiert: Letzte 10, 20, 50, 100, 150, 200, Alle
- MiniSelect mit Hash-Icon in der FilesPanel Toolbar eingefügt
- Footer zeigt korrekt "X von Y Dateien" wenn limitiert

### Wichtig

- Das Limit wird VOR dem Baum-Bau angewendet, damit wirklich nur die Top-N nach dem gewählten Sortierkriterium übrig bleiben
- Standard ist "Alle" (0 = kein Limit)
- Die Einstellung wird im LocalStorage gespeichert und bleibt auch nach einem Neuladen erhalten
