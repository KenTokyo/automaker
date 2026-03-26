---
title: Lokale Supabase-ENV für Kanban-Web gesetzt
description: Für apps/kanban-web wurde die fehlende lokale Supabase-Konfiguration ergänzt
date: 2026-03-26
status: success
effort: M
files:
  - apps/kanban-web/.env.local
  - apps/kanban-web/src/components/views/supabase-kanban-standalone-view.tsx
  - apps/ui/src/components/views/supabase-kanban-standalone-view.tsx
  - History/kanban-web-harte-trennung-verlauf.md
tags: [bugfix, config]
---

## Zusammenfassung

Die lokale Kanban-Web-App zeigte "Supabase ist nicht verbunden", weil in `apps/kanban-web` keine lokale ENV-Datei vorhanden war.

## Was wurde gemacht

- Supabase-Daten mit MCP gelesen:
  - Projekt `automaker-kanban-system` (`qqulocebmyqvwekeykyr`)
  - Projekt-URL und Keys geprüft
- `apps/kanban-web/.env.local` angelegt und befüllt:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_AUTH_REDIRECT_URL=http://localhost:3010/`
- Hinweistext verbessert, damit lokal klar ist, wo die Werte stehen müssen:
  - `apps/kanban-web/src/components/views/supabase-kanban-standalone-view.tsx`
  - `apps/ui/src/components/views/supabase-kanban-standalone-view.tsx`
- Kurzer Check:
  - Key enthält keinen Zeilenumbruch (`%0A`-Problem vermieden)
  - `npm run typecheck --workspace=apps/kanban-web` erfolgreich
  - `npm run typecheck --workspace=apps/ui` erfolgreich

## Wichtige Entscheidung

- Für lokale Stabilität wurde ein app-spezifisches `.env.local` in `apps/kanban-web` gesetzt, statt nur auf globale oder Vercel-Variablen zu vertrauen.
