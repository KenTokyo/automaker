---
title: Sub-Agent Session-Lag und Flackern Hotfix
description: Session-Liste und Sub-Agent-Darstellung wurden stabilisiert und deutlich entlastet
date: 2026-03-27
status: success
effort: L
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/hooks/use-query-invalidation.ts
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/hooks/queries/use-sessions.ts
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - History/sub-agent-system-lag-und-flackern-verlauf.md
tags: [bugfix, performance, ui]
---

## Zusammenfassung

Das Sub-Agent-System hatte zwei Hauptprobleme:

- Zu viele direkte Session-Refreshes bei Stream-Events
- Zu schweres Laden der Session-Liste im Backend

Beides wurde in diesem Hotfix zusammen adressiert.

### Was wurde gemacht

- **Frontend entlastet**
  - Lokalen Stream-Listener im Session-Manager entfernt, um doppelte Neuladungen zu vermeiden.
  - Session-Manager mit `memo` abgesichert, damit Chat-Streaming nicht bei jedem Tick die ganze Sidebar neu rendert.
  - Session-Invalidation in `use-query-invalidation` zentralisiert und per Debounce mit `maxWait` gebündelt.
  - Laufende Sessions werden in Projektgruppen immer sichtbar gehalten, damit aktive Sub-Agents nicht mitten im Lauf aus dem sichtbaren Bereich rutschen.
  - `SessionListItemRow` memoisiert und relevante Callback-Props stabilisiert, um unnötige Re-Renders in langen Listen zu reduzieren.
  - AgentView liest nicht mehr die komplette Session-Liste, sondern nur noch die aktuelle Session (`useSessionById`).

- **Backend entlastet**
  - Session-Summaries (`messageCount`, `preview`, `lastError`) werden beim Speichern einer Session in die Metadaten geschrieben.
  - Session-List-Route verwendet diese Metadaten direkt und lädt vollständige Session-Dateien nur noch als Fallback für ältere Einträge.
  - Laufstatus-Checks wurden auf vorberechnete `Set`s umgestellt, statt pro Session erneut durch Runtime-Status zu laufen.

### Warum so

- Die Liste wurde vorher bei vielen Sub-Agent-Events mehrfach neu geladen.
- Pro Listenaufruf wurden zusätzlich sehr viele Session-Dateien komplett gelesen.
- Diese Kombination hat die UI spürbar ausgebremst und das Flackern verstärkt.

### Ergebnis

- Weniger Event-Sturm im Frontend.
- Deutlich leichterer Listenaufbau im Backend.
- Stabile Sichtbarkeit von laufenden Sub-Agent-Sessions während der Ausführung.
