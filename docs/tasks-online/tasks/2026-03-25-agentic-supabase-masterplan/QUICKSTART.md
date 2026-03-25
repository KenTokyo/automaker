# Supabase Team-Tasks - Kurzanleitung

## Ersteinrichtung

### 1. Supabase Projekt

- Dashboard oeffnen: https://supabase.com/dashboard
- Projekt `qqulocebmyqvwekeykyr` ist bereits erstellt

### 2. SQL ausfuehren

Im SQL Editor die Migrationen in Reihenfolge ausfuehren:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_task_projects.sql`
3. `supabase/migrations/003_tasks.sql`
4. `supabase/migrations/004_attachments_notifications.sql`

### 3. Realtime aktivieren

- Database > Replication > `tasks` Tabelle aktivieren

### 4. ENV setzen

In `.env` (oder Vercel/Deploy):

```
VITE_SUPABASE_URL=https://qqulocebmyqvwekeykyr.supabase.co
VITE_SUPABASE_ANON_KEY=<dein-anon-key>
```

### 5. Erster Login

- App starten
- Im Supabase Auth einen User registrieren
- In der App einloggen

## Taeglich nutzen

### Team-DB aktivieren

1. Projekte verwalten (Dialog oeffnen)
2. Bei einem Projekt den "Team-DB" Toggle aktivieren
3. Mitglieder per Email einladen (Editor/Viewer)

### Tasks erstellen

- Im Tasks-Panel: "+" Button
- Im Kanban: "+" Button pro Spalte
- STRG+V fuer Bild-Anhaenge

### Task an Agent senden

- Auf der Task-Karte: Raketen-Icon klicken
- "Sofort starten" oder "Modell waehlen..."
- Task wird automatisch auf "In Progress" gesetzt

### Kanban-Ansicht

- Im Tasks-Panel: Grid-Icon fuer Fullscreen-Kanban
- 3 Spalten: To Do, In Progress, Completed
- Pfeil-Buttons fuer schnellen Status-Wechsel

### Notifications

- Glocken-Icon im Tasks-Panel
- Zeigt an wenn jemand einen Task abschliesst
- Toast-Benachrichtigung bei neuen Events

### Migration

- Im Tasks-Panel: Upload-Icon (nur bei Supabase-Modus)
- Migriert lokale .automaker/tasks/ nach Supabase
- Duplikate werden automatisch uebersprungen
