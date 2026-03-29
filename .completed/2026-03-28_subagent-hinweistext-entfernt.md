---
title: Sub-Agent Hinweistext entfernt
description: Der zusätzliche Hinweistext in leeren Sub-Agent-Session-Zeilen wurde entfernt
date: 2026-03-28
status: success
effort: S
provider: claude
files:
  - apps/ui/src/components/session-manager/session-list-item.tsx
  - History/subagent-history-kompakt-klicklogik-verlauf.md
tags: [ui, cleanup]
---

## Zusammenfassung

In der Session-Liste wurde der zusätzliche Hinweistext unter leeren Sub-Agent-Zeilen entfernt.

### Was wurde gemacht

- Textblock in `SessionListItemRow` entfernt.
- Restliche Sub-Agent-Logik (kompakte Darstellung + Klickverhalten) unverändert gelassen.

### Verifikation

- `npm run typecheck` erfolgreich.
