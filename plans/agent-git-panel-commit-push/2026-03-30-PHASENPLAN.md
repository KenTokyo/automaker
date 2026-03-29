# Agent Git Panel Commit Push - Phasenplan

## Phase 1 - Planung + Plumbing

- Ziel: Architektur festziehen und bestehende Hook/Store-Flows auf Git-Panel-Route umstellen.
- Risiko: RightPanelMode-Erweiterung kann bestehende Tabs/Split-Logik beeinflussen.
- Test: Type-Check + manueller Wechsel zwischen Dateien/Terminal/Uebersicht/Git.
- Nutzen: Deprecated-Commit-Blocker ist entfernt, Actions zeigen in den neuen Zielbereich.
- Status: Erledigt
- Ergebnis:
  - `RightPanelMode` um `git` erweitert.
  - Hook `use-agent-worktree-actions` oeffnet fuer `View Changes` und `Commit` jetzt das Git-Panel.
  - Deprecated Commit-Toast im Agent-Flow entfernt.

## Phase 2 - Git-Panel UI + Aktionen

- Ziel: Neues Git-Panel mit Branch-Info, Dateiliste, Diff-Ansicht und Commit-Message-Feld (manuell + auto).
- Risiko: Doppel-Toast/inkonsistente Pending-States bei Commit + Push.
- Test: Commit, Push, Commit+Push, Pull, Auto-Message in Haupt-Worktree durchspielen.
- Nutzen: Git-Aktionen sind direkt im Agent-View ohne Umweg moeglich.
- Status: Erledigt
- Ergebnis:
  - Neues `git-panel.tsx` erstellt.
  - Enthalten: Pull, Push, Refresh, Commit, Commit & Push, Auto-Commit-Message.
  - Geaenderte Pfade und Diff-Ansicht (via `GitDiffPanel`) integriert.

## Phase 3 - Header/Dropdown Integration + Dialog-Ablosung

- Ziel: Header-Buttons fuer Commit/Push, Dropdown-Flow auf Git-Panel lenken, View-Changes-Dialog aus Agent-View entfernen.
- Risiko: Board-View darf dabei nicht regressieren.
- Test: Agent-View und Board-View getrennt pruefen (UI-Aktionen + Dialoge).
- Nutzen: Einheitlicher Einstiegspunkt fuer Git-Aenderungen im Agent-View.
- Status: Erledigt
- Ergebnis:
  - Commit- und Push-Quick-Buttons im Agent-Header ergaenzt.
  - Agent-View `ViewWorktreeChangesDialog` entfernt.
  - Right Panel Tableiste enthaelt jetzt auch `Git`.

## Phase 4 - Validierung + Doku-Abschluss

- Ziel: Type-Check, Planstatus updaten, Verlauf und Completed-Doku schreiben.
- Risiko: Dirty Worktree darf nicht mit fremden Aenderungen kollidieren.
- Test: `npm run type-check`.
- Nutzen: Nachvollziehbarer Abschluss mit klarer Dokumentation.
- Status: Erledigt
- Ergebnis:
  - Type-Check erfolgreich mit `npm run typecheck` (Root-Script-Name im Projekt).
  - Planstatus aktualisiert.
  - Verlaufs- und `.completed`-Doku erstellt.
