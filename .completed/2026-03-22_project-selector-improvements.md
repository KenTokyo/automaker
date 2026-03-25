---
title: 'Project Selector: Sort, Hide, Smaller Text'
description: 'Alphabetische Sortierung, Hide/Show-Funktion, kleinere Textgroesse und Kontextaktionen fuer alle Project Selectors implementiert.'
date: 2026-03-22
status: success
effort: M
files:
  - apps/ui/src/lib/electron.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/components/layout/sidebar/hooks/use-project-picker.ts
  - apps/ui/src/components/layout/sidebar/components/sidebar-header.tsx
  - apps/ui/src/components/layout/sidebar/components/project-selector-with-options.tsx
  - apps/ui/src/components/layout/sidebar/components/sortable-project-item.tsx
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
tags: [ui, feature]
---

## Project Selector Improvements

### Was wurde gemacht:

1. **isHidden Property** zum Project-Interface hinzugefuegt
2. **toggleProjectHidden** Action im Zustand Store implementiert (mit Persist)
3. **Alphabetische Sortierung** in allen 3 Project-Selektoren (Sidebar Header, Project Selector with Options, Agent Header)
4. **Kleinere Textgroesse** (text-xs statt text-sm) in allen Dropdowns
5. **Hide/Show Buttons** auf Hover sichtbar bei jedem Projekt-Eintrag (Eye/EyeOff Icons)
6. **Hidden-Sektion** im Sidebar-Dropdown: Versteckte Projekte separat angezeigt mit 50% Opacity
7. **Hide Project Option** im Options-Menue (project-selector-with-options)
8. **Search zeigt alles**: Beim Suchen werden auch versteckte Projekte angezeigt (am Ende, mit Opacity)

### TypeScript: 0 Fehler
