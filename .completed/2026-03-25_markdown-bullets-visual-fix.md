---
title: Schönere Listenpunkte im Markdown
description: Die Bullet-Punkte wurden optisch verbessert und mittiger ausgerichtet.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/ui/markdown.tsx
tags: [bugfix, ui]
---

## Was wurde gemacht

Die Darstellung von Bullet-Listen wurde in der Markdown-Komponente verbessert.

- Listenpunkte werden nicht mehr als Zeichen (`•`, `◦`, `▪`) gerendert.
- Stattdessen werden kleine Marker als CSS-Formen genutzt.
- Die Marker sind jetzt optisch mittiger zur ersten Textzeile ausgerichtet.
- Verschachtelte Ebenen bleiben klar unterscheidbar (gefüllt, Ring, klein eckig).

## Warum

Im Chat wirkten die Punkte unruhig und nicht sauber zentriert. Durch die neue Marker-Variante sieht die Liste ruhiger und hochwertiger aus.

## Checks

- `npm run typecheck` erfolgreich
- UTF-8 Schnellscan auf betroffene Dateien ohne Treffer
