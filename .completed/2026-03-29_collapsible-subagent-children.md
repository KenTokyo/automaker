---
title: Collapsible Sub-Agent Kinder in Session-Liste
description: Chevron-Toggle-Button zum Ein-/Ausklappen von Sub-Agent-Kindern in der Session-Liste eingebaut
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/components/session-manager.tsx
  - apps/ui/src/components/session-manager/session-list-item.tsx
tags: [feature, ui]
---

## Was wurde gemacht

Ein Collapsible-Toggle fuer Sub-Agent-Kinder in der Session-Liste eingebaut.

### Aenderungen

**session-manager.tsx:**

- Neuer State `collapsedSessions` (Set<string>) trackt welche Parent-Sessions ihre Kinder eingeklappt haben
- `handleToggleChildrenCollapsed` Callback zum Umschalten
- `renderSessionNode` gibt neue Props `hasChildren`, `childCount`, `isChildrenCollapsed`, `onToggleChildren` an SessionListItemRow weiter
- Kinder-Container nutzt CSS grid-rows Animation fuer smooth Collapse/Expand

**session-list-item.tsx:**

- Neue Props: `hasChildren`, `childCount`, `isChildrenCollapsed`, `onToggleChildren`
- Chevron-Button vor dem Status-Icon (nur sichtbar wenn Kinder vorhanden)
- Chevron dreht sich 90 Grad wenn eingeklappt (-rotate-90)
- Badge "X eingeklappt" in der Badge-Row wenn Kinder versteckt sind (klickbar zum Aufklappen)
