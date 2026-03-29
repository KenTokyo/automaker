# Agent Git Panel Commit Push - Master Plan

## Ziel

Im Agent-View sollen Commit und Push direkt funktionieren, der alte "Use the Kanban Board..."-Blocker wegfallen, und "View Changes" statt Dialog als eigenes Right-Panel verfuegbar sein.

## Problem

Der aktuelle Commit-Einstieg im Agent-Header/Dropdown ist deaktiviert (Deprecated-Hinweis), und Aenderungen werden nur ueber einen Dialog gezeigt.

## Loesungsweg

Wir bauen einen dedizierten Git-Tab im Right Panel, verdrahten Commit/Push-Logik direkt auf die bestehenden Worktree-APIs, und entfernen den View-Changes-Dialog im Agent-View.

## Status

- [x] Phase 1 - Planung + Plumbing
- [x] Phase 2 - Git-Panel UI + Aktionen
- [x] Phase 3 - Header/Dropdown Integration + Dialog-Ablosung
- [x] Phase 4 - Validierung + Doku-Abschluss

## Referenzen

- `apps/ui/src/components/views/agent-view/hooks/use-agent-worktree-actions.ts`
- `apps/ui/src/components/views/agent-view/components/agent-header.tsx`
- `apps/ui/src/components/views/agent-view/components/right-panel-shell.tsx`
- `apps/ui/src/components/ui/git-diff-panel.tsx`
- `apps/ui/src/components/views/board-view/dialogs/commit-worktree-dialog.tsx`
- `apps/ui/src/components/views/board-view/dialogs/view-worktree-changes-dialog.tsx`
