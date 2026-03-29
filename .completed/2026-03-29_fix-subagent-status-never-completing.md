---
title: Fix SubAgent status never updating to completed
description: Sub-agents stayed as running forever due to 3 combined bugs in server and client
date: 2026-03-29
status: success
effort: M
files:
  - apps/server/src/services/agent-service.ts
  - apps/ui/src/hooks/use-electron-agent.ts
tags: [bugfix]
---

## Root Cause Analysis

3 bugs combined to cause sub-agents to appear as permanently running with a loading spinner:

### Bug 1: `finalizeForegroundSubagents` missing events (SERVER)

Server-side `finalizeForegroundSubagents()` deleted sub-agents from the tracking map but **never emitted `subagent_stopped` events** to the client. Compare with `finalizeBackgroundSubagentsAfterParentStop()` which correctly emitted events.

### Bug 2: Background sub-agents not finalized on success (SERVER)

`finalizeBackgroundSubagentsAfterParentStop()` was only called in stop/error paths, **NOT in the success path**. Background sub-agents were never cleaned up after normal completion.

### Bug 3: Client safety-net skipped BG agents (CLIENT)

`markForegroundSubAgentsCompleted()` explicitly skipped agents with `runInBackground: true`, so even the client-side fallback couldn't mark them as done.

## Fixes Applied

1. **Server**: Added `subagent_stopped` event emission to `finalizeForegroundSubagents()` (now consistent with background finalizer)
2. **Server**: Added `finalizeBackgroundSubagentsAfterParentStop()` call in the success path (line 1122)
3. **Client**: Renamed `markForegroundSubAgentsCompleted` to `markAllRunningSubAgentsCompleted` - now marks ALL running agents as completed when parent finishes, acting as a safety-net

## Why 50+ minutes showing

The sub-agents were launched with `runInBackground: true` (visible by "BG" badge). When the parent session completed:

- Server deleted FG agents from map (no event sent)
- Server never cleaned up BG agents (not called in success path)
- Client's `complete` handler called `markForegroundSubAgentsCompleted` which skipped BG agents
- Result: All 3 BG sub-agents stayed as "running" indefinitely with elapsed time ticking
