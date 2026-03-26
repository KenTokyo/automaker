---
title: Supabase Verifizierungslink Redirect + Session-Fix
description: Signup-Redirect auf Vercel gesetzt und Hash-Token aus Mail-Link robust in Session übernommen
date: 2026-03-26
status: success
effort: S
files:
  - apps/ui/src/lib/supabase.ts
  - apps/ui/src/store/supabase-auth-store.ts
  - apps/ui/src/vite-env.d.ts
  - History/supabase-deploy-black-screen-verlauf.md
tags: [supabase, auth, verifizierung, vercel, bugfix]
---

## Zusammenfassung

Beim Klick auf den Registrierungs-/Verifizierungslink landete der Flow nicht zuverlässig auf der gewünschten Domain oder die Session wurde nicht sicher übernommen.

## Was wurde gemacht

1. Neue ENV eingeführt: `VITE_SUPABASE_AUTH_REDIRECT_URL`.
2. Signup nutzt jetzt explizit `emailRedirectTo`.
3. Fallback eingebaut: `#access_token` + `refresh_token` aus der URL werden per `setSession()` übernommen.
4. Nach erfolgreicher Übernahme wird der Hash aus der URL entfernt.
5. ENV in Vercel (Production + Preview) gesetzt und Production neu deployed.

## Ergebnis

- Verifizierungslink ist auf `https://automaker-kanban.vercel.app/` ausgerichtet.
- Session-Übernahme beim Mail-Link ist stabiler.
