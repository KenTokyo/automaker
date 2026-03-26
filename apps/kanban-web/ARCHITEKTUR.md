# Kanban-Web Architektur

Standalone Kanban-Board Web-App, deployed auf Vercel. Kommuniziert direkt mit Supabase (Auth, DB, Realtime, Storage) - kein eigener Backend-Server.

**Live URL:** `https://automaker-kanban.vercel.app`
**Lokaler Dev-Port:** `http://localhost:3010`
**Supabase-Projekt:** `automaker-kanban-system` (Ref: `qqulocebmyqvwekeykyr`)

---

## Verzeichnisstruktur

```
apps/kanban-web/
├── src/
│   ├── components/
│   │   ├── session-manager/
│   │   │   ├── kanban-board.tsx          # 3-Spalten Board (To Do, In Progress, Completed)
│   │   │   ├── kanban-task-card.tsx       # Einzelne Task-Karte mit Expand/Collapse
│   │   │   └── kanban-quick-add.tsx       # Inline-Eingabe für schnelle Task-Erstellung
│   │   └── views/
│   │       └── supabase-kanban-standalone-view.tsx  # Haupt-View: Auth + Projekt-Auswahl + Board
│   ├── shims/
│   │   └── app-store.d.ts               # Type-Shims für fehlende Haupt-App-Abhängigkeiten
│   ├── kanban-web-app.tsx                # Root-Komponente (TooltipProvider + StandaloneView)
│   ├── main.tsx                          # React-Einstieg (#app Mount)
│   └── vite-env.d.ts                     # Env-Var Typen
├── .env / .env.local                     # Supabase Credentials
├── index.html                            # SPA Entry
├── package.json                          # Eigenständiges Package (@automaker/kanban-web)
├── tsconfig.json                         # TypeScript mit Path-Aliases
└── vite.config.mts                       # Build-Config mit Aliases nach @ui
```

---

## Wie es mit dem Haupt-Projekt verbunden ist

### Import-Aliases (vite.config.mts)

```
@    → ../ui/src          (Shared UI-Komponenten aus apps/ui)
@ui  → ../ui/src          (Alias-Alternative)
@kanban → ./src           (Lokale Kanban-Komponenten)
```

### Geteilte Abhängigkeiten aus `apps/ui/src/`

| Was                        | Pfad in apps/ui/src                                  |
| -------------------------- | ---------------------------------------------------- |
| Supabase Client            | `lib/supabase.ts`                                    |
| Supabase Typen             | `lib/supabase-types.ts`                              |
| Auth Store (Zustand)       | `store/supabase-auth-store.ts`                       |
| Tasks Hook (CRUD+Realtime) | `hooks/use-supabase-tasks.ts`                        |
| Projects Hook (CRUD)       | `hooks/use-supabase-projects.ts`                     |
| Attachments Hook           | `hooks/use-task-attachments.ts`                      |
| UI Komponenten             | `components/ui/button.tsx`, `input.tsx`, `badge.tsx` |
| Styles                     | `styles/global.css`, `theme-imports`, `font-imports` |

**Wichtig:** kanban-web hat KEINE eigenen Hooks/Stores - alles kommt aus `apps/ui`. Änderungen an diesen Dateien betreffen BEIDE Apps.

---

## Supabase-Datenbank Schema

### Tabellen (Migrations in `supabase/migrations/`)

| Tabelle                | Migration | Zweck                                        |
| ---------------------- | --------- | -------------------------------------------- |
| `profiles`             | 001       | User-Profile (sync mit auth.users)           |
| `task_projects`        | 002       | Projekte mit Owner + Slug                    |
| `task_project_members` | 002       | Rollen: owner / editor / viewer              |
| `tasks`                | 003       | Aufgaben mit Status, Priorität, Tags         |
| `task_attachments`     | 004       | Datei-Metadaten (Storage in Supabase Bucket) |
| `task_notifications`   | 004       | Benachrichtigungen bei Task-Abschluss        |

### RLS-Fixes

| Migration | Zweck                                               |
| --------- | --------------------------------------------------- |
| 005       | Fix RLS-Rekursion bei task_project_members Policies |
| 006       | Performance-Indexes + FK-Indexes für RLS-Policies   |

### Rollen-System (RLS enforced)

- **owner**: Vollzugriff, Mitglieder verwalten, Projekt löschen
- **editor**: Tasks erstellen, bearbeiten, löschen
- **viewer**: Nur lesen

### Realtime

- `tasks` Tabelle hat Realtime aktiviert
- `useSupabaseTasks` Hook abonniert `postgres_changes` Channel
- INSERT/UPDATE/DELETE Events werden live in UI reflektiert

---

## Authentifizierung

- Email/Password Auth via Supabase Auth
- `useSupabaseAuthStore` (Zustand) verwaltet Session
- `initialize()` prüft bestehende Session + URL-Hash für Email-Bestätigung
- Auth-Redirect-URL: `VITE_SUPABASE_AUTH_REDIRECT_URL`

