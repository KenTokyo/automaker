---
title: Project Selector UI hervorgehoben
description: Ordner-Icon gelb und groesser, Projektname kraeftiger, Plus-Button immer sichtbar
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/session-manager/project-group-section.tsx
tags: [ui]
---

## Was wurde gemacht

Der Project Selector im Session Manager war kaum sichtbar. Drei Verbesserungen:

1. **Ordner-Icon**: Von h-3/w-3 auf h-4.5/w-4.5 vergroessert + knalliges Gelb (text-yellow-400) mit Glow-Effekt
2. **Projektname**: Von text-[11px] font-semibold auf text-xs font-bold mit voller Vordergrundfarbe
3. **Plus-Button**: War nur bei Hover sichtbar (opacity-0 -> opacity-100), jetzt immer da + groesser (h-4/w-4)

Zusaetzlich: Badge-Text leicht vergroessert, Header-Spacing erhoet fuer bessere Lesbarkeit.
