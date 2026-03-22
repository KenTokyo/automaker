---
title: Completed/Fertig-Tab Analyse in apps/chat/src
description: Analyse durchgeführt, warum ein Completed/Fertig-Tab nicht sichtbar ist, inklusive Sidebar, History-Filter, Session-Status, Flags und Sichtbarkeit.
date: 2026-03-21
status: success
effort: S
files:
  - apps/chat/src/hooks/use-chat-panel-preferences.ts
  - apps/chat/src/components/chat-sidebar-left.tsx
  - apps/chat/src/components/history-types.ts
  - apps/chat/src/components/history-filters.tsx
  - apps/chat/src/hooks/use-history-panel-data.ts
  - apps/chat/src/stores/types.ts
  - apps/chat/src/stores/session-store.ts
  - apps/chat/src/components/chat-layout-v2.tsx
  - History/completed-tab-sichtbarkeit-analyse-verlauf.md
tags: [analyse, chat, sidebar, history]
---

## Was wurde gemacht

- Nur Analyse in `apps/chat/src`, keine App-Logik geändert.
- Session-Manager, History-Filter, Sidebar-Tabs, mögliche Flags und CSS-Sichtbarkeit geprüft.
- Ergebnis: Es gibt aktuell keinen eigenen `Completed`/`Fertig`-Tab in dieser Codebasis.

## Konkretes Ergebnis

- Sidebar erlaubt nur `history` und `overview`.
- History-Statusfilter kennt nur `all`, `running`, `stopped`, `error`.
- Interner Session-Status kennt nur `idle`, `running`, `error`, `stopped`.
- Ein fertiger Lauf landet als `idle` und wird im Verlauf im Filter `stopped` mit angezeigt.

## Checks

- UTF-8-Schnellscan ausgeführt.
- `npm run typecheck` erfolgreich.
