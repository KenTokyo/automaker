---
title: Fix Time-Limiter Ablauf und Follow-up Auto-Send
description: Zeitlimit stoppt laufende Ausführung sofort und sendet die Zusammenfassung im Folge-Chat automatisch
date: 2026-03-30
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/views/agent-view.tsx
  - History/time-limiter-stop-und-follow-up-autosend-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Der automatische Session-Wechsel bei Zeitlimit war bisher an das Ende eines Runs gekoppelt.
Dadurch lief ein Chat trotz aktivem Zeitlimit weiter, bis ein `complete` kam. Gleichzeitig
wurde der Folgechat zwar erstellt, die Zusammenfassung aber nicht zuverlässig gesendet.

### Was wurde gemacht

- Time-Limiter-Flow gehärtet:
  - Bei erreichtem Zeitlimit und laufendem Run wird jetzt aktiv `stopExecution()` ausgelöst.
  - Danach startet der bestehende Follow-up-Flow in einer neuen Session.
- Follow-up-Zusammenfassung gehärtet:
  - Pending-Content wird nicht nur in das Input-Feld gesetzt, sondern automatisch gesendet.
  - Falls das Senden fehlschlägt, bleibt der Text als Fallback im Input sichtbar.
- Race-Guards ergänzt:
  - Keine Doppelauslösung beim Stoppen.
  - Keine Einfügung in Quell-Session oder bereits genutzte Session.
  - Bei Bedarf wird eine frische Ziel-Session erzwungen.

### Wichtige Entscheidungen

- Aktives Stoppen bei Zeitlimit ist absichtlich vor dem Session-Wechsel platziert, damit das Limit wirklich zur Laufzeit greift und nicht erst am Ende.
- Für das automatische Senden wird `handleSend(...)` genutzt, damit der bestehende Prompt-/Send-Flow erhalten bleibt.

### Verifikation

- `npm run typecheck` erfolgreich.
