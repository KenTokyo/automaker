---
title: UI Selection States + AgentHeader Glow-Effekt
description: Prominentere brand-farbige Selection fuer aktive Sessions, aktiver State fuer ProjectGroupSection, groessere Schrift + Glow im AgentHeader.
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
  - apps/ui/src/components/session-manager.tsx
tags: [ui, feature]
---

## Was wurde gemacht

### 1. Session Selection - Prominentere Farbe (session-list-item.tsx)

- `border-primary` durch `border-brand-500` ersetzt (kraeftigere Farbe)
- Staerkerer Glow-Shadow: `shadow-[0_4px_24px_-4px_hsl(var(--brand-500)/0.4)]`
- Zusaetzlicher Ring-Effekt: `ring-1 ring-brand-500/20`
- Gleiche Behandlung fuer Multiselect-Modus

### 2. ProjectGroupSection - Aktiver Projekt-State (project-group-section.tsx)

- Neues `isActiveProject` Prop hinzugefuegt
- Aktives Projekt bekommt brand-farbigen Background, Border und subtilen Glow
- Folder-Icon und Projektname werden brand-farbig hervorgehoben
- Uebergabe in session-manager.tsx via `group.projectPath === projectPath`

### 3. AgentHeader - Groessere Schrift + Glow (agent-header.tsx)

- Projekt-Name: `text-sm` -> `text-base`, `font-medium` -> `font-semibold`
- Max-Breite erhoet: `max-w-[220px]` -> `max-w-[260px]`
- Subtiler `drop-shadow` Glow-Effekt auf dem Titel
- Icon-Container leicht vergroessert (`w-8 h-8` -> `w-9 h-9`) mit brand-Glow
