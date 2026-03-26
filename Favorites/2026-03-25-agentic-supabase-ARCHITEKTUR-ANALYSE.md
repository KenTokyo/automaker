# Agentic Tasks Online – Architektur-Analyse (25.03.2026)

## 1) Was ist das Ziel?

Wir bauen ein gemeinsames Task-System für Automaker mit diesen Punkten:

1. Alle Tasks liegen zentral in Supabase (kein Dauer-Dualspeicher).
2. Rechte pro Projekt werden über den Projektbereich gesteuert.
3. Es gibt drei Status: `todo`, `in_progress`, `completed`.
4. Tasks können direkt in den Chat überführt werden (Button am Task).
5. Optionaler Fullscreen-Kanban im Agent-Panel (3 Spalten).
6. Bildanhänge laufen über Supabase Storage.
7. Benachrichtigungen bei Statuswechsel zu `completed`.

---

## 2) Welche Inputs wurden berücksichtigt?

### History-Quellen

- `History/supabase-init-db-agentic-1-connection-string-copy-the-connec.md`
- `History/tasks-online-masterplanung-voicechat-so-momentan-haben-wir-j.md`

### Wichtige Leitplanken aus deinem Input

- UX soll schnell sein (wenig Klicks).
- Standard-Modell soll direkt nutzbar sein.
- Alternativ manuelle Modellauswahl über bestehenden Model-Selector.
- Lokale Chat-Bearbeitung bleibt zentral für „aktive Ausführung“.
- Trotzdem müssen Status und Ergebnisse in der DB sichtbar sein.

---

## 3) Komponenten-Übersicht (Ist-Stand)

| Bereich              | Datei                                                                           | Rolle im neuen System                           |
| -------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| Tabs/Panel           | `apps/ui/src/components/session-manager.tsx`                                    | Einstieg für Tasks/Fertig/Fullscreen-Startpunkt |
| To-do Liste          | `apps/ui/src/components/session-manager/tasks-panel.tsx`                        | To-do + In Progress Daten aus DB anzeigen       |
| Fertig Liste         | `apps/ui/src/components/session-manager/completed-tasks-panel.tsx`              | Completed-Ansicht und Abschlussdetails          |
| Task Karte           | `apps/ui/src/components/session-manager/task-card.tsx`                          | Buttons: Starten, Chat öffnen, Statuswechsel    |
| Task Dialog          | `apps/ui/src/components/session-manager/task-create-dialog.tsx`                 | Erstellen/Bearbeiten inkl. Anhänge              |
| Header               | `apps/ui/src/components/views/agent-view/components/agent-header.tsx`           | Shortcut-Button für Fullscreen/Kanban           |
| Projekte verwalten   | `apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx` | DB-Freigabe + Mitgliederverwaltung pro Projekt  |
| Chat Eingabe         | `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx`         | Modellwahl-Übergabe für Task -> Chat            |
| Chat Bereich         | `apps/ui/src/components/views/agent-view/components/chat-area.tsx`              | Task-Kontext in laufende Chat-Sitzung           |
| Message Bubble       | `apps/ui/src/components/views/agent-view/components/message-bubble.tsx`         | Task-Ergebnis/Completed Notes anzeigen          |
| Message Liste        | `apps/ui/src/components/views/agent-view/components/message-list.tsx`           | Verlauf inkl. taskbezogener Einträge            |
| Daten-Hook Tasks     | `apps/ui/src/hooks/use-tasks.ts`                                                | Supabase-CRUD + Realtime (statt Datei-API)      |
| Daten-Hook Completed | `apps/ui/src/hooks/use-completed-tasks.ts`                                      | Completed-Read/Filter aus DB                    |

---

## 4) Ziel-Architektur (einfach erklärt)

## Kernidee

- **Desktop/Lokal** und **Deploy/Web** nutzen dieselbe Supabase-Datenbasis.
- Der Projektbesitzer entscheidet im Projektdialog, wer Zugriff hat.
- Task-Bearbeitung im Chat bleibt schnell: „Mit Standard-Modell starten“ oder „Modell wählen“.

