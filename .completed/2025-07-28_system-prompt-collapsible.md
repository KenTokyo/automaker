---
title: System-Prompt Collapsible in Chat-Nachrichten
description: Eingebettete System-Prompts werden als aufklappbarer Bereich in User-Messages angezeigt
date: 2025-07-28
status: success
effort: M
files:
  - apps/ui/src/lib/system-prompt-payload.ts
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [feature, ui]
---

## Was wurde gemacht

### Neue Extract-Funktion (system-prompt-payload.ts)

- `extractEmbeddedSystemPrompts()` parsed den HTML-Kommentar-Block und gibt die einzelnen Sektionen zurueck
- `ExtractedSystemPrompts` Interface mit orchestratorPre, agentPrompts, orchestratorPost
- Nutzt Regex-Matching fuer die [TAG]...[/TAG] Sektionen

### Neue UI-Komponenten (message-bubble.tsx)

- `EmbeddedSystemPromptsCollapsible` - Hauptcontainer mit violettem Border, zeigt Anzahl der Sektionen
- `SystemPromptSection` - Verschachtelte Collapsibles pro Sektion (Pre/Agent/Post) mit Icons und Zeichenzaehler
- Wird nur bei User-Messages mit eingebetteten System-Prompts angezeigt
- Zwei-Ebenen-Collapsible: erst Hauptcontainer oeffnen, dann einzelne Sektionen

### Design

- Violetter Border/Hintergrund fuer den Hauptcontainer (visuell abgesetzt)
- Icons: Cpu (Hauptcontainer), Zap (Orchestrator), ScrollText (Agent)
- Zeichenzaehler pro Sektion
- Max-Height 300px mit Scroll fuer lange Prompts
- Monospace-Font fuer den Inhalt
