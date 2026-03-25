---
title: Heading-Scale Slider + Input Font Size Fix
description: Added headingScale slider to chat display settings and reduced input field font size from 14px to 11px.
date: 2026-03-22
status: success
effort: M
files:
  - apps/ui/src/store/types/ui-types.ts
  - apps/ui/src/components/views/agent-view/components/chat-settings-popover.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
tags: [feature, ui]
---

## Changes

### 1. Heading Scale Slider (Titelgroesse)

- Added `headingScale` field to `ChatDisplaySettings` interface (0.7-1.3, default 1.0)
- Added slider labeled "Titelgroesse" in chat settings popover showing percentage (70%-130%)
- Heading sizes (h1-h4) now use CSS `calc()` with `--heading-scale` variable instead of fixed Tailwind classes
- All presets updated with appropriate headingScale values (kompakt: 0.85, gedaempft: 0.9, gross: 1.1)
- Backward compatible: existing localStorage settings get headingScale=1.0 via spread defaults

### 2. Input Field Font Size

- Reduced textarea font size from `text-sm` (14px) to `text-[11px]` (11px) - 3px smaller
- This makes the input content more visible and proportional to the UI
