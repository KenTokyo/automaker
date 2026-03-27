---
title: Fix newline rendering in Kanban task descriptions
description: Added whitespace-pre-wrap CSS class to task description rendering so line breaks are preserved
date: 2026-03-26
status: success
effort: S
files:
  - apps/kanban-web/src/components/session-manager/kanban-task-card.tsx
  - apps/ui/src/components/session-manager/kanban-task-card.tsx
tags: [bugfix, ui]
---

## Problem

Zeilenumbrüche (Enter/Shift+Enter) in Kanban-Task-Beschreibungen wurden nicht korrekt gerendert. HTML `<p>` Tags kollabieren standardmäßig alle Whitespace-Zeichen zu einzelnen Leerzeichen.

## Lösung

Tailwind-Klasse `whitespace-pre-wrap` zu allen Description-Renderings hinzugefügt (gleich wie es beim Summary-Feld bereits korrekt implementiert war).

## Geänderte Stellen

- **kanban-web/kanban-task-card.tsx** Zeile 178: Expanded description
- **apps/ui/kanban-task-card.tsx** Zeile 282: Collapsed preview (line-clamp-3)
- **apps/ui/kanban-task-card.tsx** Zeile 325: Expanded full description

## Ursache

Das `summary`-Feld hatte bereits `whitespace-pre-wrap`, aber das `description`-Feld nicht. Die Daten wurden korrekt in Supabase gespeichert (mit `\n`), nur die Darstellung war fehlerhaft.