## Schichten

1. **UI-Schicht**: Panels, Karten, Fullscreen-Kanban, Dialoge.
2. **Daten-Schicht**: Supabase Tabellen + RLS Rechte.
3. **Storage-Schicht**: Supabase Storage für Bilder.
4. **Event-Schicht**: Realtime + Notification-Trigger bei `completed`.

---

## 5) Datenmodell (Vorschlag)

## Tabellen

1. `task_projects`

- `id` (uuid)
- `name`
- `slug`
- `owner_user_id`
- `share_enabled`
- `created_at`, `updated_at`

2. `task_project_members`

- `project_id`
- `user_id`
- `role` (`owner`, `editor`, `viewer`)
- `created_at`

3. `tasks`

- `id` (uuid)
- `project_id`
- `title`, `description`, `summary`
- `status` (`todo`, `in_progress`, `completed`)
- `priority`
- `tags` (text[])
- `created_by`, `updated_by`
- `chat_session_id` (optional für Task -> Chat Beziehung)
- `completed_notes` (Text)
- `completed_files` (jsonb oder text[])
- `created_at`, `updated_at`, `completed_at`

4. `task_attachments`

- `id` (uuid)
- `task_id`
- `storage_path`
- `mime_type`
- `width`, `height` (optional)
- `created_at`

5. `task_notifications`

- `id` (uuid)
- `task_id`
- `target_user_id`
- `type` (`task_completed`)
- `read_at`
- `created_at`

---

## 6) Rechte-Modell (RLS)

1. Owner darf alles im Projekt.
2. Editor darf Tasks erstellen/bearbeiten.
3. Viewer darf nur lesen.
4. Wenn `share_enabled = false`, nur Owner hat Zugriff.

Hinweis: Dadurch ist sofort klar, wer was darf, ohne Extra-Logik in jedem UI-Button.

---

## 7) Prozess-Logik

## Task -> Chat

1. Klick auf Task: `An Agent senden`.
2. Option A: direkt mit Standard-Modell.
3. Option B: Modell wählen (bestehender Selector).
4. Task bekommt `in_progress` + `chat_session_id`.
5. Bei Abschluss: `completed`, `completed_notes`, Dateireferenzen.

## Bild-Upload

1. User fügt Bild mit STRG+V ein.
2. Upload nach Supabase Storage.
3. Datensatz in `task_attachments`.
4. Ticket zeigt Vorschau, Klick öffnet groß.

## Benachrichtigungen

1. Status wechselt auf `completed`.
2. Notification-Eintrag wird erzeugt.
3. Deploy-App zeigt Badge/Toast.

---

## 8) UX-Regeln

1. Wenig Klicks: Standard-Modell als Schnellweg.
2. Klarer Alternativweg: Modellauswahl-Button.
3. Fullscreen-Kanban optional, Tabs bleiben erhalten.
4. Auto-Refresh beim Laden + manueller Refresh-Button.
5. Keine versteckten Zustände: Status immer sichtbar.

---

## 9) Offene Architektur-Entscheidungen

1. Bild-Annotation direkt in Automaker oder später separat?
2. Wird Statuswechsel `in_progress` nur lokal erlaubt oder auch Deploy-Editors?
3. Soll Fullscreen als Dialog oder als eigene Route gebaut werden?

Empfehlung:

- Start als Dialog (schneller), später optional eigene Route.

---

## 10) DUPLIKAT-WARNUNG

Es existieren bereits lokale Task- und Completed-Komponenten.  
Wir erweitern diese gezielt und bauen keinen zweiten parallelen Task-Stack.

---

## 11) Was bewusst nicht im Scope ist

- E-Mail-Panel/Google-CLI Integration (vorerst zurückgestellt).
- Komplexes bestehendes Board ersetzen (wir bauen Mini-Kanban im Agent-Bereich).
