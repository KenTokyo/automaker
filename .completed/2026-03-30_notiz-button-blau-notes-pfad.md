---
title: Notiz-Button blau + Pfad auf Notes/ geändert
description: Save-as-Markdown Button bekommt blauen leuchtenden Hintergrund. Speicherpfad von .automaker/docs/ auf Notes/ geändert. Prefix mit Aufgaben-Anweisung.
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/hooks/use-save-as-markdown.ts
tags: [ui, bugfix, feature]
---

## Was wurde gemacht

### Button-Styling (input-controls.tsx)

Der `FileDown`-Button (Notiz speichern) hat jetzt einen blauen Hintergrund mit Glow-Schatten statt dem alten dezenten Grün-Outline-Stil:

- `bg-blue-600 text-white border-blue-500`
- Hover: `hover:bg-blue-500`
- Schatten: `shadow-sm shadow-blue-600/50 hover:shadow-md hover:shadow-blue-500/60`
- Tooltip: "Notiz in Notes/ speichern"

### Speicherpfad (use-save-as-markdown.ts)

Von `.automaker/docs/` auf `Notes/` (direkt im Projektstamm) geändert.

- Alt: `{projectPath}/.automaker/docs/{fileName}`
- Neu: `{projectPath}/Notes/{fileName}`

### Prefix-Text

Nach dem Speichern wird der Input-Text ersetzt durch:

```
Meine Notizen: Notes/{dateiname}

Sollten in der Notiz Aufgaben stehen, bitte löse diese bzw. orientiere dich an den enthaltenen Aufgaben.
```
