---
title: Chat-Schriftfarbe (Grau-Slider) hinzugefuegt
description: Neuer Slider in Chat-Settings fuer die Schriftfarbe (Grau 400-900) mit Dark/Light-Mode Unterstuetzung
date: 2026-03-21
status: success
effort: M
files:
  - apps/ui/src/store/types/ui-types.ts
  - apps/ui/src/components/views/agent-view/components/chat-settings-popover.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [feature, ui]
---

## Chat-Schriftfarbe Slider

### Was wurde gemacht:

- `fontColorGray` Property (400-900) zu `ChatDisplaySettings` Interface hinzugefuegt
- Default auf 900 (dunkelster Grauton) gesetzt
- Alle 5 Presets mit passenden `fontColorGray` Werten aktualisiert (z.B. Gedaempft=600)
- Neuer Slider "Schriftfarbe" im ChatSettingsPopover (400=Hell bis 900=Sehr Dunkel)
- Dark/Light-Mode-aware Farbmapping (verschiedene Hex-Werte je nach Theme)
- `isDarkThemeActive()` Helfer-Funktion exportiert
- MessageBubble wendet die Farbe als inline-style an
- Markdown prose-Klassen erben die Custom-Farbe korrekt (text-inherit statt text-foreground)
- Vorschau im Popover zeigt die Farbe live an
- Abwaertskompatibilitaet: bestehende Settings ohne fontColorGray fallen auf Default 900 zurueck
