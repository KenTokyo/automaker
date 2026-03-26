---
title: Kanban Task Drawer - Floating Bottom Chatbox
description: Hässliches Inline-QuickAdd durch modernen Bottom-Drawer ersetzt. Floating Chatbox mit Titel, Beschreibung, Strg+V Bild-Paste und Status-Auswahl.
date: 2026-03-26
status: done
effort: M
---

## Was wurde gemacht

### Problem

- Das Inline-QuickAdd in den Kanban-Spalten war hässlich und funktionierte schlecht
- Der "Anlegen"-Button war komisch platziert
- Keine Möglichkeit, Beschreibungen oder Bilder beim Erstellen einzugeben

### Lösung

**Neuer `KanbanTaskDrawer`** (`apps/kanban-web/src/components/session-manager/kanban-task-drawer.tsx`):

- Floating Bottom-Drawer (Chatbox-Stil), gleitet von unten hoch
- Kein Background-Blur - Tasks bleiben sichtbar
- Zentriert, max-w-lg, abgerundete Ecken
- Titel-Input (borderless, clean)
- Beschreibungs-Textarea mit Strg+V Bild-Paste Support
- Bild-Vorschau-Thumbnails mit Entfernen-Button
- Status-Pill-Auswahl (To Do / In Progress / Erledigt)
- Strg+Enter zum Absenden, Escape zum Schließen
- Bilder werden nach Task-Erstellung nach Supabase hochgeladen

**KanbanBoard Update** (`apps/kanban-web/src/components/session-manager/kanban-board.tsx`):

- Inline KanbanQuickAdd entfernt
- Spalten-"+"-Buttons öffnen jetzt den Drawer mit vorausgewähltem Status
- Floating FAB-Button (Cyan, rund) unten rechts
- KanbanColumn vereinfacht (kein projectId mehr nötig)

**CreateTaskInput erweitert** (`apps/ui/src/hooks/use-supabase-tasks.ts`):

- Optionales `status`-Feld zu `CreateTaskInput` hinzugefügt
- `createTask` übergibt Status an Supabase (Default: 'todo')

### Dateien

- `apps/kanban-web/src/components/session-manager/kanban-task-drawer.tsx` (NEU)
- `apps/kanban-web/src/components/session-manager/kanban-board.tsx` (UPDATE)
- `apps/ui/src/hooks/use-supabase-tasks.ts` (UPDATE)
- `apps/kanban-web/ARCHITEKTUR.md` (NEU - Architektur-Dokumentation)
- `CLAUDE.md` (UPDATE - Kanban-Web Referenz)
