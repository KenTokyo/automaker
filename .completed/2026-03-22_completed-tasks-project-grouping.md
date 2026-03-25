---
title: Completed Tasks Tab: Project Grouping + Cleanup Button
description: Refactored Fertig tab to group tasks by project with show-more and bulk-delete cleanup
date: 2026-03-22
status: success
effort: M
files:
  - apps/server/src/routes/completed-tasks/index.ts
  - apps/server/src/routes/completed-tasks/handlers.ts
  - apps/ui/src/hooks/use-completed-tasks.ts
  - apps/ui/src/components/session-manager/completed-tasks-panel.tsx
  - apps/ui/src/components/session-manager/completed-task-project-group.tsx
tags: [feature, ui, performance]
---

## Changes

### Backend

- Added `POST /api/completed-tasks/bulk-delete` endpoint for deleting multiple tasks at once
- Accepts `{ projectPath, filenames[] }` body, emits individual WebSocket delete events

### Frontend

- **New Component**: `CompletedTaskProjectGroup` - collapsible tree node per project
  - Shows 3 tasks initially (INITIAL_VISIBLE = 3)
  - "Show more" loads 10 at a time (LOAD_MORE_COUNT = 10)
  - Per-project cleanup button appears on hover when > 20 tasks (MAX_TASKS_KEEP = 20)
- **Refactored** `CompletedTasksPanel`:
  - Removed flat list, replaced with project-grouped tree view
  - Removed old project filter dropdown (no longer needed with grouping)
  - Added global cleanup button in header showing total deletable count
  - Auto-expands current project on first load
- Added `bulkDeleteCompletedTasks()` API helper function

### Performance

- Only 3 cards rendered per project initially (vs 100+ before)
- Lazy loading via show-more prevents DOM bloat
- Cleanup button reduces stored files on disk
