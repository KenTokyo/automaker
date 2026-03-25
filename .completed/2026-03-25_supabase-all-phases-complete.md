---
title: 'Supabase Team-Tasks: Alle Phasen 0-10 abgeschlossen'
description: 'Vollstaendige Implementierung des Supabase Team-Task-Systems mit DB-Schema, RLS, Auth, Projektfreigabe, DB-only Tasks, Kanban, Task-Chat Bridge, Bildanhänge, Notifications, Migration und Deploy-Vorbereitung'
date: 2026-03-25
status: success
effort: XL
---

## Gesamtergebnis

11 Phasen (0-10) vollstaendig implementiert in einer Session.

### Phase 0: Basis-Bugfix

- `t.tags is not iterable` Crash behoben

### Phase 1: Supabase Setup

- `@supabase/supabase-js` installiert
- Client-Library mit `getSupabaseClient()` + `isSupabaseConfigured()`
- Database Types, Auth Store, ENV-Konfiguration

### Phase 2: DB Schema + RLS

- 4 SQL-Migrationen (profiles, projects+members, tasks, attachments+notifications)
- RLS Policies fuer owner/editor/viewer
- Helper-Funktionen: `is_project_member()`, `can_edit_project()`
- Supabase Hooks fuer Tasks + Projekte

### Phase 3: Projektfreigabe UI

- Team-DB Toggle pro Projekt in ManageProjectsDialog
- Mitglieder-Dialog (einladen, Rolle aendern, entfernen)
- Auto-Erstellung von Supabase-Projekten bei Toggle

### Phase 4: DB-only Tasks

- `useTasksSource` Wrapper-Hook (auto-routing Supabase vs. Dateien)
- Status-Mapping (open<->todo, done<->completed)
- DB/Lokal Badge im Tasks-Panel

### Phase 5: Fullscreen Kanban

- 3-Spalten Board (Todo/In Progress/Completed)
- Task-Karten mit Priority, Tags, Status-Buttons
- Quick-Add pro Spalte
- Fullscreen Dialog

### Phase 6: Task-Chat Bridge

- "An Agent senden" Popover (Sofort / Modell waehlen)
- Bridge Store fuer Navigation
- TaskContextBadge im Chat

### Phase 7: Bilder + Storage

- STRG+V Bild-Upload nach Supabase Storage
- Attachment-Hook, Vorschau-Thumbnails, Lightbox
- Integration in Task-Create und Kanban

### Phase 8: Notifications + Realtime

- Bell-Popover mit Unread-Badge
- Realtime Notifications bei completed
- Toast-Benachrichtigungen (sonner)
- Refresh-Button

### Phase 9: Migration + Deploy

- Migrations-Skript (lokal -> Supabase)
- Migrations-Dialog mit Fortschritt
- Deploy-Checkliste (12 Punkte)

### Phase 10: Abschluss

- Alle Plaene aktualisiert
- TypeScript fehlerfrei
- Dark Neon Design durchgaengig

## Design

Durchgaengig Dark Neon: fast schwarze Hintergruende, kaum sichtbare Borders, Neon-Akzentfarben (Cyan, Emerald, Orange, Rose, Violet) fuer klar erkennbare Button-Funktionen.

## Naechste Schritte (manuell)

1. SQL-Migrationen in Supabase Dashboard ausfuehren
2. ENV-Variablen setzen (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. Realtime fuer tasks-Tabelle aktivieren
4. Ersten User registrieren + Projekt anlegen
5. Lokale Tasks migrieren (Button im Tasks-Panel)
