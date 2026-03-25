# Phase 4 -- DB-only Task-Datenfluss

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] Tasks und Completed auf Supabase als Primaerquelle umstellen
- [x] Dateibasierte Task-Schreibpfade als Fallback beibehalten
- [x] Fallback-Strategie fuer Migration definieren

## Betroffene Komponenten

- apps/ui/src/hooks/use-tasks.ts (unveraendert, weiterhin als Fallback genutzt)
- apps/ui/src/hooks/use-completed-tasks.ts (unveraendert, weiterhin als Fallback genutzt)
- apps/ui/src/hooks/use-supabase-tasks.ts (unveraendert, genutzt als DB-Quelle)
- apps/ui/src/hooks/use-supabase-projects.ts (unveraendert, genutzt fuer Projekt-Lookup)

### Neu erstellt

- apps/ui/src/hooks/use-tasks-source.ts -- Unified Wrapper-Hook mit Auto-Routing

### Geaendert

- apps/ui/src/components/session-manager/tasks-panel.tsx -- Nutzt jetzt useTasksSource statt direkt useTasks

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten (TypeScript fehlerfrei)
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Implementierungsdetails

### useTasksSource Hook (use-tasks-source.ts)

- Entscheidungslogik: isSupabaseConfigured() UND User eingeloggt UND passendes Supabase-Projekt vorhanden => DB, sonst => Datei
- Status-Mapping: open<->todo, in_progress<->in_progress, done<->completed
- ID-Mapping: Supabase UUID wird in das `filename`-Feld gemappt fuer Kompatibilitaet
- Beide Sub-Hooks werden immer aufgerufen (React Rules of Hooks), aber nur der aktive wird konsumiert
- Idle-Hook macht keine Netzwerk-Requests (Supabase bricht bei leerem projectId ab)

### TasksPanel Aenderungen

- DataSourceBadge: Zeigt "DB" (cyan) oder "Lokal" (grau) neben der Task-Anzahl
- Projekt-Filter nur im File-Modus sichtbar (im DB-Modus ist das Projekt bereits festgelegt)
- CRUD-Operationen laufen ueber sourceCreate/sourceUpdate/sourceDelete vom Hook

### TaskCard (task-card.tsx)

- Keine Aenderungen noetig: nutzt `task.filename` als Identifier, was im DB-Modus die UUID ist
- Status-Cycle open->in_progress->done funktioniert, Mapping geschieht im Hook

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert: Unified Task-Datenquelle mit Auto-Routing zwischen Supabase und Dateien, DB/Lokal-Badge, TypeScript fehlerfrei
- Offene Risiken:
  - CompletedTasks (Done-Tab) noch nicht umgestellt -- braucht eigenen Wrapper-Hook analog zu useTasksSource
  - Server-seitige Task-Routen (apps/server/src/routes/tasks/\*) nicht geaendert, da der DB-Pfad client-seitig direkt mit Supabase kommuniziert
  - Multi-Projekt-Modus im DB-Pfad zeigt nur Tasks des aktuellen Projekts (kein Cross-Projekt-View wie im Datei-Modus)
