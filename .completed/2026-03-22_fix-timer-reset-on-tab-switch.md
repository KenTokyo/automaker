---
title: Fix timer reset on tab switch in session list
description: Fixed useElapsedTime hook so the fallback timestamp survives unmount/remount when switching left-panel tabs
date: 2026-03-22
status: success
effort: S
files:
  - apps/ui/src/hooks/use-elapsed-time.ts
  - apps/ui/src/components/session-manager/session-list-item.tsx
tags: [bugfix, ui]
---

## Problem

The elapsed time timer in SessionListItemRow reset to 0:00 when switching between left-panel tabs (e.g. Sessions -> Fertig -> back). This happened because the component unmounted on tab switch, destroying the `useRef`-based `localFallbackRef` that stored the fallback start timestamp.

The `localFallbackRef` is used when `isRunning` is true but `lastStartedAt` hasn't arrived from the server yet (e.g. `isCurrentSessionThinking` is true before the session list refetches). On remount, a new `Date.now()` was set, making the timer appear to restart from 0.

## Solution

- Added a **module-level `Map<string, number>`** (`fallbackTimestampCache`) in `use-elapsed-time.ts`, keyed by `sessionId`.
- On mount, the hook restores any cached fallback timestamp instead of creating a new `Date.now()`.
- On session stop (`!isRunning`), the cache entry is cleaned up.
- Added an optional `sessionId` parameter to `useElapsedTime()` (backwards compatible).
- Updated the call site in `session-list-item.tsx` to pass `session.id`.
