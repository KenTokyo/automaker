---
title: Chat-UI kompakter gestaltet (Terminal-Style)
description: Markdown-Rendering kompakter gemacht - Headings kleiner, Abstände reduziert, Listen enger, Inline-Code dezenter
date: 2026-03-21
status: success
effort: S
files:
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
  - apps/ui/src/components/views/agent-view/components/message-list.tsx
  - apps/ui/src/store/types/ui-types.ts
tags: [ui, refactor]
---

## Chat-UI Readability: Terminal-Style Kompaktheit

### Problem

Die Chat-UI war im Vergleich zum Terminal (Claude Code) schlecht lesbar — zu viel Whitespace, zu grosse Headings, zu tiefe Listen-Einrückung, zu prominente Inline-Code-Styles.

### Änderungen

- **Headings**: text-xl/text-lg → text-base/0.94rem (näher an Body-Text)
- **Heading-Margins**: mt-4 mb-2 → mt-3 mb-1 (weniger Abstand)
- **Paragraph-Margins**: my-2 → my-1, leading-relaxed → leading-normal
- **Listen-Einrückung**: pl-6 → pl-4 (kompakter)
- **List-Item-Gaps**: my-0.5 → my-0 (keine Lücken zwischen Items)
- **Inline-Code**: text-chart-2 (türkis) → text-foreground (gleiche Farbe wie Text), bg-muted → bg-muted/60 (dezenter)
- **Bubble-Padding**: py-3 → py-2.5
- **Message-Gaps**: space-y-6 → space-y-4, py-6 → py-4
- **Default lineHeight**: 1.6 → 1.5 (alle Presets angepasst)
- **message-bubble markdownClassName**: Redundante prose-Overrides entfernt (pl-6, leading-relaxed, code px/py)