---

## Datenfluss

```
User öffnet App
  → initialize() prüft Supabase Session
  → Nicht eingeloggt? → Login/Register Form
  → Eingeloggt? → Projects laden (useSupabaseProjects)
    → Projekt auswählen/erstellen
    → Tasks laden (useSupabaseTasks) + Realtime-Subscription
    → KanbanBoard rendert 3 Spalten
    → Status-Änderung → onUpdateTask → Supabase UPDATE
    → Realtime-Event → UI aktualisiert sich automatisch
```

---

## Deployment (Vercel)

### vercel.json (Root-Level)

```json
{
  "buildCommand": "npm run build:packages && npm run build --workspace=apps/kanban-web",
  "outputDirectory": "apps/kanban-web/dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### .vercelignore

Excludiert alles außer `apps/kanban-web/`, `apps/ui/` (Shared), und `libs/` (Shared Packages).

### Build-Reihenfolge

1. `npm run build:packages` → Baut @automaker/\* Libs
2. `npm run build --workspace=apps/kanban-web` → Baut Kanban-Web SPA
3. Output: `apps/kanban-web/dist/`

---

## Environment Variables

| Variable                          | Zweck                     | Dev-Wert                                   |
| --------------------------------- | ------------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`               | Supabase API URL          | `https://qqulocebmyqvwekeykyr.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`          | Öffentlicher Supabase Key | (in .env.local)                            |
| `VITE_SUPABASE_AUTH_REDIRECT_URL` | Auth-Email Redirect       | `http://localhost:3010/`                   |

---

## Verfügbare Tools (Claude Code)

| Tool                           | Zweck                                     |
| ------------------------------ | ----------------------------------------- |
| Supabase MCP                   | SQL ausführen, Migrations, Tabellen, Logs |
| Vercel CLI (`npx vercel`)      | Deploy, Preview, Env-Vars                 |
| `npm run dev:kanban-web`       | Lokaler Dev-Server (Port 3010)            |
| `npm run build:kanban-web`     | Production Build                          |
| `npm run typecheck:kanban-web` | TypeScript prüfen                         |

---

## Unterschied: Kanban im Haupt-App vs. Standalone

| Aspekt             | Haupt-App (apps/ui)                  | Standalone (apps/kanban-web)            |
| ------------------ | ------------------------------------ | --------------------------------------- |
| Zugang             | Intern (Electron/Web Dev)            | Öffentlich (Vercel Deploy)              |
| Auth               | Optional (Auto-Login möglich)        | Pflicht (Email/Password)                |
| Datenquelle        | Hybrid: Supabase ODER lokale Dateien | Nur Supabase                            |
| Task-Quellen-Logik | `useTasksSource` (auto-detect)       | Direkt `useSupabaseTasks`               |
| Agent-Integration  | "An Agent senden" Button             | Deaktiviert (`showSendToAgent={false}`) |
| Team-Rechte View   | Vollständig (team-rights-view.tsx)   | Nicht vorhanden                         |
| Kanban-Dialog      | Als Fullscreen-Dialog in TasksPanel  | Direkt als Hauptansicht                 |
| File-Attachments   | Ja                                   | Ja                                      |
| Realtime Updates   | Ja (wenn Supabase aktiv)             | Ja (immer)                              |

---

## Verwandte Views im Haupt-App

- **TasksPanel** (`apps/ui/src/components/session-manager/tasks-panel.tsx`): Sidebar mit Task-Liste, Filter, Kanban-Button
- **KanbanFullscreenDialog** (`apps/ui/src/components/session-manager/kanban-fullscreen-dialog.tsx`): Modal-Wrapper für Board
- **TeamRightsView** (`apps/ui/src/components/views/team-rights-view.tsx`): Projekt-/Rechte-Verwaltung
- **Board-Route** (`apps/ui/src/routes/board.tsx`): Deprecated, verlinkt auf Vercel-Deploy

---

## Wichtige Regeln bei Änderungen

1. **Shared Code betrifft beide Apps**: Hooks, Stores, UI-Komponenten in `apps/ui/src/` werden von Haupt-App UND kanban-web genutzt
2. **Kein Backend nötig**: kanban-web spricht direkt mit Supabase, niemals mit dem Express-Server
3. **Env-Vars doppelt pflegen**: `.env.local` in `apps/kanban-web/` UND Vercel Environment Settings
4. **RLS beachten**: Alle DB-Zugriffe gehen durch Row Level Security - neue Queries müssen Policy-kompatibel sein
5. **Realtime testen**: Nach Schema-Änderungen prüfen ob Realtime-Subscription noch funktioniert
6. **Migrations**: Neue Tabellen/Spalten → neue SQL-Migration in `supabase/migrations/` + via Supabase MCP anwenden
