---
title: Harte Trennung Public-Kanban als eigene App
description: Public-Kanban von apps/ui entkoppelt und als separates apps/kanban-web Paket mit eigenem Vercel-Build umgesetzt
date: 2026-03-26
status: success
effort: XL
files:
  - apps/kanban-web/package.json
  - apps/kanban-web/vite.config.mts
  - apps/kanban-web/index.html
  - apps/kanban-web/tsconfig.json
  - apps/kanban-web/src/main.tsx
  - apps/kanban-web/src/kanban-web-app.tsx
  - apps/kanban-web/src/vite-env.d.ts
  - apps/kanban-web/src/shims/app-store.d.ts
  - apps/kanban-web/src/components/views/supabase-kanban-standalone-view.tsx
  - apps/kanban-web/src/components/session-manager/kanban-board.tsx
  - apps/kanban-web/src/components/session-manager/kanban-task-card.tsx
  - apps/kanban-web/src/components/session-manager/kanban-quick-add.tsx
  - apps/ui/src/app.tsx
  - apps/ui/src/vite-env.d.ts
  - vercel.json
  - .vercelignore
  - package.json
  - package-lock.json
tags: [feature, refactor, config, ui]
---

## Zusammenfassung

Die Public-Kanban-Seite läuft jetzt als eigene App unter `apps/kanban-web`.
Damit ist der Deploy technisch klar von der Full-App getrennt.

### Was wurde gemacht

- Neues Workspace-Paket `apps/kanban-web` erstellt (eigener Entry, eigenes Vite-Setup).
- Bestehende Kanban-Logik aus `apps/ui` per Copy/Reuse übernommen, damit wenig Risiko durch Neuschreiben entsteht.
- `apps/ui` von Standalone-Umschaltung bereinigt (`app.tsx` rendert wieder nur die Full-App).
- `vercel.json` auf Build/Output von `apps/kanban-web` umgestellt.
- Root-Skripte ergänzt (`dev:kanban-web`, `build:kanban-web`, `typecheck:kanban-web`).
- Package-Lock nach neuem Workspace aktualisiert.

### Wichtige Entscheidungen

- Reuse vor Neuschreiben: bestehende Kanban-Komponenten wurden kopiert/angepasst, nicht neu entwickelt.
- Alias-Strategie: `@` und `@ui` zeigen auf `apps/ui/src`, lokale Kanban-Dateien nutzen relative Imports.
- Typ-Shim eingebaut (`src/shims/app-store.d.ts`), damit Kanban-Web nicht unnötig die Full-App-/Electron-Typkette lädt.

### Verifikation

- `npm run typecheck --workspace=apps/kanban-web` erfolgreich.
- `npm run build --workspace=apps/kanban-web` erfolgreich.
- `npm run typecheck --workspace=apps/ui` erfolgreich.
