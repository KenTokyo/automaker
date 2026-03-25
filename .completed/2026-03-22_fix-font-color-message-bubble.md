---
title: Fix Schriftfarbe-Setting nicht auf Assistant-Nachrichten angewendet
description: fontColorGray wurde wegen hardcoded Tailwind-Klassen nicht auf Assistant-Messages vererbt
date: 2026-03-22
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [bugfix, ui]
---

## Problem

Die Schriftfarbe-Einstellung im ChatSettingsPopover hatte keinen sichtbaren Effekt auf Assistant-Nachrichten (MessageBubble). User-Nachrichten waren ebenfalls betroffen.

## Ursache

1. **User-Nachrichten**: `renderUserContent()` hatte `text-foreground` hardcoded, was die `color` inline-style vom Parent ueberschrieb.
2. **Assistant-Nachrichten**: Die Markdown-Komponente setzt `[&_p]:text-foreground-secondary`, `[&_li]:text-foreground-secondary` etc. mit hoeherer Spezifitaet als das geerbte `color` Property. Die bisherigen `markdownClassName` Overrides deckten nur `prose-headings` und `prose-strong` ab, nicht `p`, `li`, `code`, `td`, `th`.

## Fix

1. `renderUserContent()` nutzt jetzt `text-inherit` statt `text-foreground` wenn Custom-Farbe aktiv ist.
2. `markdownClassName` erweitert um `!text-inherit` fuer `p`, `li`, `code`, `td`, `th` Elemente wenn Custom-Farbe aktiv ist.
