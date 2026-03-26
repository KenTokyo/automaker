---
title: Vercel Production Deployment + Architektur-Check für Public Kanban
description: Production deployment durchgeführt und Architekturentscheidung zur Trennung von Public-Kanban und Full-App dokumentiert
date: 2026-03-26
status: success
effort: S
files:
  - vercel.json
  - .vercelignore
  - apps/ui/src/app.tsx
  - apps/ui/src/components/views/supabase-kanban-standalone-view.tsx
  - History/supabase-mit-mcp-team-page-zu-project-configs-erzngzen-fehle.md
tags: [vercel, deploy, architecture, kanban]
---

## Ergebnis

- Neues Production-Deployment ist live:
  - `https://automaker-kanban.vercel.app`
  - Deployment-ID: `dpl_9LLW3adNCg4oV6gkupUp7fvh3xsF`

## Architektur-Bewertung

### Ist-Zustand

- Bereits teilweise getrennt über `VITE_KANBAN_STANDALONE=true`.
- Standalone-Ansicht existiert als eigene View.
- Deploy läuft aus `apps/ui` mit angepasstem Build-Command.

### Empfehlung

- Für klare technische Trennung mittelfristig ein eigenes Paket
  `apps/kanban-web` anlegen.
- Vorteile:
  - kleinerer Bundle-Footprint
  - weniger Risiko, dass Full-App-Logik in Public-Kanban landet
  - einfachere Deploy-/ENV-Verwaltung pro Ziel
