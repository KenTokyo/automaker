---
title: Queue Display Expand/Collapse Feature
description: Queue Items expandierbar mit vollem Text und Scrollbar
date: 2026-03-29
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/input-area/queue-display.tsx
tags: [feature, ui]
---

## Queue Display Expand/Collapse

Jedes Queue-Item hat jetzt einen Chevron-Pfeil und kann per Klick aufgeklappt werden.
Im expandierten Zustand wird der volle Prompt-Text in einem scrollbaren Container (max-h-48 = 192px) angezeigt.
Nochmaliger Klick klappt das Item wieder zu.

Texte wurden auf Deutsch umgestellt (Warteschlange, Alle entfernen etc.).
