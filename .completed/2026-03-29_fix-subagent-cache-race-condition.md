---
title: Fix SubAgent state cache race condition on session switch
description: Fixed sub-agent indicators leaking across chat sessions by adding prevSessionIdRef guard and running sub-agent max-age cleanup.
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/hooks/use-electron-agent.ts
tags: [bugfix, ui]
---

## Problem

SubAgentIndicator showed active sub-agents even in new/fresh chat sessions. This is the 4th fix attempt for this recurring issue (previous fixes from 2026-03-26 and 2026-03-29 addressed other aspects but missed this root cause).

## Root Cause (Ultrathink Deep Analysis)

The `subAgentStateCache` (module-level Map) combined with React effect execution ordering caused a **write-before-read race condition**:

1. When switching from Session A (with sub-agents) to Session B (new), both the write-cache effect and the init effect fire because `sessionId` changed
2. React effects fire in definition order: the **write-cache effect** (defined first) fires **BEFORE** the init effect
3. The write-cache effect writes Session A's stale `activeSubAgents` under Session B's cache key
4. The init effect then calls `readCachedSubAgents(B)` and gets Session A's stale data back
5. Result: New session shows old sub-agents

### Timeline of the race:

```
sessionId changes: A -> B
  Effect 1 (write-cache): sessionId=B, activeSubAgents=[A's agents] -> WRITES A's data under B's key!
  Effect 2 (init): readCachedSubAgents(B) -> READS A's data back!
```

## Fixes Applied

### 1. prevSessionIdRef guard (primary fix)

Added a `prevSessionIdRef` to detect when the sessionId just changed. The write-cache effect now **skips writing** on the first trigger after a session switch, preventing stale data from being cached under the wrong session key.

### 2. Running sub-agent max-age cleanup (safety net)

Added `RUNNING_CACHE_MAX_AGE_MS` (10 min) to `readCachedSubAgents()` to filter out orphaned "running" sub-agents that were never marked completed. Previously only completed sub-agents had a TTL (5 min).

### 3. Debug logging

Added `logger.debug` in the init effect when restoring sub-agents to aid future debugging.

## Previous Fix Attempts

1. 2026-03-26: Excluded sub-agent sessions from reuse in "New" button flow
2. 2026-03-29: Added setActiveSubAgents([]) on empty sessionId + sessionIdRef double-check in stream handler + 5min TTL for completed cache entries
3. 2026-03-29: Server-side finalizeForegroundSubagents in error path + stale subagent cleanup

## Verification

TypeScript compilation passes with zero errors.
