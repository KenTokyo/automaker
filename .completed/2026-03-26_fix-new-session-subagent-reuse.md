---
title: New Session ignoriert Sub-Agent-Leersessions
description: Der New-Flow nutzt nur noch normale leere Sessions und springt nicht mehr in Sub-Agent-Threads
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/session-manager.tsx
  - History/sub-agent-task-bugged-wird-beim-neuen-chat-erzeugen-sleketie.md
tags: [bugfix, ui]
---

## Zusammenfassung

Beim Klick auf **New** wurde in manchen Fällen eine leere Sub-Agent-Session wiederverwendet.
Das führte dazu, dass der Nutzer nicht in einem echten neuen Chat landete.

### Was wurde gemacht

- Die Wiederverwendungs-Regel für leere Sessions zentralisiert.
- Reuse erlaubt jetzt nur normale Sessions:
  - gleiche Projekt-Quelle
  - `0` Nachrichten
  - nicht archiviert
  - nicht laufend
  - **nicht** `sourceType: subagent`
  - **kein** `parentSessionId` (also keine Child-Session)
- Die Projekt-Plus-Logik nutzt dieselbe zentrale Reuse-Funktion.
- Der bestehende History-Eintrag zum Bug wurde um den Fix-Status ergänzt.

### Warum so

- Kleinster sichere Fix ohne neue Architektur.
- Keine neuen Dateien oder doppelte Logik.
- Bestehendes Verhalten „leere Session wiederverwenden“ bleibt erhalten, aber ohne Sub-Agent-Seitenwirkung.
