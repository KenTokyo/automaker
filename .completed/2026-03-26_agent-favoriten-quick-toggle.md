---
title: Agent-Favoriten Quick-Toggle Buttons neben Send
description: Favoriten-System fuer Agent-Prompts mit kompakten Toggle-Buttons neben dem Senden-Button
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/store/agent-prompts-store.ts
  - apps/ui/src/components/views/agent-view/input-area/agent-prompts-selector.tsx
  - apps/ui/src/components/views/agent-view/input-area/favorite-agent-buttons.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
tags: [feature, ui]
---

## Agent-Favoriten Quick-Toggle System

### Was wurde gemacht:

1. **Store erweitert** (`agent-prompts-store.ts`):
   - Neues `favoritePromptKeys` Array mit localStorage-Persistierung (`automaker:favorite-agent-prompts`)
   - `toggleFavorite()`, `isFavorite()`, `getFavoritePrompts()` Methoden
   - Cleanup bei `loadPrompts()` entfernt geloeschte Prompts aus Favoriten
   - Update/Delete von Prompts aktualisiert auch Favoriten-Keys

2. **Stern-Button im Dropdown** (`agent-prompts-selector.tsx`):
   - Jeder Agent-Prompt hat einen Star-Button zum Favoritisieren
   - Gefuellter goldener Stern wenn favorisiert (immer sichtbar)
   - Leerer Stern erscheint on hover

3. **Neue Komponente** (`favorite-agent-buttons.tsx`):
   - Kompakte Toggle-Buttons (max 72px breit, 10px Schrift) fuer favorisierte Agenten
   - Klick togglet Selection State (synchron mit Checkbox im Dropdown)
   - Tooltip mit Name, Status und Prompt-Vorschau
   - Aktive Buttons haben primary Farbe, inaktive sind gedimmt

4. **Integration** (`input-controls.tsx`):
   - Buttons erscheinen direkt vor dem Stop/Send-Button
   - Disabled wenn nicht verbunden

### Warum:

Schneller Zugriff auf haeufig genutzte Agent-Prompts ohne den Dropdown oeffnen zu muessen.
