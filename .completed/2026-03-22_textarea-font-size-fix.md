---
title: Textarea Font-Size verkleinert
description: Font-Size im Chat-Textarea angepasst fuer bessere Lesbarkeit
date: 2026-03-22
status: success
effort: S
files:
  - apps/ui/src/components/ui/textarea.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
tags: [ui]
---

## Aenderungen

### textarea.tsx (Base Component)

- `text-base md:text-sm` (16px Desktop / 14px Mobile) entfernt und durch `text-sm` (14px) als einheitlichen Default ersetzt
- Verhindert, dass die Base-Klasse spezifischere Overrides in Consumer-Komponenten ueberschreibt

### input-controls.tsx (Agent Chat Input)

- `text-[11px]` auf `!text-[13px] !leading-[1.45]` geaendert
- `!important` Modifier stellt sicher, dass der Wert nicht von Base-Klassen ueberschrieben wird
- Line-Height angepasst fuer bessere Lesbarkeit bei kompakter Schrift
