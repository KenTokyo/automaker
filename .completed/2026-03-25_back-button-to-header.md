---
title: Zurück-Button von Footer nach Header verschoben
description: Der Zurück-zur-Liste-Button wurde vom Footer in den Header der Dateivorschau verschoben.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/files-panel/file-preview.tsx
  - apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx
tags: [ui, cleanup]
---

## Was wurde gemacht

- Der "Zurück zur Liste"-Button war unten im Footer der FilePreview platziert - unpraktisch, weil man erst nach unten scrollen musste.
- Button wurde nach oben in den Header der FilePreview verschoben, direkt links neben den Dateinamen.
- Neuer Button nutzt ein ArrowLeft-Icon (lucide-react) mit hover-Effekt.
- Der alte Footer-Button in FilesFooter gibt jetzt `null` zurück wenn die Vorschau aktiv ist.
- Keine TypeScript-Fehler.
