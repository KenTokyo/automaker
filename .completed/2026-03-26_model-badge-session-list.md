---
title: Model Badge in Session-Liste + Layout-Umbau
description: Model-Info (Name + Thinking/Reasoning Level) als Badge in Session-Liste, Titel volle Breite, Badges in eigener Zeile
date: 2026-03-26
status: success
effort: M
files:
  - libs/types/src/session.ts
  - apps/server/src/services/agent-service.ts
  - apps/server/src/routes/sessions/routes/index.ts
  - apps/ui/src/types/electron.d.ts
  - apps/ui/src/components/session-manager/session-list-item.tsx
tags: [feature, ui]
---

## Was wurde gemacht

### Backend (Server)

- `SessionMetadata` Interface um `thinkingLevel` und `reasoningEffort` Felder erweitert
- Persistierung von `thinkingLevel` und `reasoningEffort` bei `sendMessage` (vorher nur in-memory)
- Session-Initialisierung laedt gespeicherte model/thinkingLevel/reasoningEffort aus Metadaten
- Session-Listen API-Response gibt jetzt model/thinkingLevel/reasoningEffort zurueck

### Types (Shared)

- `AgentSession` (libs/types/src/session.ts) um model, thinkingLevel, reasoningEffort erweitert
- `SessionListItem` (apps/ui/src/types/electron.d.ts) um gleiche Felder erweitert

### UI (Frontend)

- **Layout umstrukturiert**: Titel nimmt jetzt die volle Zeile ein (Row 1: Icon + Titel)
- **Badges in separater Zeile** (Row 2): Status, Phase, Sub-Agent, Model, Timer
- **Model-Badge**: Violetter Badge mit Sparkles-Icon zeigt Modellname + Thinking/Reasoning Level
  - Beispiel: "Opus (High)" oder "Sonnet (Med)" oder "GPT-5.2 Codex (XHigh)"
  - Hover-Tooltip mit detaillierten Infos
  - "Claude " Prefix wird fuer Kompaktheit entfernt

### Wichtige Hinweise

- thinkingLevel und reasoningEffort waren vorher NUR in-memory, jetzt persistiert
- Bestehende Sessions ohne Model-Info zeigen einfach keinen Model-Badge (graceful degradation)
- Model-Badge erscheint erst nach dem ersten Message-Send mit Model-Auswahl
