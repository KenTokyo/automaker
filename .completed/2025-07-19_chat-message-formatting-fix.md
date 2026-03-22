---
title: Chat Message Formatting & Margin Fix
description: Fixed doppeltes margin-left bei User-Nachrichten, Line-Break-Rendering und verbesserte Formatierung
date: 2025-07-19
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [ui, bugfix]
---

## Was wurde gemacht

### 1. Margin-Left Bug behoben

- Die aeussere div hatte `ml-auto` UND die innere Bubble div hatte nochmal `ml-auto` - fuehrte zu komischem doppeltem Einruecken
- Ersetzt durch `flex justify-end` auf der aeusseren div, kein ml-auto mehr auf der inneren Bubble

### 2. Line-Break-Rendering gefixt

- `\\n` wurde nur fuer Assistant-Nachrichten zu echten Newlines konvertiert, User-Nachrichten wurden uebersprungen
- Jetzt wird `.replace(/\\n/g, '\n')` auf ALLE Nachrichten angewendet
- User-Nachrichten werden als Plain Text mit `whitespace-pre-wrap` gerendert statt durch Markdown - viel sauberere Darstellung

### 3. Formatierung verbessert

- User-Bubble hat `rounded-br-md` fuer typischen Chat-Bubble-Look
- Role-Indicator bei User-Nachrichten rechtsbuendig
- Timestamp bei User-Nachrichten dezenter (text-foreground/40)
- Footer-Layout bei User-Nachrichten invertiert
- Image-Pfade dezenter gestaltet
- Mehr Padding (py-3 statt py-2.5)
