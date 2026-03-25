---
title: Weniger anzeigen Button fuer ProjectGroupSection
description: Show-less Button hinzugefuegt um aufgeklappte Session-Listen wieder auf 3 Eintraege zu kollapsen
date: 2026-03-22
status: success
effort: S
files:
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/components/session-manager.tsx
tags: [feature, ui]
---

## Was wurde gemacht

- `showLessForProject` Callback in `session-manager.tsx` hinzugefuegt, der den `visibleCount` per `delete` zurueck auf den Default (`INITIAL_VISIBLE = 3`) setzt
- `ProjectGroupSection` um `onShowLess` Prop erweitert
- "Weniger anzeigen" Button mit ChevronUp Icon erscheint nur wenn `visibleCount > INITIAL_VISIBLE`
- Wenn noch weitere Sessions vorhanden sind, werden beide Buttons nebeneinander angezeigt (links "Mehr", rechts "Weniger")
- Wenn alle Sessions sichtbar sind, wird nur der "Weniger anzeigen" Button zentriert angezeigt
- TypeScript-Pruefung bestanden ohne Fehler
