---
title: Agent Git Panel Commit Push
description: Git-Aktionen im Agent-View von Dialog auf Right-Panel umgestellt und direkte Commit/Push-Einstiege ergaenzt
date: 2026-03-30
status: success
effort: L
files:
  - apps/ui/src/store/types/ui-types.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/components/views/agent-view/hooks/use-agent-worktree-actions.ts
  - apps/ui/src/components/views/agent-view/components/git-panel.tsx
  - apps/ui/src/components/views/agent-view/components/right-panel-shell.tsx
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - plans/agent-git-panel-commit-push/2026-03-30-MASTER-PLAN.md
  - plans/agent-git-panel-commit-push/2026-03-30-PHASENPLAN.md
  - plans/agent-git-panel-commit-push/2026-03-30-PERFORMANCE-TESTPLAN.md
tags: [feature, ui]
---

## Zusammenfassung

Im Agent-View wurde der Git-Workflow so umgebaut, dass Aenderungen nicht mehr ueber einen separaten Dialog laufen, sondern direkt im Right-Panel bearbeitet werden koennen.

### Was wurde gemacht

- `RightPanelMode` um `git` erweitert und in die Right-Panel-Tableiste integriert.
- Neues `GitPanel` hinzugefuegt mit:
  - Branch- und Repo-Status,
  - Pull/Push/Refresh,
  - Commit (manuell),
  - Auto-Commit-Message,
  - Commit & Push,
  - Dateipfade + Diff-Ansicht.
- `use-agent-worktree-actions` angepasst:
  - `View Changes` oeffnet jetzt das Git-Panel,
  - `Commit` oeffnet jetzt das Git-Panel,
  - deprecated Commit-Toast entfernt.
- `AgentHeader` erweitert um direkte `Commit`- und `Push`-Buttons.
- Alter `ViewWorktreeChangesDialog` im Agent-View entfernt.

### Wichtige Entscheidungen

- Diff-Rendering wurde ueber bestehendes `GitDiffPanel` wiederverwendet, um Duplikatlogik zu vermeiden.
- Push-Quick-Button im Header nutzt vorhandene Push-/Upstream-Logik aus dem Worktree-Flow.
- Board-View wurde bewusst nicht geaendert, damit bestehende Board-Dialoge stabil bleiben.

### Hinweise

- Root-Script `npm run type-check` existiert nicht in diesem Repo; stattdessen erfolgreich mit `npm run typecheck` validiert.
- Manuelle UI-Checks fuer Performance/Usability im laufenden Fenster sind als naechster Schritt sinnvoll.
