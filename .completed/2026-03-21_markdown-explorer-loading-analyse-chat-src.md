---
title: Markdown Explorer Loading Analyse (apps/chat/src)
description: Analyse des Datenflusses von UI bis Dateisystem für den Zustand "Loading markdown files..." und der wahrscheinlichsten Initial-Fehlerursachen ohne Codeänderung.
date: 2026-03-21
status: success
effort: S
files:
  - apps/chat/src/components/chat-view-layout.tsx
  - apps/chat/src/components/chat-sidebar-right.tsx
  - apps/chat/src/components/markdown-explorer.tsx
  - apps/chat/src/components/markdown-tree.tsx
  - apps/chat/src/stores/explorer-store.ts
  - apps/ui/src/lib/http-api-client.ts
  - apps/chat/src/preload.ts
  - apps/chat/src/electron/ipc/server-handlers.ts
  - apps/server/src/routes/fs/routes/readdir.ts
  - apps/server/src/routes/fs/routes/read.ts
  - libs/platform/src/secure-fs.ts
  - libs/platform/src/security.ts
  - apps/chat/src/app.tsx
  - apps/chat/src/components/chat-no-project-state.tsx
  - History/markdown-explorer-loading-analyse-verlauf.md
tags: [analyse, markdown-explorer, chat, datenfluss]
---

## Was wurde gemacht

- Nur Analyse, keine produktive Logik geändert.
- Den kompletten Ablauf vom rechten Chat-Sidebar-Explorer bis zum Dateisystem geprüft.
- Speziell auf den ersten Ladezyklus und auf mögliche Hänger/Leerlauf geschaut.

## Wichtigste Erkenntnisse

- In `apps/chat/src` existiert der UI-Text `"Loading markdown files..."` nicht.
- Der Chat-Explorer lädt initial den Projektordner per `readdir`, nicht per rekursivem Markdown-Vollscan.
- Mögliche Initial-Probleme:
  - `projectPath` ist ungültig oder durch `ALLOWED_ROOT_DIRECTORY` gesperrt.
  - Request hat keinen Timeout und kann dadurch im Ladezustand hängen bleiben.
  - Versteckte Ordner (inklusive `.automaker`) werden bewusst ausgefiltert.

## Checks

- UTF-8-Schnellscan ausgeführt.
- `npm run typecheck:chat` ausgeführt.
