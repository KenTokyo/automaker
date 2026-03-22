---
title: Markdown in Fertig-Karte und Chat sauber rendern
description: Listen, Tabellen und verschachtelte Inhalte werden nun stabil in CompletedTaskCard und Message Bubble angezeigt.
date: 2026-03-18
status: success
effort: M
files:
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
  - apps/ui/src/components/session-manager/completed-task-card.tsx
tags: [ui, bugfix]
---

## Was wurde gemacht

Der Markdown-Baustein wurde so angepasst, dass Listen und Tabellen wieder zuverlässig erkannt und dargestellt werden.
Dazu wurde die Zeilenumbruch-Vorverarbeitung entfernt, die bei manchen Inhalten Markdown-Strukturen zerstört hat.

Zusätzlich wurden die Listen-Styles (Punkte/Nummern, Einrückung, verschachtelte Ebenen) explizit gesetzt.
Für Tabellen gibt es jetzt einen stabilen Wrapper mit horizontalem Scroll, damit Inhalte auch in schmalen Karten lesbar bleiben.

## Änderungen im Detail

- `apps/ui/src/components/ui/markdown.tsx`
  - Vorverarbeitung mit `<br>` entfernt.
  - Listen-Styles und verschachtelte Listen klar definiert.
  - Tabellen in einen scrollbaren Wrapper gelegt.
- `apps/ui/src/components/views/agent-view/components/message-bubble.tsx`
  - Markdown-Klassen für Listen und Zeilenumbrüche verbessert.
- `apps/ui/src/components/session-manager/completed-task-card.tsx`
  - Aufgeklappte Markdown-Vorschau für Listen/Nummerierung nachgeschärft.

## Checks

- UTF-8-Check auf betroffene Dateien: keine defekten Zeichen gefunden.
- `npm run typecheck`: erfolgreich.

## Attempt/Problem + Learning

- Problem: Der lange Regex aus der Dokumentation erzeugte in PowerShell einen Parse-Fehler.
- Learning: Für PowerShell den robusten Kurz-Regex `(Ã|Â|ðŸ|â)` nutzen und danach auf die geänderten Dateien einschränken.
