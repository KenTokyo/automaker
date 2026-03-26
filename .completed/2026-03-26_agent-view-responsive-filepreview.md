---
title: Agent View responsive wrap + kompakte FilePreview
description: AgentHeader und InputControls bekommen flex-wrap. FilePreview komplett umgebaut zu schwebenden Thumbnails mit Lightbox.
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/file-preview.tsx
tags: [ui, refactor]
---

## Drei UI-Verbesserungen

1. **AgentHeader**: `flex-wrap` + `gap-y-1` auf den Container - Buttons brechen in neue Zeile um wenn Titel zu lang
2. **InputControls**: `flex-wrap` statt `overflow-x-auto` + `min-w-max` - Controls umbrechen in 2 Reihen
3. **FilePreview**: Komplett umgebaut
   - Weg: Header ("X files attached"), "Clear all" Button, Dateiname, Dateigröße
   - Neu: 40x40px schwebende Thumbnails, Hover-X-Button, Klick öffnet Lightbox-Overlay
   - Textdateien als kompakte Pills mit Icon
