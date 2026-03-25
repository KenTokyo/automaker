---
title: Input Controls Design-Verbesserungen
description: Attach-Files-Button entfernt, aktive Status-Indikatoren für TimeLimiter, Orchestrator und CompletedTasks Buttons
date: 2025-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx
  - apps/ui/src/components/views/agent-view/input-area/orchestrator-settings.tsx
  - apps/ui/src/components/views/agent-view/input-area/completed-tasks-toggle.tsx
tags: [ui, cleanup]
---

## Was wurde gemacht

1. **Attach-Files-Button entfernt** - Der Paperclip-Button wurde aus InputControls entfernt. Dateien können weiterhin per Drag & Drop hinzugefügt werden.
2. **TimeLimiter-Button** - Bekommt jetzt grünen Hintergrund und Rand wenn aktiv (emerald-500/10 bg, emerald-500/40 border).
3. **Orchestrator-Button** - Gleicher grüner Aktiv-Indikator statt dem bisherigen grauen bg-muted/50.
4. **CompletedTasks-Button** - 'AN'-Text entfernt, stattdessen grüner Hintergrund/Rand wenn aktiv. Spart Platz.

Alle Buttons nutzen jetzt dasselbe konsistente Design-Pattern für den aktiven Zustand.
