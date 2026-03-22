---
title: Fix message margins + add bubble color setting
description: Reduced MessageList padding, removed max-width constraints, added chatBubbleColor project setting
date: 2026-03-21
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view/components/message-list.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
  - apps/ui/src/components/views/agent-view/components/chat-area.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/lib/electron.ts
tags: [ui, feature]
---

## Changes

### Margin Fix

- MessageList padding reduced from `px-6` to `px-2` to remove excessive left/right margins
- Removed `max-w-4xl` and `max-w-[90%]` constraints from message bubbles
- User messages now have `max-w-[85%]` on outer container only

### Message Bubble Color Setting

- Added `chatBubbleColor` property to Project type
- Added `setProjectChatBubbleColor` store action
- Passed chatBubbleColor through component chain: agent-view -> chat-area -> message-list -> message-bubble
- Applied via CSS `color-mix()` for subtle 25% tint over default bg
- Added Color Picker in Edit Project > Appearance tab
- Reset All Colors now includes bubble color
