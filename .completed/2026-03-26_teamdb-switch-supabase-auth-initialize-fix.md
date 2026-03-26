---
title: Team-DB-Switch robust gegen fehlende Supabase-Session gemacht
description: Fehler beim Aktivieren der Team-DB behoben, indem Supabase-Auth im vollen App-Flow sicher initialisiert und klarere Fehlermeldungen angezeigt werden
date: 2026-03-26
status: success
effort: S
files:
  - apps/ui/src/hooks/use-supabase-projects.ts
  - apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx
  - History/supabase-deploy-black-screen-verlauf.md
tags: [supabase, teamdb, auth, ux, bugfix]
---

## Zusammenfassung

Beim Umschalten des Team-DB-Switches in der vollen App kam oft ein generischer Fehler, weil keine aktive Supabase-Session im Store vorhanden war. Der Flow wurde so angepasst, dass die Auth-Initialisierung zuverlässig läuft und die Nutzerin bzw. der Nutzer klare Rückmeldung bekommt.

## Was wurde gemacht

1. Auth-Init ergänzt:
   - `useSupabaseProjects` initialisiert Supabase-Auth automatisch, wenn nötig.
2. Fehler klar gemacht:
   - Ohne Supabase-User wird jetzt explizit `Nicht bei Supabase angemeldet.` gesetzt.
3. Dialog abgesichert:
   - In `ManageProjectsDialog` wird Supabase-Auth beim Öffnen initialisiert.
   - Bei Klick ohne Login kommt eine verständliche Meldung mit Handlungshinweis.
   - Supabase-Fehlertext wird bevorzugt im Toast angezeigt.
4. Prüfung:
   - `npm run typecheck` erfolgreich.

## Ergebnis

- Team-DB-Switch bricht nicht mehr still mit generischem Fehler ab.
- Nutzerinnen und Nutzer sehen direkt, ob ein Supabase-Login fehlt.
- Rollen-/RLS-Verhalten bleibt unverändert und korrekt owner-basiert.
