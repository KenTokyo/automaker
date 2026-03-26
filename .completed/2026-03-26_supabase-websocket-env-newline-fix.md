---
title: Supabase WebSocket Fehler durch ENV-Zeilenumbruch behoben
description: VITE_SUPABASE_ANON_KEY wird jetzt bereinigt, damit kein %0A mehr in der Realtime-URL landet
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/lib/supabase.ts
  - History/deployed-vercel-version-websocket-fehler-vm144-vendorjs159-u.md
tags: [bugfix, config]
---

## Zusammenfassung

Der Live-Fehler kam nicht von der Kanban-Logik selbst, sondern von einem kopierten ENV-Wert mit Zeilenumbruch.
Dadurch wurde im Browser aus dem Supabase-Key ein `%0A`, was die Realtime-WebSocket-Verbindung kaputt gemacht hat.

## Was wurde gemacht

- `apps/ui/src/lib/supabase.ts` gehärtet:
  - neue Bereinigungsfunktion für ENV-Werte
  - `trim()` + Entfernen von `\r` und `\n`
  - angewendet auf URL, Anon-Key und Redirect-URL
- TypeScript geprüft:
  - `npm run typecheck --workspace=apps/ui`
  - `npm run typecheck --workspace=apps/kanban-web`
- Production neu deployed und aliasiert auf:
  - `https://automaker-kanban.vercel.app`
- Live-Bundle geprüft:
  - kein `%0A` mehr enthalten
  - keine WebSocket-URL mehr mit `%0A`

## Wichtige Entscheidungen

- Fix direkt in der Initialisierung statt nur in Vercel-Settings:
  - schützt auch lokale Setups und künftige ENV-Fehleingaben
  - reduziert Support-Risiko bei Copy-Paste-Fehlern
