# Phase 1 – Supabase Setup & Zugänge

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primär: ki_architekt
- Unterstützend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [ ] Supabase Projekt-Setup prüfen und Konfigurationspfade fixieren
- [ ] MCP-Setup-Schritte dokumentieren (Codex + Claude)
- [ ] ENV-Konzept für lokal, CI und Deploy festlegen

## Betroffene Komponenten

- apps/ui/.env.\*
- apps/server/.env.\*
- Dokumentation für Setup-Flows

## Akzeptanzkriterien

- [ ] Zielumfang dieser Phase ist umgesetzt
- [ ] Keine Regression in direkt betroffenen Komponenten
- [ ] Übergabe-Notiz für nächste Phase erstellt

## Setup-Kommandos (aus History)

- [ ] Connection String sicher hinterlegen (kein Klartext im Repo)
  - `postgresql://postgres.qqulocebmyqvwekeykyr:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`
- [ ] Codex MCP Server eintragen
  - `codex mcp add supabase --url https://mcp.supabase.com/mcp?project_ref=qqulocebmyqvwekeykyr&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cbranching%2Cfunctions`
- [ ] Remote MCP in `~/.codex/config.toml` aktivieren
  - `[mcp]` und `remote_mcp_client_enabled = true`
- [ ] Codex Login durchführen
  - `codex mcp login supabase`
- [ ] Claude MCP Server eintragen (Projekt-Scope)
  - `claude mcp add --scope project --transport http supabase \"https://mcp.supabase.com/mcp?project_ref=qqulocebmyqvwekeykyr&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cbranching%2Cfunctions\"`
- [ ] Claude Auth-Flow starten
  - `claude /mcp`
- [ ] Optional Skills installieren
  - `npx skills add supabase/agent-skills`

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert:
  - `@supabase/supabase-js` als Dependency in apps/ui
  - `apps/ui/src/lib/supabase.ts` – Client-Factory mit `getSupabaseClient()` + `isSupabaseConfigured()`
  - `apps/ui/src/lib/supabase-types.ts` – Vollständige Database-Types
  - `apps/ui/src/store/supabase-auth-store.ts` – Auth-Store (signIn/signUp/signOut)
  - `apps/ui/src/vite-env.d.ts` – VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY deklariert
  - `apps/server/.env.example` – Supabase ENV-Variablen dokumentiert
- Offene Risiken:
  - MCP-Login-Schritte (codex/claude) müssen manuell ausgeführt werden
  - Supabase-Projekt-Credentials müssen in .env eingetragen werden
