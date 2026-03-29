---
title: Fix SubAgent state leaking across chat sessions
description: Sub-Agent indicators from one chat session were shown in other sessions. Fixed session isolation in useElectronAgent hook.
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/hooks/use-electron-agent.ts
tags: [bugfix, ui]
---

## Problem

SubAgentIndicator showed sub-agents from other chat sessions in every chat, including new ones. When switching from a chat with active sub-agents to a new/different chat, the sub-agent block was still visible.

## Root Cause

3 interconnected issues in `use-electron-agent.ts`:

1. **Missing reset on empty sessionId**: When `sessionId` was `''` (no session selected), `setActiveSubAgents([])` was not called, leaving stale state from the previous session render.
2. **Race condition in stream handler**: Stream events from an old session could still update state after a session switch, because React's effect cleanup is asynchronous.
3. **Stale cache entries**: Completed sub-agent data persisted in the `subAgentStateCache` Map indefinitely, causing old data to reappear when revisiting a session.

## Fixes Applied

1. **Added `setActiveSubAgents([])`** to the no-session reset block (when `!sessionId`)
2. **Added `sessionIdRef` double-check** in the stream event handler — events are now rejected if `event.sessionId !== sessionIdRef.current`, preventing race conditions
3. **Added 5-minute TTL** for completed-only cache entries via `COMPLETED_CACHE_TTL_MS` in `readCachedSubAgents()`

## Verification

TypeScript compilation passes with zero errors (`npx tsc --noEmit`).
