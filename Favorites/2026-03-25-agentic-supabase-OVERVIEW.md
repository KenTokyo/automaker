# Agentic Tasks Online – Overview

## Zweck dieser Übersicht

Diese Datei ist der schnelle Einstieg für alle Beteiligten.  
Sie zeigt in kurzer Form:

1. Was gebaut werden soll
2. Welche Komponenten betroffen sind
3. Welche Phasen geplant sind
4. Welche Unterplanungen existieren
5. Wer als Sub-Agent welche Verantwortung hat

---

## Produkt-Ziel in einem Satz

Ein einfaches, schnelles und gemeinsames Task-System mit Supabase, das Tasks im Agent-Bereich zeigt, direkt in Chat-Workflows überführen kann und klare Rechte pro Projekt hat.

---

## Kernfunktionen (Zielbild)

1. DB-only Tasks (`todo`, `in_progress`, `completed`)
2. Projektbezogene Freigaben und Mitgliederrechte
3. Mini-Kanban Fullscreen (3 Spalten)
4. Task -> Chat mit Modellwahl (Default oder manuell)
5. Bildanhänge mit Supabase Storage
6. Notifications bei `completed`

---

## Komponenten-Map (Top-Level)

| Bereich            | Kern-Dateien                                                                    |
| ------------------ | ------------------------------------------------------------------------------- |
| Session/Task UI    | `session-manager.tsx`, `tasks-panel.tsx`, `completed-tasks-panel.tsx`           |
| Task Interaktionen | `task-card.tsx`, `task-create-dialog.tsx`                                       |
| Projektfreigaben   | `agent-header.tsx`, `manage-projects-dialog.tsx`                                |
| Chat Brücke        | `chat-area.tsx`, `input-controls.tsx`, `message-list.tsx`, `message-bubble.tsx` |
| Datenhooks         | `use-tasks.ts`, `use-completed-tasks.ts`                                        |

---

## Lineare Phasen

- [x] Phase 0: Basis-Bugfix
- [x] Phase 1: Supabase Setup
- [x] Phase 2: DB Schema + RLS
- [x] Phase 3: Projektfreigabe UI
- [x] Phase 4: DB-only Task-Fluss
- [x] Phase 5: Fullscreen Mini-Kanban
- [x] Phase 6: Task -> Chat Bridge
- [x] Phase 7: Bildanhänge + Storage
- [x] Phase 8: Notifications + Realtime
- [x] Phase 9: Migration + Rollout + Deploy
- [x] Phase 10: Abschluss

Details stehen im Masterplan.

---

## Unterplanungen (Status)

Alle Unterplanungen sind angelegt und referenzieren den Masterplan:

1. `subplans/2026-03-25-phase-01-supabase-setup-MASTER-PLAN.md`
2. `subplans/2026-03-25-phase-02-db-schema-rls-MASTER-PLAN.md`
3. `subplans/2026-03-25-phase-03-project-sharing-ui-MASTER-PLAN.md`
4. `subplans/2026-03-25-phase-04-db-only-task-flow-MASTER-PLAN.md`
5. `subplans/2026-03-25-phase-05-fullscreen-kanban-MASTER-PLAN.md`
6. `subplans/2026-03-25-phase-06-task-chat-bridge-MASTER-PLAN.md`
7. `subplans/2026-03-25-phase-07-storage-attachments-MASTER-PLAN.md`
8. `subplans/2026-03-25-phase-08-notifications-realtime-MASTER-PLAN.md`
9. `subplans/2026-03-25-phase-09-migration-rollout-MASTER-PLAN.md`
10. `subplans/2026-03-25-phase-10-abschluss-MASTER-PLAN.md`

---

## Sub-Agent Verantwortungen

| Sub-Agent       | Hauptverantwortung                                    |
| --------------- | ----------------------------------------------------- |
| `ki_architekt`  | Supabase Architektur, Schema, RLS, Sicherheitslogik   |
| `planer`        | Feingranulare Unterpläne, Risiken, Akzeptanzkriterien |
| `programmierer` | Umsetzung der Phasen im Code                          |
| `explorer`      | Code-Recherche und betroffene Dateien                 |
| `orchestrator`  | Lineare Steuerung, Häkchen, Übergaben                 |
| `abschliesser`  | Abschlussdoku, `.completed`, Verlaufsupdates          |

---

## Jetzt aktiver Schritt

Alle 11 Phasen (0-10) sind abgeschlossen. Bereit fuer Deployment.
