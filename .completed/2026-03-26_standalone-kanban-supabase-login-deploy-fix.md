---
title: Standalone Kanban mit eigenem Supabase-Login
description: Alter Server-Login-Flow fuer Vercel deaktiviert und reine Supabase-Kanban-Seite live geschaltet
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/app.tsx
  - apps/ui/src/components/views/supabase-kanban-standalone-view.tsx
  - apps/ui/src/components/session-manager/kanban-board.tsx
  - apps/ui/src/components/session-manager/kanban-task-card.tsx
  - apps/ui/src/store/supabase-auth-store.ts
  - apps/ui/src/vite-env.d.ts
  - vercel.json
  - History/supabase-deploy-black-screen-verlauf.md
tags: [supabase, login, deploy, kanban, vercel]
---

## Zusammenfassung

Die Live-Seite zeigte den alten Login-/Server-Check (`Connecting to server`, `/logged-out`), obwohl nur das neue Kanban deployt werden sollte.  
Ursache war, dass weiterhin der alte App-Flow aktiv war, der JSON von alten API-Routen erwartete.

## Was wurde gemacht

1. Standalone-Deploy-Schalter aktiviert:
   - `VITE_KANBAN_STANDALONE=true` im Build (`vercel.json`).
2. Eigene Supabase-Ansicht erstellt:
   - Login + Registrierung per E-Mail/Passwort.
   - Projekt-Auswahl und Projekt-Anlage.
   - Kanban-Board direkt gegen Supabase-Tabellen.
3. App-Entry angepasst:
   - Bei Standalone-Flag wird nur die neue Supabase-Kanban-Ansicht gerendert.
4. Kleine Stabilitätsverbesserung:
   - Supabase-Auth-Store initialisiert jetzt robust mit Error-Handling und sauberem Listener-Unsubscribe.
5. Production-Deploy erneut ausgeführt und auf `automaker-kanban.vercel.app` aliasiert.

## Ergebnis

- Live-URL zeigt den eigenen Kanban-Login statt altem Server-Check.
- JSON-Parser-Fehler aus dem alten `/api/auth/status`-Flow werden im neuen Haupt-Flow nicht mehr ausgelöst.
- Typecheck war vor Deploy erfolgreich.
