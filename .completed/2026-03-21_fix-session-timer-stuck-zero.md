---
title: Fix session elapsed time timer stuck at 0:00
description: Fixed useElapsedTime hook to use local fallback timestamp when lastStartedAt is not yet available from backend
date: 2026-03-21
status: success
effort: S
files:
  - apps/ui/src/hooks/use-elapsed-time.ts
tags: [bugfix, ui]
---

## Problem

The elapsed time timer in SessionListItemRow always showed "0:00" because of a race condition:

1. `isRunning` was set to `true` via `isCurrentSessionThinking` before the session list refetched with the updated `lastStartedAt` timestamp from the backend
2. The `useElapsedTime` hook required BOTH `isRunning && lastStartedAt` to start the timer interval
3. Since `lastStartedAt` was `undefined` at the moment `isRunning` became true, the hook fell back to `base` (0ms) and showed "0:00"
4. Even when `lastStartedAt` eventually arrived, the `setInterval` condition also required both flags

## Fix

- Added a `localFallbackRef` that captures `Date.now()` when `isRunning` becomes true but `lastStartedAt` is not yet available
- The `computeElapsed` function now uses `lastStartedAt` if available, otherwise falls back to the local timestamp
- The `setInterval` now starts whenever `isRunning` is true (not only when `lastStartedAt` is set)
- When `lastStartedAt` eventually arrives via refetch, the hook seamlessly switches to the server timestamp
- When `isRunning` becomes false, the local fallback is cleared
