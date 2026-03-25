---
title: Kontext-Condense Token-Berechnung stabilisiert
description: Kontext-Prozent für Auto-Condense realistischer gemacht und Claude-Modell-Matching für Kontextfenster korrigiert
date: 2026-03-25
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view.tsx
  - History/context-condense-token-berechnung-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Die Auto-Condense-Anzeige zeigte zu niedrige Prozentwerte, weil die Berechnung
zu grob war und wichtige Kontextteile nicht berücksichtigt hat.

### Was wurde gemacht

- Kontextschätzung in `agent-view.tsx` erweitert:
  - Text weiterhin token-nah geschätzt
  - Tool-Input als zusätzlicher Anteil berücksichtigt
  - Bildanteil als konservative Schätzung ergänzt
  - Basis-Puffer für System-/Tool-Kontext ergänzt
- Modell-Matching für Kontextfenster verbessert:
  - `claude-opus`, `claude-sonnet`, `claude-haiku` werden jetzt über
    `CLAUDE_CANONICAL_MAP` auf versionierte Modellnamen abgebildet,
    damit `contextWindow` zuverlässiger gefunden wird.

### Wichtige Entscheidungen

- Kein großer Architekturumbau in diesem Schritt, sondern ein schneller,
  stabiler Fix mit klarer Wirkung auf die UI-Prozentanzeige.
- Die Schätzung bleibt weiterhin eine Schätzung, ist aber deutlich näher an der
  echten Last als vorher.

### Verifikation

- `npm run typecheck` erfolgreich.
- UTF-8 Schnellcheck für die geänderte Datei ohne fehlerhafte Zeichen.
