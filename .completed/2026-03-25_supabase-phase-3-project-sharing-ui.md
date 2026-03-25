---
title: 'Supabase Phase 3: Projektfreigabe UI'
description: 'Team-DB Toggle und Mitgliederverwaltungs-Dialog im ManageProjectsDialog implementiert'
date: '2026-03-25'
status: 'completed'
effort: 'medium'
---

## Zusammenfassung

Phase 3 des Supabase-Masterplans wurde umgesetzt. Die ManageProjectsDialog-Komponente wurde um Team-DB-Funktionalitaet erweitert und eine neue ProjectMembersDialog-Komponente wurde erstellt.

## Aenderungen

### manage-projects-dialog.tsx (erweitert)

- Team-DB Switch/Toggle pro Projektzeile (nur sichtbar wenn Supabase konfiguriert)
- Database-Icon zeigt visuell den Freigabezustand an (brand-Farbe bei aktiv)
- Users-Button zum Oeffnen des Mitglieder-Dialogs (nur bei aktivem Team-DB)
- Automatische Erstellung eines `task_project` in Supabase beim Aktivieren
- Automatisches Loeschen beim Deaktivieren
- Loading-Spinner waehrend Toggle-Aktion
- Dialog von `sm:max-w-lg` auf `sm:max-w-xl` verbreitert fuer zusaetzliche Controls

### project-members-dialog.tsx (neu)

- Vollstaendiger Mitgliederverwaltungs-Dialog
- Mitgliederliste mit Email, Rolle und Entfernen-Button
- Einladen per Email mit Rollenauswahl (Editor/Viewer)
- Rollenauswahl per Select-Dropdown (aenderbar fuer Editor/Viewer)
- Owner-Rolle ist nicht aenderbar (angezeigt als goldenes Badge)
- Eigenes Konto mit "(du)" markiert, kann sich nicht selbst entfernen
- Rollen-Legende am unteren Rand
- Enter-Taste zum schnellen Einladen

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx`
- `apps/ui/src/components/views/agent-view/components/project-members-dialog.tsx`
- `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/subplans/2026-03-25-phase-03-project-sharing-ui-MASTER-PLAN.md`
