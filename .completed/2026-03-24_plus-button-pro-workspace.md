---
title: Plus-Button pro Workspace in Sidebar
description: Grüner Plus-Button neben jedem Projekt-Namen in der Sidebar, der direkt einen neuen Chat in diesem Workspace erstellt.
date: 2026-03-24
status: success
effort: S
files:
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/components/session-manager.tsx
tags: [feature, ui]
---

## Was wurde gemacht

1. **ProjectGroupSection** erweitert: Neuer grüner Plus-Button rechts neben dem Projektnamen (erscheint bei Hover).
2. **SessionManager** erweitert: Neue Funktion `handleNewSessionForProject` erstellt, die eine Session für ein beliebiges Projekt erstellt (nicht nur das aktive). Wiederverwendet leere Sessions wenn möglich.
3. Beim Klick wird das Projekt automatisch gewechselt und ein neuer Chat geöffnet.

## Technische Details

- Button nutzt `opacity-0 group-hover/project-header:opacity-100` für sauberen Hover-Effekt
- Emerald-Farbe (grün) für den Plus-Button
- `stopPropagation()` verhindert, dass das Projekt-Accordion gleichzeitig togglet
- Session-Erstellung nutzt existierende Muster (empty session reuse, generateRandomSessionName)
- `onSelectSession` mit `sessionProjectPath` sorgt für automatischen Projekt-Wechsel im Agent-View
