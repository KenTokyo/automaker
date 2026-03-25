---
title: FilesPanel Dropdowns verschönert (Dark Mode)
description: Native select-Elemente durch neue MiniSelect-Komponente ersetzt für Dark-Mode-Kompatibilität
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/ui/mini-select.tsx
  - apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx
  - apps/ui/src/store/explorer-store.ts
tags: [ui, refactor]
---

## Was wurde gemacht

Die drei nativen `<select>`-Dropdowns in der FilesPanel-Toolbar (Sortierung, Zeitfilter, Hervorhebung) hatten weiße Hintergründe im Dark Mode und sahen generell hässlich aus.

### Lösung

1. **Neue `MiniSelect`-Komponente** (`mini-select.tsx`) erstellt:
   - Basiert auf Radix DropdownMenu (wie der Rest der UI)
   - Kompaktes Design für Toolbars (h-6, text-[11px])
   - Dark-Mode-kompatibel: nutzt `bg-popover`/`bg-muted` statt nativer weißer Dropdown-Hintergründe
   - Check-Mark für aktive Auswahl, Hover-Effekte, Animationen
   - Icon-Unterstützung links im Trigger

2. **FilesPanel umgebaut**: 3 native `<select>` durch `MiniSelect` ersetzt

3. **Umlaut-Fix**: "Zuletzt geaendert" → "Zuletzt geändert" im explorer-store
