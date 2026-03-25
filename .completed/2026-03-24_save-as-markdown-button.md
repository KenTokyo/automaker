---
title: Save-as-Markdown Button in InputControls
description: Grüner Button neben dem Mikrofon-Icon, der Textarea-Inhalt als .md-Datei speichert
date: 2026-03-24
status: success
effort: M
files:
  - apps/ui/src/hooks/use-save-as-markdown.ts
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
tags: [feature, ui]
---

## Was wurde gemacht

1. **Neuer Hook** `use-save-as-markdown.ts` erstellt:
   - Generiert Dateinamen mit Zeitstempel (YYYY-MM-DD_HHmmss_notiz.md)
   - Erzeugt Markdown mit YAML-Frontmatter (title, date, type)
   - Speichert via `/api/fs/write` unter `.automaker/docs/`
   - Ersetzt den Input durch eine Pfad-Referenz

2. **Grüner Button** in `input-controls.tsx` eingefügt:
   - Links neben dem Mikrofon-Button platziert
   - Emerald/Grün gestylt mit Hover-Effekten
   - FileDown-Icon (Lucide)
   - Loader-Animation während des Speicherns
   - Deaktiviert wenn kein Text oder kein Projekt

## Wie es funktioniert

User tippt Text → klickt grünen Button → Text wird als `.automaker/docs/2026-03-24_143022_notiz.md` gespeichert → Textarea zeigt: `Meine Notizen: .automaker/docs/2026-03-24_143022_notiz.md` → KI muss die Datei mit Tool lesen
