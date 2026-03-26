# Task-Status-Sync (To-do -> In Arbeit -> Fertig) – Architektur-Analyse

## 1) Was ist das Ziel?

Ein Task soll von `To Do` nach `In Progress` und danach nach `Completed` gehen.
Das soll in `Automaker` und im `kanban-web` gleich sichtbar sein.

Zusatz: Beim Klick auf `Sofort starten` soll wirklich direkt gestartet werden (nicht nur Text ins Eingabefeld).

---

## 2) Was ist heute das Problem?

1. Beim Klick auf `Sofort starten` wird aktuell nur ein Text vorbereitet.
2. Der Status wird zu früh auf `in_progress` gesetzt.
3. Es fehlt eine verlässliche Stelle, die am Ende den Task auf `completed` setzt.
4. Es gibt zwei Welten:
   - laufende Tasks in Supabase (`tasks`)
   - Fertig-Doku in Dateien (`.completed/*.md`)

---

## 3) DUPLIKAT-WARNUNG (wichtig)

Sehr ähnliche Planung/Umsetzung existiert schon:

1. `History/von-todo-nach-in-progress-nach-completed-sowohl-lokal-als-au.md`
2. `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/2026-03-25-agentic-supabase-MASTER-PLAN.md`
3. `.completed/2026-03-25_phase-06-task-chat-bridge.md`

Das heißt: Nicht neu erfinden, sondern den bestehenden Bridge-Flow erweitern.

---

## 4) Architektur-Entscheidung

### Kernentscheidung

`tasks` in Supabase bleibt die **Hauptquelle** für den Lebenszyklus:

- `todo`
- `in_progress`
- `completed`

`.completed/*.md` bleibt eine **Doku-Spur** (was genau gemacht wurde), aber nicht die Hauptquelle für den Kanban-Status.

### Warum?

1. Die Status-Spalten existieren schon sauber in Supabase.
2. Realtime-Updates sind schon aktiv.
3. Weniger Doppel-Logik und weniger Drift.

---

## 5) Ziel-Datenfluss (einfach)

### A) Task erstellen

1. Task wird in `kanban-web` oder in `Automaker` angelegt.
2. Ein Datensatz in `public.tasks` mit `status = todo`.
3. Beide Oberflächen sehen denselben Task.

### B) Task starten (`Sofort starten`)

1. Klick auf `Sofort starten`.
2. Neue Session wird erzeugt (oder bewusst wiederverwendet, falls leer).
3. Erst wenn Session + Send erfolgreich sind:
   - `tasks.status = in_progress`
   - `tasks.chat_session_id = <sessionId>`

### C) Task beenden

1. Wenn Agent-Lauf erfolgreich `complete` meldet:
   - `tasks.status = completed`
   - `tasks.completed_notes = kurze Zusammenfassung`
2. Optional: `.completed/*.md` wird zusätzlich erzeugt und mit Task-ID/Session-ID verlinkt.

### D) Fehler / Abbruch

1. Wenn Start oder Send fehlschlägt:
   - Status bleibt `todo`.
2. Wenn Nutzer stoppt:
   - kein automatisches `completed`.
   - optional zurück auf `todo` mit kurzer Notiz.

---

## 6) Wiederverwendbare Bausteine (nicht neu bauen)

1. `apps/ui/src/components/session-manager/task-send-to-agent.tsx`
   - bestehender Einstiegspunkt für den Button
2. `apps/ui/src/store/task-chat-bridge-store.ts`
   - bestehender Bridge-Store
3. `apps/ui/src/components/views/agent-view.tsx`
   - hat schon Session-/Send-Logik
4. `apps/ui/src/hooks/use-supabase-tasks.ts`
   - hat schon `chatSessionId`, `completedNotes`, `completedFiles`
5. `apps/ui/src/components/session-manager/tasks-panel.tsx`
   - zeigt Tasks und Kanban-Dialog

---

## 7) Technische Leitplanken

1. Statuswechsel zu `in_progress` erst nach echtem Start.
2. Statuswechsel zu `completed` nur bei echtem Abschluss-Event.
3. Kein stilles Verschieben in `in_progress` beim bloßen Vorfüllen.
4. DB-Update und UI-Feedback zusammen denken (keine „Geisterzustände“).

---

## 8) Akzeptanzkriterien

1. `Sofort starten` startet wirklich eine Session + sendet den Task direkt.
2. Task bleibt `todo`, wenn der Start scheitert.
3. Task wird bei erfolgreichem Abschluss auf `completed` gesetzt.
4. `chat_session_id` ist nach Start gesetzt.
5. Status ist in `Automaker` und `kanban-web` konsistent sichtbar.
