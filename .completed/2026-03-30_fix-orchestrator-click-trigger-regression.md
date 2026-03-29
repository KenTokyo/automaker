---
title: Orchestrator startet keine Folgephasen mehr beim Öffnen alter Chats
description: Klick-Regression entfernt und Completion-Trigger auf session-sicheren Pfad begrenzt
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view.tsx
  - History/orchestrator-click-trigger-regression-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Beim Anklicken eines Chats mit alter `NEXT_PHASE_READY`-Antwort wurde sofort ein neuer Folgechat gestartet.
Das war eine Regression und führte zu Mehrfachstarts.

### Was wurde gemacht

- Catch-up-Effect entfernt, der beim reinen Öffnen einer Session nachträglich triggern konnte.
- Session-Wechsel-Guard ergänzt:
  - Session-ID beim Start einer Verarbeitung merken.
  - Completion nur akzeptieren, wenn sie zur gleichen Session gehört.
- Bestehender Trigger bleibt aktiv, aber nur auf echten Completion-Übergängen.

### Wichtige Entscheidungen

- Sicherheit vor Überraschungs-Triggern priorisiert:
  - Kein Trigger mehr durch „Reinklicken in alte Chats“.
  - Trigger nur bei tatsächlichem Run-Ende.
- Einmal-Schutz (Message-Key-Guard) wurde beibehalten, damit ein Abschluss nicht mehrfach feuert.
