# Deploy-Checkliste -- Agentic Tasks Online (Supabase)

Stand: 2026-03-25

---

## 1. Supabase Projekt

- [ ] Supabase-Projekt erstellt (dashboard.supabase.com)
- [ ] Projekt-Region gewaehlt (nahe an den Nutzern)
- [ ] Projekt-URL und Anon-Key notiert

## 2. Datenbank-Schema

- [ ] Migration `001_profiles.sql` ausgefuehrt
- [ ] Migration `002_task_projects.sql` ausgefuehrt
- [ ] Migration `003_tasks.sql` ausgefuehrt
- [ ] Migration `004_attachments_notifications.sql` ausgefuehrt
- [ ] Alle Tabellen in Supabase Dashboard sichtbar:
  - [ ] `profiles`
  - [ ] `task_projects`
  - [ ] `task_project_members`
  - [ ] `tasks`
  - [ ] `task_attachments`
  - [ ] `task_notifications`

## 3. Realtime

- [ ] Realtime fuer `tasks`-Tabelle aktiviert (Supabase Dashboard > Database > Replication)
- [ ] Realtime fuer `task_notifications`-Tabelle aktiviert (optional, fuer Live-Benachrichtigungen)

## 4. Storage

- [ ] Storage-Bucket `task-attachments` erstellt
- [ ] Bucket auf "private" gesetzt (nicht oeffentlich zugaenglich)
- [ ] Storage-RLS-Policies konfiguriert:
  - [ ] Authentifizierte Nutzer koennen in Projektordner hochladen
  - [ ] Projektmitglieder koennen Dateien lesen
  - [ ] Nur Uploader/Owner kann Dateien loeschen

## 5. Authentifizierung

- [ ] Email-Auth in Supabase aktiviert (Auth > Providers > Email)
- [ ] "Confirm email" je nach Bedarf aktiviert/deaktiviert
- [ ] Passwort-Mindestlaenge konfiguriert
- [ ] Optional: OAuth-Provider konfiguriert (Google, GitHub etc.)

## 6. Umgebungsvariablen

### Vercel / Deploy-Plattform

- [ ] `VITE_SUPABASE_URL` gesetzt (Supabase Projekt-URL)
- [ ] `VITE_SUPABASE_ANON_KEY` gesetzt (Supabase Anon-Key)

### Lokale Entwicklung

- [ ] `.env` oder `.env.local` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
- [ ] Nicht in Git eingecheckt (in `.gitignore`)

## 7. CORS / Redirect URLs

- [ ] Supabase Auth > URL Configuration:
  - [ ] Site URL auf Produktions-URL gesetzt
  - [ ] Redirect URLs fuer alle Deploy-Domains eingetragen:
    - [ ] `https://deine-app.vercel.app`
    - [ ] `http://localhost:3007` (Entwicklung)
    - [ ] Weitere Domains falls vorhanden

## 8. RLS (Row Level Security)

- [ ] RLS ist fuer alle Tabellen aktiviert (wird durch Migrationen gesetzt)
- [ ] Policies pruefen: Nur Projektmitglieder sehen Tasks
- [ ] Testfall: Unauthentifizierter Request wird abgelehnt
- [ ] Testfall: Nutzer ohne Projektmitgliedschaft sieht keine Tasks

## 9. Erster Setup

- [ ] Erster Benutzer registriert
- [ ] Profil in `profiles`-Tabelle vorhanden
- [ ] Erstes Projekt ueber die App angelegt
- [ ] Projekt erscheint in `task_projects`-Tabelle
- [ ] Erster Task erstellt und in `tasks`-Tabelle sichtbar

## 10. Migration lokaler Tasks

- [ ] Migrations-Dialog in der App geoeffnet (Violet-Button im Tasks-Header)
- [ ] Migration gestartet und Fortschritt beobachtet
- [ ] Ergebnis-Report geprueft:
  - [ ] Migrierte Tasks korrekt
  - [ ] Uebersprungene Duplikate wie erwartet
  - [ ] Keine unerwarteten Fehler
- [ ] Tasks nach Migration in Supabase-Ansicht sichtbar

## 11. Vercel Deploy

- [ ] Build laeuft erfolgreich durch
- [ ] Umgebungsvariablen in Vercel-Projekt gesetzt
- [ ] Deploy URL aufrufbar
- [ ] Login/Registrierung funktioniert
- [ ] Tasks laden aus Supabase
- [ ] Realtime-Updates funktionieren (zweites Fenster testen)

## 12. Rueckfallplan

- [ ] Lokale Datei-basierte Tasks bleiben als Fallback erhalten
- [ ] Bei Ausfall von Supabase wechselt die App automatisch auf lokale Tasks
- [ ] `isSupabaseConfigured()` gibt `false` zurueck wenn ENV-Variablen fehlen
- [ ] Kein Datenverlust bei Wechsel zwischen den Modi

---

## Hinweise

- Die App erkennt automatisch ob Supabase konfiguriert ist. Ohne ENV-Variablen
  laeuft sie im lokalen Datei-Modus.
- Realtime-Updates erfordern aktivierte Replication in Supabase.
- Storage-Uploads funktionieren nur mit korrekt konfigurierten Bucket-Policies.
- Bei Problemen: Supabase Dashboard > Logs pruefen.
