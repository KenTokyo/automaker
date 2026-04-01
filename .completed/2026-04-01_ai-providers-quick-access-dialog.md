---
title: AI Provider Settings Quick-Access Dialog
description: Neuer Dialog fuer direkten Zugriff auf alle AI Provider Settings per Bot-Icon im AgentHeader
date: 2026-04-01
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/components/ai-providers-dialog.tsx
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
tags: [feature, ui]
---

## Was wurde gemacht

Neuer Quick-Access-Dialog fuer AI Provider Settings, erreichbar per Bot-Icon-Button im AgentHeader.

### Neue Datei

- `ai-providers-dialog.tsx` (96 Zeilen) - Dialog mit Tabs fuer alle 6 Provider (Claude, Cursor, Codex, OpenCode, Gemini, Copilot)

### Geaendert

- `agent-header.tsx` - Bot-Icon-Button hinzugefuegt, State und Dialog-Rendering

### Architektur

- Verwendet die bestehenden Provider-Settings-Tabs 1:1 (kein Logik-Umbau)
- Dialog ist scrollbar, responsive Tab-Labels (Icons-only auf Mobile)
- Keine neue State-Management-Logik, nur lokaler useState
