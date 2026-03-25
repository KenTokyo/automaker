---
title: Chat-Status als Randfarbe im aktiven Chat
description: Laufende Chats werden im aktiven Bereich orange markiert, gestoppte Chats rot.
date: 2026-03-25
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - History/chat-aktiv-randfarbe-verlauf.md
tags: [ui, bugfix]
---

## Was wurde gemacht?

- Für den aktuell geöffneten Chat wurde ein einfacher Aktivitätszustand ergänzt.
- Wenn der Chat läuft, färben sich die Resizable-Linien und die obere Linie vom Eingabebereich orange.
- Wenn der Chat gestoppt wurde, färben sich diese Linien rot.
- In allen anderen Zuständen bleibt das bestehende Design unverändert.

## Warum ist das hilfreich?

- Der Nutzer sieht sofort, ob der aktuelle Chat gerade arbeitet oder schon gestoppt wurde.
- Die Markierung ist sichtbar, ohne das Layout umzubauen.

## Verifikation

- `npm run typecheck` erfolgreich.
- UTF-8-Kurzcheck auf den geänderten Dateien ohne Treffer.

## Attempts

1. UTF-8-Scan mit langem Regex unter PowerShell

- Problem: Der lange Regex mit Sonderzeichen wurde von PowerShell falsch interpretiert.
- Learning: Für PowerShell den robusten Kurz-Regex `(Ã|Â|ðŸ|â)` nutzen und bei Bedarf auf geänderte Dateien einschränken.
