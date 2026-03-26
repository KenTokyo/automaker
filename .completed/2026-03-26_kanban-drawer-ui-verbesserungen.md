---
title: 'Kanban Drawer UI-Verbesserungen + Verschiebe-Buttons entfernt'
description: 'Task-Drawer: Status-Pills entfernt, Auto-Grow Textarea, Tags-Eingabe, Mikrofon-Button. Task-Karten: Verschiebe-Buttons entfernt.'
date: 2026-03-26
status: completed
effort: medium
---

# Kanban Drawer UI-Verbesserungen + Verschiebe-Buttons entfernt

## Was wurde gemacht

### 1. Task-Drawer (kanban-task-drawer.tsx)

- **Status-Auswahl entfernt** - Die Buttons "To Do / In Progress / Erledigt" sind raus. Tasks werden immer als "To Do" erstellt (Status wird automatisch gesetzt wenn KI die Aufgabe bearbeitet).
- **Textarea Auto-Grow** - Das Beschreibungsfeld wächst jetzt automatisch mit (48px min, 320px max). Scrollt intern wenn max erreicht.
- **Tags-Eingabe** - Neues Tag-Feld mit Komma/Enter zum Hinzufügen. Tags als kleine Pills mit X-Button. Backspace entfernt letzten Tag.
- **Mikrofon-Button** - Web Speech API (Deutsch) für Spracheingabe. Roter Puls-Punkt wenn aktiv. Text wird an Beschreibung angehängt.
- **Props vereinfacht** - `defaultStatus` Prop entfernt.

### 2. Task-Karte (kanban-task-card.tsx)

- **Verschiebe-Buttons entfernt** - ArrowLeft/ArrowRight Buttons zum Verschieben zwischen Spalten sind raus. Status-Änderungen passieren nur lokal im echten Automaker-Projekt.
- **Props vereinfacht** - `onUpdateTask` Prop entfernt.
- **Action-Buttons** - Nur noch Edit + Delete, rechts ausgerichtet.

### 3. Kanban-Board (kanban-board.tsx)

- `onUpdateTask` aus KanbanColumn Props entfernt (nicht mehr nötig).
- Drawer-Aufruf vereinfacht (kein `defaultStatus` mehr).

## Betroffene Dateien

- `apps/kanban-web/src/components/session-manager/kanban-task-drawer.tsx`
- `apps/kanban-web/src/components/session-manager/kanban-task-card.tsx`
- `apps/kanban-web/src/components/session-manager/kanban-board.tsx`

## TypeScript-Check

Keine Fehler.
