# Supabase Team-Tasks – Architektur-Analyse (25.03.2026)

## 1) Kurz zusammengefasst

Du willst zwei Dinge:

1. Den aktuellen Crash im Tasks-Panel beheben (`t.tags is not iterable`).
2. Danach eine einfache, saubere Lösung planen, damit Tasks über Supabase gemeinsam nutzbar sind (Team, Handy, Web, Freigaben pro Projekt).

Wichtig: Ziel ist **eine Datenquelle**. Keine parallele Datei- und DB-Welt.

---

## 2) Pflicht-Recherche (Docs + Code)

### Verwendete Schlüsselwörter

- TasksPanel
- tags
- Projekt-Freigabe
- Supabase
- Auth

### Relevante Doku-Funde

| Datei                                                              | Warum wichtig                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| `.completed/2026-03-18_tasks-tab-ui-components.md`                 | Zeigt, wie der Tasks-Tab aufgebaut wurde.            |
| `.completed/2026-03-18_tasks-panel-integration-session-manager.md` | Zeigt die Integration in den Session-Manager.        |
| `.completed/2026-03-22_manage-projects-dialog.md`                  | Zeigt den Bereich, wo ein Freigabe-Button gut passt. |
| `docs/project-switcher/tasks/04-integration-ui-refinement.md`      | Enthält Muster für Header/Dialog-Integration.        |
| `History/New-Tasks-Tab-for-Session-Manager-history.md`             | Verlauf zur ursprünglichen Tasks-Einführung.         |

### Relevante Code-Funde

| Datei                                                                           | Warum wichtig                                   |
| ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `apps/ui/src/components/session-manager/tasks-panel.tsx`                        | Crash-Stelle im Tag-Handling sichtbar.          |
| `apps/ui/src/hooks/use-tasks.ts`                                                | Datenfluss API + WebSocket für offene Tasks.    |
| `apps/server/src/routes/tasks/handlers.ts`                                      | Event-Payload wird als `{ task }` gesendet.     |
| `apps/ui/src/components/views/agent-view/components/agent-header.tsx`           | Stelle für DB-Button im Header/Projekt-Auswahl. |
| `apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx` | Stelle für „Projekt teilen“-Steuerung.          |

### DUPLIKAT-WARNUNG

Es gibt bereits eine fertige lokale Tasks-Architektur (UI + Hook + Server-Routen).  
Empfehlung: **Nicht neu bauen**, sondern die bestehende Oberfläche weiterverwenden und nur die Datenquelle sauber auf Supabase umstellen.

---

## 3) Problemursache beim Crash

Der Server sendet bei Events ein Objekt wie `{ task: {...} }`.  
Im UI-Hook wurde es bisher wie ein direktes Task-Objekt behandelt. Dadurch landete ein falsches Objekt im Store. Beim Rendern kam dann `t.tags is not iterable`.

---

## 4) Zielbild für Team-Tasks

### Einfaches Zielbild

- Jeder Task liegt in Supabase.
- Pro Projekt kann der Besitzer Teamzugriff ein- oder ausschalten.
- Mitglieder sehen nur freigegebene Projekte.
- Tasks werden in Echtzeit aktualisiert.
- Lokal erstellte Tasks gehen auch in dieselbe DB.

### Was der Nutzer später sieht

- Im Projektbereich: Schalter „In Team-DB teilen“.
- Im Manage-Dialog: Mitglieder verwalten (hinzufügen/entfernen, Rolle).
- Im Tasks-Panel: normal arbeiten wie bisher, aber Daten kommen aus Supabase.

---

## 5) Empfohlene Datenbank-Struktur (Supabase)

### Tabellen

1. `profiles`

- `id` (uuid, aus `auth.users`)
- `email`
- `display_name`

2. `task_projects`

- `id` (uuid)
- `owner_id` (uuid)
- `name`
- `slug` (für Web-Links)
- `share_enabled` (boolean)
- `created_at`, `updated_at`

3. `task_project_members`

- `project_id`
- `user_id`
- `role` (`owner`, `editor`, `viewer`)
- `created_at`

4. `tasks`

- `id` (uuid)
- `project_id`
- `title`, `description`, `summary`
- `status`, `priority`
- `tags` (text[])
- `created_by`, `updated_by`
- `created_at`, `updated_at`

5. `project_presence` (optional, für „wer ist online“)

- `project_id`
- `user_id`
- `last_seen_at`
- `client_type` (`desktop`, `web`, `mobile`)

### Sicherheitsregeln (RLS)

- Nur Owner darf Mitglieder verwalten.
- Nur Owner + Member dürfen Tasks lesen/schreiben.
- Bei `share_enabled = false`: Nur Owner sieht das Projekt.

---

## 6) UI-Einbau für deinen gewünschten DB-Button

### Empfohlen

- **Primär im `ManageProjectsDialog`** pro Projektzeile:
  - Schalter: `Team-DB aktiv`
  - Button: `Mitglieder`
- **Optional im Header** (schneller Einstieg): kleines DB-Icon öffnet denselben Dialog.

Warum so?

- Im Manage-Dialog sind schon Projektaktionen vorhanden (ausblenden, Papierkorb). Das passt logisch zusammen.

---

## 7) Deploy-Variante

### Empfehlung

Eine kleine extra Web-App im selben Monorepo (z. B. `apps/tasks-web`) und Deployment auf Vercel.

Vorteile:

- Sehr einfache Oberfläche für Kollegen.
- Weniger Risiko als die komplette Haupt-App öffentlich zu machen.
- Nutzt dieselbe Supabase-DB wie die Desktop-App.

---

## 8) Wichtige Edge-Cases

1. Gleicher Dateiname in zwei Projekten:

- Immer mit `project_id + task_id` arbeiten, nie nur über Dateiname.

2. User entfernt, ist aber noch eingeloggt:

- Beim nächsten DB-Zugriff sofort 403/kein Zugriff.

3. Projektfreigabe wird ausgeschaltet:

- Mitglieder verlieren sofort Leserechte über RLS.

4. Owner ohne Internet:

- Klare Fehlermeldung anzeigen („Keine Verbindung“), keine stillen lokalen Schattenkopien.

5. Alte lokale Tasks vorhanden:

- Einmalige Migration zu Supabase, danach Dateispeicher für Tasks abschalten.

---

## 9) Architektur-Entscheidung

**Entscheidung:** Bestehende Tasks-UI behalten, Datenquelle auf Supabase umstellen, Freigabe im Manage-Dialog pro Projekt steuern, externe Nutzung über kleine Vercel-Web-App.

So bleibt es für dich und dein Team einfach nutzbar, mobilfähig und ohne Doppel-Speicherung.
