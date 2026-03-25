---
title: FilePreview - Markdown-Rendering + Edit-Modus
description: FilePreview rendert Markdown-Dateien jetzt formatiert statt als Plain-Text. Edit-Button mit Textarea, Speichern und Keyboard-Shortcuts.
date: 2026-03-25
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view/components/files-panel/file-preview.tsx
tags: [feature, ui]
---

## Was wurde gemacht

### Markdown-Rendering

- Die FilePreview-Komponente erkennt jetzt Markdown-Dateien (.md, .mdx, .markdown)
- Markdown wird mit der bestehenden `Markdown`-Komponente (react-markdown + Syntax-Highlighting) gerendert statt als Plain-Text in einem `<pre>`-Tag
- Font-Sizes sind fuer das kleine Panel angepasst (xs/sm)
- Nicht-Markdown-Dateien werden weiterhin als Plain-Text angezeigt

### Edit-Modus

- Neuer Bearbeiten-Button (Bleistift-Icon) im Header
- Beim Klick wechselt die Ansicht zu einer Textarea fuer Raw-Markdown-Bearbeitung
- Speichern-Button (gruen) und Vorschau-Button (Auge) im Edit-Modus
- Keyboard-Shortcuts: Ctrl+S zum Speichern, Esc zum Abbrechen

### Speichern

- Speichert ueber die bestehende `writeFile` API
- Aktualisiert den Explorer-Store direkt, sodass die Vorschau sofort den neuen Inhalt zeigt
- Toast-Benachrichtigungen bei Erfolg/Fehler

### Sonstige Verbesserungen

- Zurueck-Button (Pfeil links) im Header fuer Navigation zurueck zur Dateiliste
- Edit-State wird beim Dateiwechsel automatisch zurueckgesetzt
