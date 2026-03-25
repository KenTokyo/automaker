# Phase 5 -- Fullscreen Mini-Kanban

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] Fullscreen-Ansicht mit 3 Spalten bauen
- [x] Schnelle Status-Aktionen integrieren (Buttons statt Drag/Drop im ersten Schritt)
- [x] Tabs und Fullscreen konsistent halten

## Betroffene Komponenten

- apps/ui/src/components/session-manager/tasks-panel.tsx (geaendert)
- apps/ui/src/components/session-manager/kanban-board.tsx (neu)
- apps/ui/src/components/session-manager/kanban-task-card.tsx (neu)
- apps/ui/src/components/session-manager/kanban-quick-add.tsx (neu)
- apps/ui/src/components/session-manager/kanban-fullscreen-dialog.tsx (neu)

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten (0 TypeScript-Fehler)
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Was wurde umgesetzt

### kanban-board.tsx (302 Zeilen)

- 3 Spalten: To Do (blau), In Progress (orange), Completed (gruen)
- Jede Spalte mit Farb-Badge, Count, Plus-Button fuer Quick-Add
- Loading/Error States, inline Error-Banner
- Stats-Footer mit Gesamtzahlen
- Responsive: `md:grid-cols-3` (vertikal auf kleinen Screens)

### kanban-task-card.tsx (292 Zeilen)

- Kompakte Karten mit Priority-Dot, Titel, Tags, Erstelldatum
- Klick expandiert: zeigt Description, Summary/Details, Status-Buttons
- ArrowLeft/ArrowRight Buttons zum schnellen Status-Wechsel
- Edit + Delete Buttons in der expandierten Ansicht

### kanban-quick-add.tsx (81 Zeilen)

- Inline-Input mit Enter/Escape Handling
- Check + X Buttons fuer Submit/Cancel
- Auto-Focus und Re-Focus nach Erstellung

### kanban-fullscreen-dialog.tsx (103 Zeilen)

- Radix Dialog, fullscreen (100vw-2rem x 100vh-2rem)
- Header: LayoutGrid Icon + Projektname + Task-Count + Schliessen-Button
- Nutzt useSupabaseTasks Hook intern

### tasks-panel.tsx (geaendert)

- LayoutGrid Button im Header (nur sichtbar wenn Supabase konfiguriert + Projekt in Supabase)
- Supabase-Projekt-Lookup via useSupabaseProjects (slug === projectPath)
- KanbanFullscreenDialog eingebunden

## Uebergabe an Phase 6

Phase 6 (Task-Chat Bridge + Modellwahl) kann auf folgende Grundlage aufbauen:

- KanbanBoard und KanbanTaskCard akzeptieren `onEditTask` Callback
- Die Supabase-Task-Struktur (`SupabaseTask`) hat bereits `chatSessionId` Feld
- Der KanbanFullscreenDialog koennte um Chat-Integration erweitert werden
- Drag & Drop waere ein natuerlicher naechster Schritt fuer Phase 5b

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert: Fullscreen 3-Spalten Kanban Board mit Quick-Add, Status-Aktionen, expandierbaren Karten
- Offene Risiken: Keine bekannten. Drag & Drop als Enhancement moeglich aber nicht im Scope.
