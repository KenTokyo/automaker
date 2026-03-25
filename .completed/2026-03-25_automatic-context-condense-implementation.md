---
title: Automatic Context Condense Umsetzung
description: Auto-Condense mit Kontext-Prozent, Modell-Settings und stabiler Follow-Up-Session umgesetzt
date: 2026-03-25
status: success
effort: L
files:
  - apps/ui/src/store/time-limiter-store.ts
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/views/agent-view/hooks/use-agent-shortcuts.ts
  - docs/session-manager/tasks/2026-03-25-context-condense-master-plan.md
  - History/automatic-context-condense-open-like-codex-new-chat-setup-pl.md
tags: [feature, ui]
---

## Zusammenfassung

Automatic Context Condense wurde in der Agent-Ansicht vollständig integriert.
Der Chat kann jetzt automatisch in eine neue Session wechseln, wenn der Kontext
zu voll wird. Die Zusammenfassung wird in die neue Session übernommen.

## Was wurde gemacht

- Store erweitert um Auto-Condense-Status und Schwellwert pro Modell.
- Kontext-Auslastung im Chat berechnet (geschätzte Tokens, Modell-Kontextfenster, Prozent).
- UI im Input-Bereich erweitert:
  - Schalter für Auto-Condense
  - Prozent-Schwellwert
  - Schnellwerte
  - Live-Anzeige der Kontext-Auslastung
- Kleine UI-Feinheit ergänzt:
  - Hinweistext wird direkt in die vorbereitete Zusammenfassung gesetzt
  - kurze Success-Meldung nach automatischem Wechsel
  - Kontext-Button visuell klarer gemacht (Gauge + Prozent/--)
  - Kontext-Button nach rechts vor Stop/Send verschoben
  - Kontext-Button immer anklickbar gemacht (nicht mehr an Verbindung gekoppelt)
  - Startzustand auf `KTX 0%` gesetzt, bevor die erste Nachricht gesendet wurde
- Auto-Trigger bei Kontext-Grenze ergänzt.
- Session-Erstellung erweitert:
  - Follow-Up-Session kann erzwungen neu erstellt werden (kein Empty-Reuse)
  - `parentSessionId` wird gesetzt, damit die Fortsetzung in der Historie klar erkennbar ist
- Quick-Create-Callback stabilisiert (`useCallback`), damit Ref-Zuweisung nicht unnötig bei jedem Render wechselt.
- Race-Guard eingebaut, damit die Zusammenfassung nicht versehentlich in der alten Session eingefügt wird.

## Wichtige Entscheidungen

- Für die Eltern-Kind-Verknüpfung wurde `parentSessionId` genutzt, damit bestehende Session-Baumlogik direkt greift.
- `sourceType` bleibt bei Auto-Condense auf `manual`, damit diese Sessions nicht als Sub-Agent markiert werden.
- Bei fehlgeschlagener Session-Erstellung wird Pending-Content wieder aufgeräumt, damit kein hängender Zustand bleibt.
- Pending-Text wird nur in leere Ziel-Sessions eingefügt, damit bestehende Chats nicht überschrieben werden.

## Verifikation

- `npm run typecheck` erfolgreich.
- UTF-8-Schnellcheck für geänderte Dateien ohne fehlerhafte Zeichen.
