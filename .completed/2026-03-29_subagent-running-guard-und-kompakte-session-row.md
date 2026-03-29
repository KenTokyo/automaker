---
title: Sub-Agent Running Guard und kompakte Session-Row
description: Verhindert stuck-running Sub-Agent-Status ohne aktiven Parent und verdichtet die Sub-Agent-Zeile in der Session-Liste
date: 2026-03-29
status: success
effort: M
files:
  - apps/server/src/routes/sessions/routes/index.ts
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/components/session-manager.tsx
tags: [bugfix, ui]
---

## Zusammenfassung

Sub-Agent-Child-Sessions konnten in der Session-Liste weiterhin als `läuft` erscheinen, obwohl der Parent-Run bereits abgeschlossen war. Zusätzlich war die Sub-Agent-Meta-Zeile unnötig hoch und wiederholte Informationen.

### Was wurde gemacht

- **Backend-Guard in Session-Route:** Für Sub-Agent-Sessions wird `running` nur noch gesetzt, wenn die Session selbst aktiv ist **und** der Parent aktiv ist.
- **UI-Guard in Session-Row:** Die Running-Anzeige von Sub-Agent-Zeilen wird zusätzlich abgesichert, damit stale Statuswerte nicht mehr als laufend dargestellt werden.
- **Sicherheits-Polling:** Solange laufende Sessions sichtbar sind, wird die Session-Liste alle 5 Sekunden refetched.
- **Kompakte Sub-Agent-Zeile:** Untere Meta-Zeile entfernt (`Kein eigener Verlauf`, `Updated`, Projekt-Badge) und `Updated` als Badge nach oben verschoben.

### Wichtige Entscheidungen

- Doppelter Schutz (Backend + UI), damit das Verhalten auch bei Event-Races stabil bleibt.
- Polling nur während laufender Sessions, um unnötige API-Last zu vermeiden.
