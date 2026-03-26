---
title: RLS-Recursion-Fix und Owner-Übergabe in der UI
description: Supabase 500-Fehler durch rekursive Policy behoben und Owner-Rechte jetzt direkt über den Mitglieder-Dialog übertragbar gemacht
date: 2026-03-26
status: success
effort: M
files:
  - supabase/migrations/005_fix_task_project_members_rls_recursion.sql
  - apps/ui/src/hooks/use-supabase-projects.ts
  - apps/ui/src/components/views/agent-view/components/project-members-dialog.tsx
  - apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx
  - apps/ui/src/lib/supabase-types.ts
  - History/supabase-deploy-black-screen-verlauf.md
tags: [supabase, rls, policy, owner, ui, teamdb]
---

## Zusammenfassung

Der Team-DB-Flow scheiterte mit `500 Internal Server Error`, weil eine RLS-Policy auf `task_project_members` rekursiv ausgewertet wurde.  
Zusätzlich fehlte eine einfache UI für Owner-Wechsel.

## Was wurde gemacht

1. Migration 005 ergänzt:
   - Rekursive Select-Policy ersetzt.
   - Policy nutzt jetzt `public.is_project_member(...)`.
2. Hook erweitert:
   - `useSupabaseProjects` liefert bei Recursion-Fehlern klare Hinweise.
   - Neue Funktion `transferOwnership(projectId, newOwnerUserId)`.
3. Mitglieder-Dialog erweitert:
   - Owner-Rechte können per Button an ein Mitglied übertragen werden.
4. Manage-Dialog verbunden:
   - Neue Übergabe-Funktion wird in den Mitglieder-Dialog gereicht.
5. Typen angepasst:
   - `owner_id` in `task_projects.Update` ergänzt.
6. Typecheck:
   - `npm run typecheck` erfolgreich.

## Ergebnis

- Team-DB hat einen klaren Fix für die Supabase-Policy.
- Rechteverwaltung ist lokal in der UI nutzbar, statt SQL manuell auszuführen.
