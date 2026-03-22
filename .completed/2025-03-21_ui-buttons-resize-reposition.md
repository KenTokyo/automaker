---
title: 'UI: Buttons verkleinert und New Session Button repositioniert'
description: 'Filter-Buttons im CompletedTasksPanel verkleinert und New Session Button nach links verschoben'
date: 2025-03-21
status: success
effort: S
files:
  - apps/ui/src/components/session-manager/completed-tasks-filter-bar.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
tags: [ui]
---

## Aenderungen

### CompletedTasksFilterBar

- Alle 4 Filter-Buttons (Tags, Status, Effort, Sort) von h-7 auf h-6 verkleinert
- Font-Groesse von text-xs auf text-[11px] reduziert
- Padding auf px-1.5 kompakter gemacht
- Icons von h-3 w-3 auf h-2.5 w-2.5 verkleinert

### InputControls - New Session Button

- Von ganz rechts nach ganz links verschoben (vor Model Selector)
- Zu Icon-Only Button gemacht (h-7 w-7, nur Plus-Icon)
- Behaelt gruenen Emerald-Style bei
