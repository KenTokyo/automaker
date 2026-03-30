---
title: Fix Delete-Old-Sessions Cascade Logic
description: Loeschvorschau und Bulk-Delete fuer Session-Baeume robust gemacht
date: 2026-03-30
status: success
effort: M
files:
  - apps/ui/src/components/dialogs/delete-old-sessions-dialog.tsx
  - apps/ui/src/components/session-manager.tsx
  - History/2026-03-30_delete-old-sessions-loeschlogik-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Die bisherige Session-Loeschlogik hatte Probleme bei Parent/Child-Beziehungen.
Dadurch konnte die Vorschau von der echten Loeschung abweichen und der Vorgang bei 404-Fehlern abbrechen.

### Was wurde gemacht

- `DeleteOldSessionsDialog` auf kaskadensichere Berechnung umgestellt.
- Schutzregel eingebaut: aktuelle Session bleibt immer erhalten, auch indirekt.
- Modus `older-than`: Vorfahren neuerer Sessions werden geschuetzt, damit keine juengeren Kinder indirekt geloescht werden.
- Modus `keep-last`: geschuetzte Root-Sessions behalten automatisch ihre Descendants.
- Dialog-Loeschaktionen auf async umgestellt und waehrend laufender Loeschung gesperrt.
- `SessionManager`: Bulk-Delete sortiert IDs jetzt nach Tiefe (Kinder zuerst), behandelt "not found" tolerant und beendet Loeschung nicht vorzeitig.

### Wichtige Entscheidungen

- Konsistenz vor Minimalismus: Vorschau und echtes Verhalten wurden auf dieselbe Cascade-Logik gebracht.
- Defensive Fehlerbehandlung: bereits indirekt geloeschte Sessions stoppen den Rest des Bulk-Loeschens nicht mehr.
