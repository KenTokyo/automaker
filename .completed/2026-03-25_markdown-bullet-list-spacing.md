---
title: Bullet-Listen ohne Extra-Leerzeilen
description: Abstände in Markdown-Listen wurden komprimiert, damit keine unnötigen Zeilenumbrüche in Chat-Bubbles erscheinen.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [bugfix, ui]
---

## Was wurde gemacht

- Die Listen-Darstellung in der Markdown-Komponente wurde kompakter gesetzt.
- `li` nutzt jetzt `whitespace-normal` statt `whitespace-pre-wrap`.
- Vertikale Abstände zwischen Listeneinträgen sind jetzt bewusst klein und einheitlich.
- In den Chat-Bubbles wurde der gleiche Punkt umgesetzt, damit die Darstellung dort identisch ist.

## Warum

Bei Bullet-Listen war sichtbar zu viel Abstand. Das sah wie ein zusätzlicher Zeilenumbruch aus und machte den Text schwerer lesbar.

## Ergebnis

- Bullet-Listen wirken jetzt dicht und sauber.
- Kein unnötiger Extra-Umbruch zwischen Listeneinträgen.
- TypeScript-Check ist erfolgreich.
