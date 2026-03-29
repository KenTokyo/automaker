---
title: Automaker AGENTS und CLAUDE an NoteDrill-Format angeglichen
description: AGENTS fast identisch zu NoteDrill aufgebaut, CLAUDE als reine Automaker-Architektur neu strukturiert und 5 Sub-Agenten ergänzt
date: 2026-03-29
status: success
effort: L
files:
  - AGENTS.md
  - CLAUDE.md
  - .codex/agents/erkunder-docs.toml
  - .codex/agents/erkunder-code.toml
  - .codex/agents/duplikat-checker.toml
  - .codex/agents/abschliesser.toml
  - .codex/agents/ki-architekt.toml
  - .claude/agents/ki-architekt.md
  - History/2026-03-29_automaker-agents-claude-angleichung-verlauf.md
tags: [docs, config, cleanup]
---

## Zusammenfassung

Die Steuerdateien wurden für Automaker so umgebaut, dass sie in Aufbau und Leselogik zu NoteDrill passen:

- `AGENTS.md` ist jetzt fast identisch aufgebaut (Regeln, Stil, Pre-Task-Recon, Sub-Agent-Workflow).
- `CLAUDE.md` enthält jetzt nur noch Architekturwissen für Automaker (Monorepo, UI/Server, Provider, Worktree-Isolation, Datenhaltung).

Zusätzlich wurden die 5 gewünschten Sub-Agenten im Automaker-Projekt angelegt und validiert.

## Wichtige Entscheidungen

- AGENTS/CLAUDE strikt getrennt, um Vermischung von Regeln und Architektur zu vermeiden.
- Automaker-spezifische Pfade und Bereiche in CLAUDE dokumentiert.
- Fallback für `ki-architekt` bewusst ergänzt, damit AGENTS-Regel sofort praktisch nutzbar ist.
