---
title: Tasks Tab UI Components (Phase 4)
description: Implemented frontend UI components for the Tasks tab including TasksPanel, TaskCard, TaskCreateDialog, TasksFilterBar, and task-utils
date: 2026-03-18
status: success
effort: L
tags:
  - frontend
  - ui
  - tasks
  - react
---

## Summary

Phase 4 of the Tasks system implementation is complete. This phase added all frontend UI components for the Tasks tab in the session manager sidebar.

## Components Created

### 1. task-utils.ts

**Path:** `apps/ui/src/components/session-manager/task-utils.ts`

Utility functions for task cards providing:

- Status color mappings (open=sky, in_progress=amber, done=emerald)
- Priority color mappings (P1=red, P2=orange, P3=yellow, P4=muted)
- Status and priority label functions (German labels)
- Sort order helpers for priority and status
- Relative time formatting (German)

### 2. TasksFilterBar

**Path:** `apps/ui/src/components/session-manager/tasks-filter-bar.tsx`

Filter and sort controls similar to `completed-tasks-filter-bar.tsx`:

- Status filter popover (open, in_progress, done)
- Priority filter popover (P1, P2, P3, P4)
- Dynamic tag filter popover (extracted from tasks)
- Sort dropdown (date, title, priority, status with asc/desc)
- Uses Popover from shadcn/ui

### 3. TaskCard

**Path:** `apps/ui/src/components/session-manager/task-card.tsx`

Individual task card component following `completed-task-card.tsx` patterns:

- Checkbox toggle (open <-> done)
- Priority dot indicator
- Title with strikethrough when done
- Status/Priority/Tag badges
- Expandable description/summary section
- Action buttons (status cycle, copy, edit, delete) with hover reveal
- Relative time footer
- Copy to clipboard with formatted markdown

### 4. TaskCreateDialog

**Path:** `apps/ui/src/components/session-manager/task-create-dialog.tsx`

Dialog for creating/editing tasks:

- Title input (required)
- Description input (optional short text)
- Status selector (only in edit mode)
- Priority selector with colored dots
- Tags input (comma-separated with chip preview)
- Markdown body textarea
- Edit mode support (pre-fills fields when editTask provided)
- Uses Dialog, Input, Textarea, Button from shadcn/ui

### 5. TasksPanel

**Path:** `apps/ui/src/components/session-manager/tasks-panel.tsx`

Main panel component following `completed-tasks-panel.tsx` patterns:

- Header with title, task count, new task button, refresh button
- Project filter dropdown (multi-project support)
- Search input with debounce
- Filter bar integration
- Task cards list with scroll
- Empty state with create CTA
- Loading state with spinner
- Error state with retry button
- No results state with filter reset
- Stats footer (X tasks -- Y open -- Z in progress -- W done)
- Full integration with `useTasks` hook and Zustand store

## Architecture Notes

- All components follow existing patterns from completed-tasks components
- Uses `useTasks(projectPath, filter, allProjects)` hook from Phase 3
- Integrates with Zustand store via `useAppStore` with `useShallow`
- Client-side filtering and sorting (supplements server-side)
- Multi-project mode support (loads tasks from all registered projects)
- WebSocket real-time updates via existing hook infrastructure

## Files Changed/Created

- `apps/ui/src/components/session-manager/task-utils.ts` (NEW)
- `apps/ui/src/components/session-manager/tasks-filter-bar.tsx` (NEW)
- `apps/ui/src/components/session-manager/task-card.tsx` (NEW)
- `apps/ui/src/components/session-manager/task-create-dialog.tsx` (NEW)
- `apps/ui/src/components/session-manager/tasks-panel.tsx` (NEW)

## Dependencies

- Requires `@automaker/types` package rebuild to include task.ts types
- Uses existing hooks: `useTasks`, `useAppStore`
- Uses existing UI components: Button, Input, Textarea, Badge, Dialog, Popover
- Uses lucide-react icons

## Next Steps (Phase 5)

Integration of TasksPanel into the session manager tab system to make it accessible via "Tasks" tab alongside "Sessions", "Docs", and "Done" tabs.
