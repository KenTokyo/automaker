---
title: 'Session-Sidebar: Projekt-Gruppierung und UI-Verkleinerung'
description: 'Sessions nach Projekt gruppiert in Baumstruktur, Header-Buttons verkleinert, Delete-Old-Sessions Dialog'
date: 2026-03-21
status: success
effort: L
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/session-manager/session-manager-header.tsx
  - apps/ui/src/components/session-manager/session-search-input.tsx
  - apps/ui/src/components/session-manager/project-filter-dropdown.tsx
  - apps/ui/src/components/session-manager/session-time-filter-dropdown.tsx
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/hooks/use-project-grouping.ts
  - apps/ui/src/components/dialogs/delete-old-sessions-dialog.tsx
tags: [feature, ui, refactor]
---

## Aenderungen

### 1. Projekt-Gruppierung (Baumstruktur)

- Sessions werden jetzt nach Projekt gruppiert und alphabetisch sortiert
- Jedes Projekt ist ein aufklappbarer Baumknoten mit Folder-Icon und Session-Count
- Initial werden nur 3 Sessions pro Projekt angezeigt
- "Mehr anzeigen" Button laedt 10 weitere Sessions
- Aktuelles Projekt wird automatisch aufgeklappt

### 2. UI-Verkleinerung

- Alle Top-Tabs (Sessions, Fertig, Docs, Uebersicht, Tasks) von h-6/text-xs auf h-4.5/text-[10px]
- Active/Archived Tabs im Header von h-5/text-[11px] auf h-4/text-[10px]
- Multiselect und New-Button von h-7 auf h-5.5
- Search-Input von h-8 auf h-6
- Project-Filter von h-8 auf h-6
- Time-Filter von h-8 auf h-6
- Font-Size-Slider Icons verkleinert

### 3. Delete-Old-Sessions

- Neuer Trash-Button neben dem Font-Size-Slider
- Dialog mit konfigurierbarem Tage-Input (default: 7)
- Bestaetigung bevor alte Sessions geloescht werden
- Aktuelle Session wird nie geloescht

### Neue Dateien

- `use-project-grouping.ts` - Hook fuer Projekt-Gruppierung
- `project-group-section.tsx` - Aufklappbare Projekt-Sektion
- `delete-old-sessions-dialog.tsx` - Dialog zum Loeschen alter Sessions
