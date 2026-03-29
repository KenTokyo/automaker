---
title: FilesPanel Suche ignoriert Zeitfilter + zeigt Timestamps
description: Die Suche im FilesPanel durchsucht jetzt ALLE Dateien unabhaengig vom Zeitfilter und zeigt Erstellt/Geaendert-Datum an.
date: 2026-03-29
status: success
effort: M
files:
  - apps/server/src/services/markdown-explorer-service.ts
  - apps/ui/src/lib/http-api-client.ts
  - apps/ui/src/components/views/agent-view/components/files-panel/file-search.tsx
  - apps/ui/src/components/views/agent-view/components/files-panel/file-tree.tsx
  - apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx
tags: [feature, ui]
---

## Was wurde gemacht

### Backend (markdown-explorer-service.ts)

- `SearchResult` Interface um `modified`, `created`, `size` Felder erweitert
- `searchProject()` liefert jetzt stat-Daten (Timestamps, Groesse) fuer jede gefundene Datei
- Lazy stat-Abfrage: stat wird nur einmal pro Datei geladen und wiederverwendet

### Frontend (file-search.tsx)

- `sinceHours` Prop entfernt - Inhalt-Suche ignoriert den Zeitfilter komplett
- Suchlimit von 100 auf 200 erhoeht
- Erstellt-Datum (Kalender-Icon) und Geaendert-Datum (Stift-Icon) in Suchergebnissen
- Nutzt `formatSmartDate` fuer relative/absolute Datumsanzeige

### Frontend (file-tree.tsx)

- Bei aktiver Name-Suche wird ein ungefilterer Baum aus `allFiles` erstellt (ohne Zeitfilter/Limit)
- So findet die Suche auch Dateien die aelter sind als der Zeitfilter
- Auto-Expand nutzt ebenfalls den erweiterten Baum

### Frontend (files-panel.tsx)

- `sinceHours` Prop aus FileSearch-Aufruf entfernt
