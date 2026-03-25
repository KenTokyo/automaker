---
title: 'Fix: Queue processing after Stop button'
description: 'Added processNextInQueue() call to abort error handler so queued prompts auto-send when user clicks Stop.'
date: 2025-07-21
status: success
effort: S
files:
  - apps/server/src/services/agent-service.ts
tags: [bugfix, feature]
---

## Queue Processing After Stop

The prompt queue was not continuing when the user manually stopped the AI. The abort error handler in `sendMessage()` was missing a `processNextInQueue()` call.

### Fix

Added `setImmediate(() => this.processNextInQueue(sessionId))` to the `isAbortError` catch block in `agent-service.ts`.

### Two Queue Behaviors Now Working

1. **AI finishes** -> next queued prompt auto-sends (already worked)
2. **User clicks Stop** -> next queued prompt auto-sends (NEW - was broken)
3. **Error occurs** -> queue stops (intentional, prevents error loops)
