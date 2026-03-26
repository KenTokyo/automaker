---
title: Team & Rechte Seite mit Projekt-Zuständigkeit
description: Eigene Sidebar-Seite für Team-DB, Owner-Zuständigkeit und Rollenverwaltung pro Projekt
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts
  - apps/ui/src/components/views/team-rights-view.tsx
  - apps/ui/src/routes/team-rights.tsx
  - History/team-rechte-verwaltung-verlauf.md
tags: [feature, ui]
---

## Zusammenfassung

Es wurde ein eigener Bereich für Team- und Rechteverwaltung umgesetzt, damit
Projekt-Zuständigkeiten nicht mehr im Hintergrund oder nur über SQL gepflegt
werden müssen.

### Was wurde gemacht

- Neuer Sidebar-Eintrag `Team & Rechte` ergänzt.
- Neue Route `/team-rights` und neue View erstellt.
- In der View:
- Supabase-Verbindungsbereich (Anmelden/Abmelden)
- Übersicht über alle lokalen Projekte
- Team-DB-Schalter je Projekt
- Sichtbarer Owner je Projekt (Zuständigkeit)
- Mitgliederanzahl je Projekt
- Suche über Projektname, Pfad oder Owner
- Rollenverwaltung über den bestehenden Mitglieder-Dialog integriert

### Wichtige Entscheidungen

- Bestehende Hook-Logik (`useSupabaseProjects`) wurde wiederverwendet, damit
  Rollenlogik nicht doppelt implementiert wird.
- Owner-Transfer und Rollenänderung bleiben im vorhandenen Mitglieder-Dialog,
  damit die Berechtigungslogik konsistent bleibt.
- Die Seite zeigt klare, einfache Rollen-Erklärungen (Owner, Editor, Viewer),
  damit das Team ohne SQL arbeiten kann.
