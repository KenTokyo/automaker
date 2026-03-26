---
title: Docs Tab entfernt, Tab-Reihenfolge angepasst
description: Docs Tab komplett entfernt inkl. DocsPanel-Komponente, Store-Properties und Keyboard-Shortcut. Tab-Reihenfolge geaendert zu Sessions, Tasks, Fertig, Uebersicht.
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/store/types/ui-types.ts
  - apps/ui/src/store/types/state-types.ts
  - apps/ui/src/store/app-store.ts
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/hooks/use-agent-shortcuts.ts
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/components/docs-panel.tsx
tags: [ui, cleanup, refactor]
---

## Docs Tab entfernt und Tab-Reihenfolge angepasst

### Neue Tab-Reihenfolge: Sessions > Tasks > Fertig > Uebersicht

### Aenderungen:

- `LeftPanelTab` Type: `'docs'` entfernt
- `docsOpen` State + `setDocsOpen` Action aus Store entfernt
- Docs-Tab aus SessionManager entfernt
- `Ctrl+Shift+D` Shortcut entfernt
- `DocsPanel` Komponente geloescht (verwaist)
- "Browse All Docs" Button aus input-controls entfernt
- `setDocsOpen` Aufrufe aus message-bubble und agent-view entfernt
