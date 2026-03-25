---
title: Codex Event-Stream Lag Warnung im Chat gefiltert
description: Störende Lag-Warnungen aus dem Codex In-Process-Stream werden nicht mehr als Assistant-Text angezeigt
date: 2026-03-25
status: success
effort: S
files:
  - apps/server/src/providers/codex-provider.ts
  - History/codex-event-stream-lag-verlauf.md
tags: [bugfix, cleanup]
---

## Zusammenfassung

Die Meldung `in-process app-server event stream lagged; dropped X events` wurde bisher als normaler Chat-Inhalt angezeigt. Das wurde als störend wahrgenommen.

### Was wurde gemacht

- In `codex-provider.ts` wurde ein gezielter Filter für diese Lag-Warnung ergänzt.
- Der Filter unterdrückt auch den Parse-Fall `Failed to parse output: ...`, wenn derselbe Lag-Text enthalten ist.
- Dadurch bleibt die Ausgabe in der Message-Bubble sauber.

### Warum so

- Die Meldung ist eine interne Laufzeitwarnung aus der Codex-Exec-Schicht, kein fachlicher Antworttext.
- Für Nutzer ist sie in der Chatblase eher Lärm als Hilfe.

### Ergebnis

- Weniger visuelles Rauschen im Chat.
- Keine Änderung an der eigentlichen Agent-Ausführung, nur an der Darstellung/Weitergabe dieser speziellen Warnung.
