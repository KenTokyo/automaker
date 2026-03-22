---
title: Tasks/Fertig: Slider + Inhaltsvorschau
description: Schriftgröße in beiden Tabs steuerbar gemacht und Vorschau für Fertig-Karten eingebaut.
date: 2026-03-18
status: success
effort: M
files:
  - apps/ui/src/components/session-manager/tasks-panel.tsx
  - apps/ui/src/components/session-manager/task-card.tsx
  - apps/ui/src/components/session-manager/completed-tasks-panel.tsx
  - apps/ui/src/components/session-manager/completed-task-card.tsx
  - History/tasks-und-fertig-slider-markdown-vorschau-verlauf.md
tags: [ui, feature]
---

## Was wurde gemacht

- Im **Tasks-Tab** wurde ein Slider für die Schriftgröße ergänzt.
- Im **Fertig-Tab** wurde derselbe Slider ergänzt.
- Die gewählte Größe wirkt direkt auf die Task- und Fertig-Karten.
- In der **CompletedTaskCard** wurde ein zusätzlicher Ausklapp-Button neben dem Kopier-Button ergänzt.
- Beim Aufklappen sieht man den Karteninhalt direkt vor dem Kopieren.
- Die Zusammenfassung wird im Aufklappbereich als Markdown gerendert.

## Warum

- Du kannst Inhalte vor dem Kopieren erst in Ruhe lesen.
- Lange Aufgaben sind damit besser einschätzbar.
- Mit dem Slider bleibt die Anzeige auch bei kleinen Displays gut lesbar.

## Hinweise

- Die Schriftgrößen-Regler in Tasks/Fertig nutzen die bestehende globale Session-Schriftgröße (gleicher Wert in allen drei Bereichen).

## Checks

- UTF-8-Schnellscan in den geänderten UI-Dateien: keine typischen Fehlerzeichen.
- `npm run typecheck`: erfolgreich.

## Attempt

- Der erste UTF-8-Scan mit erweitertem Regex ist in PowerShell an Sonderzeichen gescheitert.
- Learning: Für PowerShell den robusten Kurz-Regex `(Ã|Â|ðŸ|â)` nutzen.
