---
title: Chat UI Lists, Spacing & User Bubble Color
description: Modernere Listen, mehr Paragraph-Spacing und separater User Bubble Color Picker
date: 2026-03-21
status: success
effort: M
files:
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/lib/electron.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/components/chat-area.tsx
  - apps/ui/src/components/views/agent-view/components/message-list.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [feature, ui]
---

## Chat UI Verbesserungen

### 1. Modernere Listen (Bullet & Numbered)

- Bullet-Listen verwenden jetzt Custom-Marker via CSS `::before` statt native `list-style`
- Unordered: Level 1 = `•` (bold), Level 2 = `◦`, Level 3 = `▪`
- Ordered: CSS Counter mit `counter-reset`/`counter-increment` statt native Dezimal
- Nested ordered lists nutzen `lower-alpha` Nummerierung
- Marker-Farbe: `var(--muted-foreground)` fuer dezentes, professionelles Aussehen
- `font-variant-numeric: tabular-nums` fuer gleichmaessige Nummern-Ausrichtung

### 2. Mehr Paragraph-Spacing

- Paragraphen: `my-2` statt `my-1` (doppelter Abstand)
- Line-height: `leading-relaxed` statt `leading-normal`
- Listen-Items: `my-1` statt `my-0` (Abstand zwischen Items)

### 3. User Message Bubble Color

- Neues `userBubbleColor` Property auf Project-Interface
- Separater Color Picker im Edit-Project-Dialog
- Prop-Kette: agent-view -> chat-area -> message-list -> message-bubble
- User-Messages verwenden `userBubbleColor`, Fallback auf `chatBubbleColor`
- Assistant-Messages verwenden weiterhin nur `chatBubbleColor`
- Reset-All setzt auch `userBubbleColor` zurueck
