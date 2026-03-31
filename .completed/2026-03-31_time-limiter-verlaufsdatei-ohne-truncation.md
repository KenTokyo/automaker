---
title: Time-Limiter Verlauf ohne Truncation
description: Folgechat nutzt bei langem Kontext eine Verlaufsdatei statt abgeschnittenem Text; Save nutzt eindeutige Dateinamen
date: 2026-03-31
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/lib/copy-all-chat.ts
  - apps/ui/src/lib/utils.ts
  - apps/ui/src/hooks/use-save-as-markdown.ts
  - History/2026-03-31_time-limiter-verlaufsdatei-task.md
  - History/time-limiter-verlaufsdatei-ohne-truncation-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Der Folgechat bei Zeitlimit hat bisher abgeschnittenen Kontext erhalten. Dadurch fehlten Informationen.
Jetzt wird bei zu langem Kontext automatisch eine Verlaufsdatei in `History/` erzeugt und ihr Pfad an die KI uebergeben.

### Was wurde gemacht

- `copy-all-chat.ts` erweitert:
  - Kontextfunktion liefert jetzt `wasTruncated` fuer sichere Entscheidung im Follow-up.
  - Truncation-Marker wurde aus dem Follow-up-Text entfernt.
  - Chat-Zusammenfassung kann optional ohne Truncation erzeugt werden.
- `agent-view.tsx` erweitert:
  - Follow-up prueft, ob Inline-Kontext gekuerzt werden muesste.
  - Bei Bedarf wird zuerst eine History-Datei geschrieben und deren Pfad an den neuen Chat uebergeben.
  - Save-Button fuer Verlauf nutzt eindeutige Dateinamen bei Namenskollisionen.
- `use-save-as-markdown.ts` erweitert:
  - Notes-Speichern nutzt ebenfalls eindeutige Dateinamen (`-2`, `-3`, ...).
- `utils.ts` erweitert:
  - Neue Hilfsfunktion `resolveUniqueFilePath(...)` fuer wiederverwendbare Suffix-Logik.

### Wichtige Entscheidungen

- Die Suffix-Logik wurde zentral in `utils.ts` abgelegt, damit Save und Notes identisch arbeiten.
- Der Follow-up nutzt Dateireferenz nur dann, wenn Inline-Kontext sonst zu lang/gekürzt waere; so bleibt der Normalfall kompakt.
- Fuer manuelles Verlaufsspeichern wird die Vollversion ohne Truncation geschrieben.

### Verifikation

- `npm run typecheck` erfolgreich.
