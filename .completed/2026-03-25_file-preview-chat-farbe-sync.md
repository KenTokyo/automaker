---
title: File Preview übernimmt Chat-Farbe ohne doppelte Schriftgröße
description: Die rechte Vorschau nutzt jetzt Chat-Farbwerte live, aber behält ihre eigene Schriftgrößen-Steuerung.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/files-panel/file-preview.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/components/files-panel/file-tree-item.tsx
tags: [bugfix, ui]
---

## Was wurde gemacht

Die bestehende Umsetzung wurde sauber zu Ende geführt und geprüft:

1. File Preview übernimmt jetzt die Chat-Schriftfarbe und weitere Lesbarkeitswerte.
2. Die Chat-Schriftgröße wird bewusst nicht übernommen, damit der rechte Bereich keinen doppelten Größen-Einfluss hat.
3. Änderungen an den Chat-Settings werden direkt im selben Tab in der Vorschau sichtbar.
4. Der frühere HTML-Fehler mit verschachtelten Buttons im Datei-Baum ist weiterhin korrekt behoben.

## Warum ist das wichtig?

So bleibt der Chat und die rechte Vorschau optisch konsistent bei der Farbe, aber die Größe im rechten Bereich bleibt stabil und getrennt steuerbar. Das macht die Ansicht besser lesbar.

## Checks

- TypeScript: `npm run typecheck` ✅
- UTF-8-Check (betroffene Dateien): keine fehlerhaften Zeichen ✅
