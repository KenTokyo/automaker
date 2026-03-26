---
title: Supabase-Login direkt im Projekt-Dialog
description: In der Projektverwaltung wurde ein direkter „Supabase verbinden“-Button mit E-Mail/Passwort eingebaut, damit Team-DB ohne Umweg aktiviert werden kann
date: 2026-03-26
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx
  - History/supabase-deploy-black-screen-verlauf.md
tags: [supabase, login, teamdb, ux, dialog]
---

## Zusammenfassung

Der Team-DB-Schalter war für Nutzerinnen und Nutzer ohne aktive Supabase-Session zu umständlich.  
Jetzt gibt es im selben Dialog einen direkten Verbindungsweg.

## Was wurde gemacht

1. Neuer Bereich im `ManageProjectsDialog`:
   - `Supabase verbinden` Button
   - E-Mail + Passwort Eingaben
   - `Jetzt verbinden` Button
2. Login direkt über `useSupabaseAuthStore.signIn(...)`.
3. Bessere Rückmeldung:
   - Erfolg: klare Bestätigung
   - Fehler: Meldung im Dialog + Toast
4. Team-DB-Hinweistext beim Klick ohne Session präzisiert.
5. TypeScript geprüft mit `npm run typecheck`.

## Ergebnis

- Supabase-Login ist direkt dort möglich, wo Team-DB aktiviert wird.
- Der Ablauf ist für lokale Nutzung (`localhost:3007`) deutlich einfacher.
