# Agentic Tasks Online – Master-Plan (Linear, mit Sub-Agent-Flow)

## Referenzen

- Architektur-Analyse: `2026-03-25-agentic-supabase-ARCHITEKTUR-ANALYSE.md`
- Input-History 1: `History/supabase-init-db-agentic-1-connection-string-copy-the-connec.md`
- Input-History 2: `History/tasks-online-masterplanung-voicechat-so-momentan-haben-wir-j.md`

---

## 1) Regeln für die lineare Ausführung

1. Immer nur **eine Phase** ist aktiv.
2. Erst wenn die Phase auf `[x]` steht, startet die nächste.
3. Jede Phase muss einen kurzen Abschluss-Block haben:
   - Datum
   - Was wurde geliefert
   - Offene Risiken
4. Unterplan muss immer auf diese Masterplanung verweisen.

---

## 2) Sub-Agent Rollenmatrix

| Rolle           | Aufgabe                                                          |
| --------------- | ---------------------------------------------------------------- |
| `ki_architekt`  | DB-Architektur, RLS, Supabase-Entscheidungen, Datenfluss         |
| `planer`        | Detaillierte Unterpläne je Phase, Edge-Cases, Akzeptanzkriterien |
| `programmierer` | Umsetzung in Code pro Phase                                      |
| `explorer`      | Schnelle Codebasis-Suche, betroffene Dateien, Blast-Radius       |
| `abschliesser`  | Abschlussdoku, `.completed`, kleine Doku-Nachpflege              |
| `orchestrator`  | Hält Reihenfolge ein, setzt Häkchen, steuert Übergaben           |

---

## 3) Gesamtphasen (A bis Z)

- [x] **Phase 0 – Stabilisierung Basis-Bug**
  - Ziel: `t.tags is not iterable` beheben
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Event-Payload robust, doppelte Events abgefangen
  - Unterplan: nicht nötig (Hotfix)

- [x] **Phase 1 – Supabase Setup & Zugänge**
  - Ziel: MCP/Projektzugang, ENV-Struktur, sichere Konfiguration
  - Primärrolle: `ki_architekt`
  - Unterplan: `subplans/2026-03-25-phase-01-supabase-setup-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Supabase JS Client installiert, ENV-Konzept erstellt, Auth-Store + Client-Library implementiert

- [x] **Phase 2 – DB Schema + RLS Rechte**
  - Ziel: Tabellen, Rollen, Policies, Task-Lifecycle
  - Primärrolle: `ki_architekt`
  - Unterplan: `subplans/2026-03-25-phase-02-db-schema-rls-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: 4 SQL-Migrationen, TypeScript DB-Types, Supabase Hooks für Tasks + Projekte

- [x] **Phase 3 – Projektfreigabe UI (DB-Button + Mitglieder)**
  - Ziel: Pro Projekt Freigabe aktivieren, Mitglieder verwalten
  - Primärrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-03-project-sharing-ui-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Team-DB Toggle + Mitglieder-Dialog in ManageProjectsDialog, Dark Neon Design

- [x] **Phase 4 -- Tasks/Completed auf DB-only umstellen**
  - Ziel: Keine dauerhafte Datei-Speicherung mehr fuer Tasks
  - Primaerrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-04-db-only-task-flow-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Unified useTasksSource Hook mit Auto-Routing zwischen Supabase und Dateien, DB/Lokal-Badge im Tasks-Panel

- [x] **Phase 5 -- Fullscreen Mini-Kanban (3 Spalten)**
  - Ziel: `todo`, `in_progress`, `completed` als klare 3-Spalten-Ansicht
  - Primaerrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-05-fullscreen-kanban-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: 4 neue Komponenten (kanban-board, kanban-task-card, kanban-quick-add, kanban-fullscreen-dialog), Integration in tasks-panel.tsx

- [x] **Phase 6 -- Task -> Chat Bridge + Modellwahl**
  - Ziel: Task per Button an Agent senden, mit Default- oder manueller Modellwahl
  - Primaerrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-06-task-chat-bridge-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Bridge Store, Send-to-Agent Popover (Sofort/Modellwahl), TaskContextBadge im Chat, File + Supabase Task Support

- [x] **Phase 7 -- Bilder, Storage, Vorschau, optional Annotation**
  - Ziel: STRG+V Upload, Ticket-Vorschau, Grossansicht, Annotation vorbereiten
  - Primaerrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-07-storage-attachments-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Upload-Hook, Vorschau-Komponenten, STRG+V Paste, Lightbox, Kanban-Integration

- [x] **Phase 8 -- Notifications + Realtime + Refresh-Logik**
  - Ziel: Meldung bei `completed`, Auto-Refresh + manuell
  - Primaerrolle: `programmierer`
  - Unterplan: `subplans/2026-03-25-phase-08-notifications-realtime-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Notifications-Hook mit Realtime, Bell-Popover mit Cyan-Badge, Toast bei completed, Refresh-Button mit Cyan-Styling

- [x] **Phase 9 – Migration, Rollout, Deploy-Web-App**
  - Ziel: Alt-Daten migrieren, Vercel Deploy, Go-Live Checkliste
  - Primärrolle: `orchestrator`
  - Unterplan: `subplans/2026-03-25-phase-09-migration-rollout-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Migrations-Skript (task-migration.ts), Migrations-Dialog (task-migration-dialog.tsx), Integration in tasks-panel.tsx, Deploy-Checkliste (DEPLOY-CHECKLIST.md)

- [x] **Phase 10 – Abschluss & Aufräumen**
  - Ziel: Abschlussdoku, Restpunkte, Betriebsübergabe
  - Primärrolle: `abschliesser`
  - Unterplan: `subplans/2026-03-25-phase-10-abschluss-MASTER-PLAN.md`
  - Status: Erledigt am 2026-03-25
  - Ergebnis: Alle Phasen 0-10 abgeschlossen, TypeScript fehlerfrei, Dark Neon Design durchgaengig

---

## 4) Pflicht-Gates pro Phase

Jede Phase darf erst auf `[x]`, wenn alle Punkte erfüllt sind:

1. Unterplan-Checkliste vollständig.
2. Betroffene Komponenten im Unterplan aufgelistet.
3. Akzeptanzkriterien erfüllt.
4. Kurzer Abschluss-Block ergänzt.

---

## 5) Noch zu erstellende/zu pflegende Unterplanungen

- [x] Phase 1 Unterplan
- [x] Phase 2 Unterplan
- [x] Phase 3 Unterplan
- [x] Phase 4 Unterplan
- [x] Phase 5 Unterplan
- [x] Phase 6 Unterplan
- [x] Phase 7 Unterplan
- [x] Phase 8 Unterplan
- [x] Phase 9 Unterplan
- [x] Phase 10 Unterplan

Hinweis: In diesem Schritt werden alle Unterpläne als ausführbare Arbeitsbasis angelegt. Ihre Aufgaben sind noch offen (`[ ]`).

---

## 6) Entscheidungsliste (fixiert)

1. Statusmodell bleibt 3-stufig: `todo`, `in_progress`, `completed`.
2. Mini-Kanban ist ergänzend zum Tab-Modell.
3. DB-Only ist Zielzustand für Tasks.
4. E-Mail/CLI-Idee bleibt außerhalb des aktuellen Scopes.

---

## 7) Nächster aktiver Schritt

**Alle Phasen abgeschlossen.** Projekt ist bereit fuer Deployment.
**Letzter Abschluss:** Phase 10 am 2026-03-25
