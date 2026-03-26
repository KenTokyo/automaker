---
title: Reasoning-Level direkt im Model-Selector anzeigen
description: Das ausgewählte Reasoning-Level wird jetzt sichtbar neben dem Modellnamen im Selector angezeigt.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/settings-view/model-defaults/phase-model-selector.tsx
  - History/model-selector-reasoning-level-verlauf.md
tags: [ui, bugfix]
---

## Was wurde gemacht

- Der Model-Selector zeigt jetzt im geschlossenen Zustand zusätzlich das aktuelle Reasoning-Level in Klammern.
- Die Anzeige nutzt eine dezente Farbe (`text-muted-foreground`), damit der Fokus auf dem Modellnamen bleibt.
- Die Logik prüft, ob ein Codex-Modell mit aktivem Reasoning-Level ausgewählt ist.

## Warum

- Vorher war der Wert nur sichtbar, wenn man den Selector geöffnet hat.
- Jetzt sieht man den Zustand sofort und spart einen Klick.

## Attempts / Learning

1. `npm run type-check` war in diesem Repo nicht vorhanden.

- Learning: In diesem Projekt ist der korrekte Script-Name `npm run typecheck`.
