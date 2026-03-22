---
title: Fertig-Tab neben Sessions
description: Den Tab Fertig in der Session-Ansicht direkt hinter Sessions verschoben.
date: 2026-03-18
status: success
effort: S
files:
  - apps/ui/src/components/session-manager.tsx
  - History/fertig-tab-neben-sessions-verlauf.md
tags: [ui, bugfix]
---

## Was wurde gemacht

- In der Tab-Leiste vom Session-Manager wurde die Reihenfolge angepasst.
- `Fertig` steht jetzt direkt nach `Sessions`.
- Die restlichen Tabs bleiben erhalten.

## Warum

- Du wolltest `Fertig` sofort neben `Sessions` haben.
- So ist der Tab schneller erreichbar und klarer angeordnet.

## Checks

- UTF-8-Schnellscan mit `(Ã|Â|ðŸ|â)` ausgeführt.
- `npm run typecheck` erfolgreich.

## Attempt

- Ein erster UTF-8-Regex mit vielen Sonderzeichen ist in PowerShell falsch geparst worden.
- Learning: In PowerShell den robusten Kurz-Regex `(Ã|Â|ðŸ|â)` nutzen.
