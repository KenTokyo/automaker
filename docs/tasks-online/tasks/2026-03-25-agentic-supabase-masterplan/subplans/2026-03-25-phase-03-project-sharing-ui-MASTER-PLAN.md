# Phase 3 -- Projektfreigabe UI

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] DB/Freigabe-Schalter pro Projekt im Manage-Dialog einbauen
- [x] Mitgliederdialog (Einladen, Rolle, Entfernen)
- [x] Visuelles Feedback fuer Freigabezustand

## Betroffene Komponenten

- apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx (erweitert)
- apps/ui/src/components/views/agent-view/components/project-members-dialog.tsx (neu)

## Geaenderte/Erstellte Dateien

- `apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx` - Erweitert um Team-DB Switch und Mitglieder-Button pro Projektzeile
- `apps/ui/src/components/views/agent-view/components/project-members-dialog.tsx` - Neue Komponente fuer Mitgliederverwaltung (Einladen, Rolle aendern, Entfernen)

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten (TypeScript kompiliert fehlerfrei)
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Uebergabe-Notiz fuer Phase 4

- Die `useSupabaseProjects` Hook wird jetzt aktiv in `ManageProjectsDialog` genutzt
- Supabase task_projects werden ueber den `slug`-Feld mit dem lokalen Projektpfad (project.path) gemappt
- Wenn ein Projekt "Team-DB" aktiviert hat, existiert ein `task_project` in Supabase mit `slug = project.path`
- Phase 4 kann darauf aufbauen: Tasks eines Projekts werden ueber die `task_project.id` in Supabase gespeichert
- Die Members-Verwaltung ist komplett: Einladen per Email, Rollenauswahl (editor/viewer), Entfernen, Owner geschuetzt

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert: Team-DB Toggle (Switch + Database-Icon) pro Projekt im ManageProjectsDialog, ProjectMembersDialog mit vollstaendiger Mitgliederverwaltung (Einladen, Rolle aendern, Entfernen), visuelles Feedback (brand-Farbe bei aktivem Toggle, Loader bei Toggle-Aktion, Users-Button nur bei aktivem Team-DB)
- Offene Risiken: agent-header.tsx wurde nicht angefasst (war im Plan, aber die Freigabe-UI ist komplett im Dialog untergebracht)
