# Phase 9 -- Migration, Rollout, Deploy

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: orchestrator
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] Bestehende lokale Tasks nach Supabase migrieren
- [x] Deploy-Variante fuer Web/Mobile aufsetzen
- [x] Go-Live Checkliste mit Rueckfallplan

## Betroffene Komponenten

- `apps/ui/src/lib/task-migration.ts` (NEU) -- Migrations-Logik
- `apps/ui/src/components/session-manager/task-migration-dialog.tsx` (NEU) -- Migrations-UI
- `apps/ui/src/components/session-manager/tasks-panel.tsx` (GEAENDERT) -- Migration-Button + Dialog-Integration
- `docs/tasks-online/tasks/2026-03-25-agentic-supabase-masterplan/DEPLOY-CHECKLIST.md` (NEU) -- Deploy-Checkliste

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert:
  - Migrations-Skript (`task-migration.ts`): Liest lokale Tasks via Server-API, mappt Status (open->todo, done->completed), erkennt Duplikate, schreibt nach Supabase mit Fortschritts-Callback
  - Migrations-Dialog (`task-migration-dialog.tsx`): Dunkles Design (bg-zinc-950), Violet Start-Button, Cyan-Fortschrittsbalken, Emerald/Rose Ergebnis-Anzeige, Fehler-Liste
  - Integration in `tasks-panel.tsx`: Violet ArrowUpFromLine-Button im Header (nur bei Supabase + Projekt), oeffnet Migration-Dialog, Refresh nach Migration
  - Deploy-Checkliste (`DEPLOY-CHECKLIST.md`): 12-Punkte-Checkliste von Supabase-Setup bis Rueckfallplan
- Offene Risiken:
  - Migration erfordert laufenden Backend-Server fuer lokale Task-API
  - Duplikat-Erkennung basiert auf Titel (case-insensitive), nicht auf Inhalt
