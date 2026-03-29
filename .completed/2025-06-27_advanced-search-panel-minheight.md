---
title: AdvancedSearchPanel Mindesthoehe fixiert
description: min-h-[55vh] zum Results-Bereich hinzugefuegt, damit das Panel nicht mehr ruckartig in der Hoehe springt
date: 2025-06-27
status: success
effort: S
files:
  - notedrill-backend-nextjs/components/search/advanced/AdvancedSearchPanel.tsx
tags: [ui, bugfix]
---

## AdvancedSearchPanel Mindesthoehe Fix

Der Results-Bereich im AdvancedSearchPanel hatte nur `max-h-[55vh]` aber keine Mindesthoehe. Dadurch sprang das Panel ruckartig in der Hoehe je nach Inhalt (leer, Schnellsuche, Suchergebnisse, Filter).

**Fix:** `min-h-[55vh]` zum Results-Container hinzugefuegt, sodass das Panel immer stabil bei voller Hoehe bleibt.

**Vorher:** `max-h-[55vh]`
**Nachher:** `min-h-[55vh] max-h-[55vh]`
