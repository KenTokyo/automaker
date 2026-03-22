---
title: Tasks Tab Phase 3 - Frontend Store & Hook
description: Implemented the frontend Zustand store state, actions, and React hook for the Tasks feature tab
date: 2026-03-18
status: completed
effort: medium
tags: [frontend, zustand, react-hook, tasks-tab, phase-3]
---

# Tasks Tab Phase 3 - Frontend Store & Hook

## Summary

Implemented Phase 3 of the Tasks Tab feature, adding frontend state management via Zustand store and a custom React hook for data fetching and WebSocket subscriptions.

## Changes Made

### 3.1 LeftPanelTab Extended

**File:** `apps/ui/src/store/types/ui-types.ts`

- Added `'tasks'` to the `LeftPanelTab` union type

### 3.2 App State Extended

**File:** `apps/ui/src/store/types/state-types.ts`

- Added imports for Task types from `@automaker/types`:
  - `Task`, `TaskFilter`, `TaskSortField`, `TaskSortOrder`
- Added state fields to `AppState`:
  - `tasks: Task[]`
  - `tasksLoading: boolean`
  - `tasksError: string | null`
  - `tasksFilter: TaskFilter`
  - `tasksSortField: TaskSortField`
  - `tasksSortOrder: TaskSortOrder`

### 3.3 App Actions Extended

**File:** `apps/ui/src/store/types/state-types.ts`

- Added action types to `AppActions`:
  - `setTasks`, `addTask`, `updateTaskInStore`, `removeTask`
  - `setTasksLoading`, `setTasksError`
  - `setTasksFilter`, `setTasksSortField`, `setTasksSortOrder`

### 3.4 App Store Implementation

**File:** `apps/ui/src/store/app-store.ts`

- Added initial state for tasks with sensible defaults
- Implemented all task actions following the same pattern as completedTasks

### 3.5 WebSocket Event Handlers

**File:** `apps/ui/src/lib/http-api-client.ts`

- Added event types: `'task:created' | 'task:updated' | 'task:deleted'`
- Added handler methods: `onTaskCreated`, `onTaskUpdated`, `onTaskDeleted`

### 3.6 Custom Hook Created

**File:** `apps/ui/src/hooks/use-tasks.ts` (NEW)

- Created `useTasks(projectPath, filter?, allProjects?)` hook
- Fetches from `/api/tasks?projectPath=...`
- Supports multi-project mode with `allProjects` parameter
- WebSocket event subscriptions for real-time updates
- Exports helper functions: `createTask`, `updateTask`, `deleteTask`

## Technical Notes

- The hook pattern follows `use-completed-tasks.ts` exactly for consistency
- WebSocket events match those defined in `libs/types/src/event.ts` (Phase 2)
- API endpoints match those in `apps/server/src/routes/tasks/` (Phase 2)
- TypeScript errors in UI will resolve after `npm run build:packages` rebuilds types

## Files Modified/Created

- `apps/ui/src/store/types/ui-types.ts` (modified)
- `apps/ui/src/store/types/state-types.ts` (modified)
- `apps/ui/src/store/app-store.ts` (modified)
- `apps/ui/src/lib/http-api-client.ts` (modified)
- `apps/ui/src/hooks/use-tasks.ts` (created)

## Dependencies

- Phase 1: Task types in `libs/types/src/task.ts`
- Phase 2: Server API in `apps/server/src/routes/tasks/`
- Phase 2: Event types in `libs/types/src/event.ts`

## Next Steps

Phase 4 should implement the Tasks panel UI component that:

- Uses the `useTasks` hook
- Displays task cards with status/priority/tags
- Allows creating, updating, and deleting tasks
- Integrates with the LeftPanelTab switching
