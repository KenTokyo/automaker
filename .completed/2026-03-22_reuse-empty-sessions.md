---
title: Reuse empty sessions on New Session click
description: Prevent duplicate empty sessions by reusing existing ones with 0 messages
date: 2026-03-22
status: success
effort: S
files:
  - apps/ui/src/components/session-manager.tsx
tags: [feature, ui, cleanup]
---

## Reuse Empty Sessions

Added `findReusableEmptySession()` helper function that checks for existing empty sessions
(messageCount === 0, not archived, not running) for the current project.

Both `handleQuickCreateSession` (sidebar + input area buttons) and `handleCreateSession`
(manual name entry) now reuse an existing empty session instead of creating a new one.

### Edge Cases Handled

- Only reuses sessions for the same project (projectPath match)
- Does not reuse archived sessions
- Does not reuse sessions with status `running`
- `handleCreateSession` only reuses if user didn't type a custom name (if they typed a name, they intentionally want a new session with that name)
