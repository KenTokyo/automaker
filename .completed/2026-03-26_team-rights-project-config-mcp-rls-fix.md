---
title: Team-&-Rechte-Seite um Projekt-Config erweitert und RLS-Fix live
description: Team-Rechte-Seite hat jetzt volle Projektverwaltung und Supabase-RLS-Rekursionsfehler wurde per MCP behoben
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/views/team-rights-view.tsx
  - apps/ui/src/components/views/team-rights-view/project-config-card.tsx
  - History/supabase-mit-mcp-team-page-zu-project-configs-erzngzen-fehle.md
  - History/team-rechte-verwaltung-verlauf.md
  - supabase/migrations/005_fix_task_project_members_rls_recursion.sql
tags: [feature, bugfix, ui]
---

## Zusammenfassung

Die gewünschte Zusammenführung von Team-Rechten und Projekt-Konfiguration wurde
auf der Seite `Team & Rechte` umgesetzt. Zusätzlich wurde der Slider-Fehler
durch eine fehlende Supabase-Migration live behoben.

### Was wurde gemacht

- Supabase per MCP geprüft:
  - Migrationen gelesen
  - Fehlende Migration `005_fix_task_project_members_rls_recursion` erkannt
  - Migration live auf Projekt `qqulocebmyqvwekeykyr` angewendet
- Team-&-Rechte-Seite erweitert um Projekt-Config:
  - Tabs: `Alle`, `Versteckt`, `Papierkorb`
  - Aktionen: Ausblenden, Papierkorb, Wiederherstellen, Endgültig löschen
  - Globale Aktion: Papierkorb leeren
  - Projekt hinzufügen
  - Projekt bearbeiten (EditProjectDialog)
  - UI-Block in eigene Komponente ausgelagert, damit `team-rights-view.tsx` unter 700 Zeilen bleibt
- Stabilitäts-Fixes nach Schnell-Review:
  - Passwort wird beim Login nicht mehr getrimmt
  - Enter-Login wird bei laufender Verbindung blockiert (kein Doppel-Submit)
  - Mitglieder-Dialog wird bei Supabase-Logout sauber geschlossen
  - kein doppelter/staler Nachlade-Call direkt nach `refetchSupabaseProjects()`
- Bestehende Team-Funktionen unverändert beibehalten:
  - Team-DB Toggle
  - Owner/Zuständigkeit
  - Mitgliederverwaltung inkl. Owner-Übergabe

### Wichtige Entscheidungen

- Bestehende Store-/Dialog-Logik wurde wiederverwendet statt Parallel-Implementierung.
- Der RLS-Fix wurde als echte DB-Migration angewendet (nicht nur lokal), damit
  der Slider im echten Projekt sofort stabil ist.
