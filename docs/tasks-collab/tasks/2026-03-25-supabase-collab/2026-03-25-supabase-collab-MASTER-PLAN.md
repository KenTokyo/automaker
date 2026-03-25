# Supabase Team-Tasks – Master-Plan (25.03.2026)

## Ziel

- Tasks laufen nur noch über Supabase.
- Pro Projekt kann der Besitzer Teamzugriff steuern.
- Kollegen können per Login Tasks erstellen (auch mobil).
- Kein Dualspeicher (nicht lokal + DB parallel als Dauerlösung).

---

## Phase 0 – Sofort-Fix (jetzt)

### Ergebnis

- Crash `t.tags is not iterable` wird behoben.
- Event-Payload `{ task: ... }` wird korrekt verarbeitet.
- Doppelte Task-Einträge nach WebSocket-Event werden vermieden.

### Betroffene Dateien

- `apps/ui/src/hooks/use-tasks.ts`
- `apps/ui/src/hooks/use-completed-tasks.ts`

---

## Phase 1 – Supabase Basis aufsetzen

### Aufgaben

1. Supabase-Projekt erstellen.
2. E-Mail/Passwort Auth aktivieren.
3. Lokale `.env` Werte ergänzen (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).

### Ergebnis für Nutzer

- Es gibt eine einfache Login- und Register-Möglichkeit.

---

## Phase 2 – Datenmodell + Rechte (RLS)

### Aufgaben

1. Tabellen anlegen (`task_projects`, `task_project_members`, `tasks`, optional `project_presence`).
2. RLS-Regeln für Owner/Member setzen.
3. Rollen definieren: `owner`, `editor`, `viewer`.

### Ergebnis für Nutzer

- Nur freigegebene Personen sehen ein Projekt.

---

## Phase 3 – UI für Projekt-Freigabe

### Aufgaben

1. In `ManageProjectsDialog` pro Projekt:
   - Schalter `Team-DB aktiv`
   - Button `Mitglieder`
2. Mitglieder-Dialog:
   - User per E-Mail hinzufügen
   - Rolle setzen
   - Zugriff entziehen

### Empfohlene Dateien

- `apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx`
- `apps/ui/src/components/views/agent-view/components/agent-header.tsx`
- neue kleine Dialog-Komponenten unter `apps/ui/src/components/views/agent-view/components/`

### Ergebnis für Nutzer

- Du kannst pro Projekt klar steuern, wer Tasks sehen/ändern darf.

---

## Phase 4 – Tasks komplett auf Supabase umstellen

### Aufgaben

1. `useTasks` und `useCompletedTasks` auf Supabase-Datenzugriff umstellen.
2. Server-Route für Datei-Tasks nur noch für Migration/Fallback nutzen.
3. Feature-Flag für Übergang, dann endgültig DB-only aktivieren.

### Migrationsschritt (einmalig)

1. Bestehende `.automaker/tasks/*.md` lesen.
2. In Supabase `tasks` schreiben.
3. Mapping lokal speichern (Projekt <-> `project_id`).
4. Nach Kontrolle: Datei-Schreiben deaktivieren.

### Ergebnis für Nutzer

- Alle neuen und bearbeiteten Tasks liegen zentral in der DB.

---

## Phase 5 – Realtime + Sichtbarkeit „wer ist online“

### Aufgaben

1. Supabase Realtime für `tasks` aktivieren.
2. Optional `project_presence` regelmäßig aktualisieren.
3. Kleine UI-Anzeige: „2 Personen online“.

### Ergebnis für Nutzer

- Änderungen erscheinen fast sofort bei allen.

---

## Phase 6 – Web/Mobile Seite deployen (Vercel)

### Empfehlung

- Kleine separate App im Monorepo, z. B. `apps/tasks-web`.

### Aufgaben

1. Minimal-Seiten:
   - Login
   - Projekte
   - Task-Liste + Task erstellen
2. Vercel Deployment.
3. Supabase ENV in Vercel setzen.

### Ergebnis für Nutzer

- Kollegen können überall Tasks pflegen (auch am Handy).

---

## Phase 7 – Abschluss ohne Dualsystem

### Aufgaben

1. Alte lokale Task-Pfade als Standard abschalten.
2. Nutzerhinweis einbauen: „Tasks sind jetzt zentral gespeichert“.
3. Kurzer Admin-Check: Rechte, Freigaben, Einladungen.

### Ergebnis für Nutzer

- Einheitliches, einfaches Verhalten ohne Verwirrung.

---

## Technische Leitlinien

1. Task-Identität immer über `task_id` (UUID), nicht über Dateinamen.
2. Projektzugriff immer über `project_id` + RLS.
3. Lokale Projektpfade nie öffentlich zeigen.
4. Bei Verbindungsproblemen klare Meldungen statt stiller Fehler.

---

## Beispiel-Nutzerfluss (alltagsnah)

1. Du öffnest Projekt `automaker`.
2. Du schaltest `Team-DB aktiv` ein.
3. Du gibst `kollege@mail.de` als Editor frei.
4. Kollege loggt sich in der Web-Seite ein.
5. Kollege erstellt Task „Landingpage prüfen“.
6. Du siehst denselben Task direkt im lokalen Tasks-Panel.

---

## Grobe Reihenfolge mit Aufwand

1. Phase 1-2: Grundlagen (M)
2. Phase 3: Freigabe-UI (M)
3. Phase 4: Datenquellen-Umbau + Migration (L)
4. Phase 5: Realtime/Presence (M)
5. Phase 6: Web-App + Deploy (M)
6. Phase 7: Cleanup auf DB-only (S)

Gesamt: **L bis XL**, aber gut in klaren Etappen umsetzbar.
