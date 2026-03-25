---
title: Fix excessive markdown line-break spacing in lists
description: Fixed oversized vertical gaps between list items caused by p tags inside li elements
date: 2025-03-23
status: success
effort: S
files:
  - apps/ui/src/components/ui/markdown.tsx
tags: [bugfix, ui]
---

## Problem

Markdown-rendered list items had excessive vertical spacing because react-markdown generates p tags inside li elements when there are blank lines between list items. The existing CSS rule [&_li>p]:my-0 was being overridden by the more general [&_p]:my-2 rule.

## Fix

1. Changed [&_li>p]:my-0 to [&_li_p]:!my-0 [&_li_p]:!leading-snug - uses !important and matches all nested p, not just direct children
2. Added CSS rules in syntaxStyles as safety net: .prose li > p { margin: 0 !important; }
3. Reduced [&_li]:my-1 to [&_li]:my-0.5 for tighter list spacing
4. Reduced [&_p]:my-2 to [&_p]:my-1.5 for slightly more compact paragraphs
