---
title: Context Panels und manuelle Kontextgröße
description: Zeitlimit und automatisch kürzen getrennt, exklusiv gemacht und manuelle Kontextgröße pro Modell ergänzt
date: 2026-03-25
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx
  - apps/ui/src/store/time-limiter-store.ts
  - History/automatic-context-condense-open-like-codex-new-chat-setup-pl.md
tags: [feature, ui, bugfix]
---

## Zusammenfassung

Die Einstellungen wurden klar getrennt: ein Panel für Zeitlimit, ein Panel für automatisch kürzen.
Gleichzeitig wurde abgesichert, dass nie beide Modi aktiv sind.
Wenn ein Modell keine Kontextgröße liefert, kann der Nutzer jetzt eine feste Größe auswählen und speichern.

## Was wurde gemacht

- Zwei getrennte Collapsible-Bereiche in den Input-Einstellungen umgesetzt.
- Modus-Regel eingebaut: immer nur ein Modus gleichzeitig aktiv.
- Manuelle Kontextgröße ergänzt (`200k`, `400k`, `600k`, `800k`) mit `Speichern` und `Zurücksetzen`.
- Manuelle Größe pro Modell persistent im Store gespeichert.
- Effektive Kontextberechnung in `agent-view.tsx` um Fallback erweitert:
  - Modellwert zuerst
  - manuelle Größe als Fallback
- Logikfehler beim Modellwechsel behoben, damit Zeitlimit + Auto-Kürzen nicht gleichzeitig aktiv sein können.

## Wichtige Entscheidungen

- Die manuelle Kontextgröße wird nicht global, sondern pro Modell gespeichert.
  Das macht die Nutzung im Alltag einfacher, wenn verschiedene Modelle unterschiedliche Fenster haben.
- Die Aktivierung von Auto-Kürzen bleibt gesperrt, solange keine Kontextgröße bekannt ist.
  So wird verhindert, dass ein Modus aktiv aussieht, aber technisch nicht arbeiten kann.

## Checks

- `npm run typecheck` erfolgreich.
- UTF-8-Schnellcheck auf geänderten Dateien ohne Treffer.
