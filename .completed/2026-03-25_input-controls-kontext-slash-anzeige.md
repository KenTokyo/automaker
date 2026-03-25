---
title: Kontextanzeige im Input-Button vereinfacht
description: KTX entfernt, Slash-Format mit aktueller Prozentzahl und Rest bis Schwelle ergänzt, plus klare Modus-Icon-Anzeige
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx
  - History/input-controls-kontext-slash-anzeige-verlauf.md
tags: [ui, feature, cleanup]
---

## Was wurde gemacht?

Die Anzeige im kleinen Einstellungs-Button für Auto-Wechsel wurde einfacher und klarer gemacht.

- `KTX` wurde entfernt.
- Stattdessen zeigt der Button jetzt eine leichte Slash-Anzeige:
  - `/<aktueller Kontext in %>/<Rest bis Schwellenwert in %>`
- Wenn das Zeitlimit aktiv ist, kommt rechts noch die verbleibende Zeit dazu:
  - `/<MM:SS>`
- Das Icon links zeigt den aktiven Modus direkter:
  - `Timer` bei Zeitlimit
  - `Gauge` bei Auto-Kürzen/neutral

## Warum?

So ist die Leiste ruhiger, und man erkennt schneller:

1. Wie voll der Kontext gerade ist.
2. Wie viel bis zur Auto-Kürzen-Schwelle noch fehlt.
3. Ob das Zeitlimit aktiv ist.

## Validierung

- `npm run typecheck` wurde ausgeführt und war erfolgreich.

## Attempts / Learnings

- Erst wurde `npm run type-check` gestartet, das Script existiert im Projekt nicht.
- Korrektes Script ist `npm run typecheck`.
