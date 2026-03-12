ULTRATHINK

# Rechtes Panel mit integriertem Terminal - Globale Taskliste

## Status

- Status dieser Planung: Abgeschlossen
- Erstellt am: 2026-03-12
- Orchestrator Run: `orch-run-mmn4ahvc-errun5`
- Aktueller Fokus: Alle Phasen fertig

## Kurz erklärt

Das Terminal ist schon als eigener Tab im rechten Panel da.
Jetzt soll es auch direkt im Dateien-Bereich nutzbar werden.
So kann man Datei ansehen und Befehle ausführen, ohne ständig den Tab zu wechseln.

## Wichtiger Begriff

Orchestrator = unser Ablauf-Steuerer für mehrere KI-Schritte hintereinander.

## Zielbild für den Nutzer

1. Du öffnest Dateien und Terminal in einem Bereich.
2. Du blendest das Terminal bei Bedarf ein oder aus.
3. Die Fläche ist per Ziehen anpassbar.
4. Der Zustand bleibt pro Projekt sinnvoll erhalten.
5. Fehlermeldungen sind klar und in einfacher Sprache.

## Phasenübersicht

| Phase | Datei | Was wird gemacht? | Status |
| --- | --- | --- | --- |
| Phase 1 | `01-terminal-tab-rechts-basis.md` (bereits umgesetzt) | Terminal-Tab im rechten Panel | Fertig |
| Phase 2 | `02-terminal-im-dateien-panel.md` | Terminal unten im Dateien-Bereich einblendbar + resizable | Fertig |
| Phase 3 | `03-terminal-groesse-und-merken.md` | Größe und Sichtbarkeit pro Projekt merken | Fertig |
| Phase 4 | `04-terminal-status-und-fehlerhilfe.md` | Klare Hinweise bei gesperrt, aus oder Fehler | Fertig |
| Phase 5 | `05-kleine-breite-und-tastatur.md` | Bedienung auf schmalem Panel und Tastatur verbessern | Fertig |
| Phase 6 | `06-abschluss-check-und-doku.md` | Abschluss-Check, Doku, Übergabe | Fertig |

## Chat-Aufteilung mit Token-Schätzung

### CHAT 1 (bereits passiert) ~40.000 Tokens

- Phase 1 wurde umgesetzt: Terminal-Tab im rechten Panel.

### CHAT 2 (Vorarbeit) ~20.000 Tokens

- Verlauf und Ziel wurden gesammelt.

### CHAT 3 (dieser Chat) ~25.000 Tokens

- Phase 2 Planung erstellt.
- Phase 3 Planung erstellt.
- Phase 4 Planung erstellt.

### CHAT 4 (dieser Chat) ~20.000 Tokens

- Phase 5 Planung erstellt.
- Phase 6 Planung erstellt.
- Globale Liste und temp.md auf "Planung komplett" gebracht.

### CHAT 5 (Umsetzung Start) ~80.000-100.000 Tokens

- Umsetzung Phase 2 + Phase 3.

### CHAT 6 (Umsetzung Abschluss) ~70.000-90.000 Tokens

- Umsetzung Phase 4 + Phase 5 + Phase 6.

## Regel "maximal 4 Planungen pro Chat"

In diesem Chat wurden genau 4 Planungsdateien erstellt:

1. `00-global-tasklist.md`
2. `02-terminal-im-dateien-panel.md`
3. `03-terminal-groesse-und-merken.md`
4. `04-terminal-status-und-fehlerhilfe.md`

## Architektur-Leitplanken

1. Keine doppelte Terminal-Logik bauen.
2. Bestehende `TerminalView` wiederverwenden.
3. Neue UI in kleine Komponenten schneiden.
4. Pro Datei unter 700 Zeilen bleiben.
5. Texte einfach und klar halten.
6. Nach jeder Umsetzungsphase `npm run type-check` laufen lassen.

## Referenzen

- `History/rechter-panel-terminal-tab-verlauf.md`
- `History/rechtes-panel-mit-integriertem-terminal-history.md`
- `apps/ui/src/components/views/agent-view/components/right-panel-shell.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/terminal-view.tsx`

## Aktueller Stand

- Phase 1: Fertig (bereits umgesetzt)
- Phase 2: Fertig (Terminal im Dateien-Bereich einblendbar + resizable)
- Phase 3: Fertig (Groesse und Sichtbarkeit pro Projekt gemerkt via localStorage)
- Phase 4: Fertig (Status-Overlay, Error Boundary, Action-Bar)
- Phase 5: Fertig (Icon-Modus, Aria, Tastatur-Kuerzel Ctrl+Shift+T/F/E)
- Phase 6: Fertig (Type-Check bestanden, Doku aktualisiert)

## Tastatur-Kuerzel (neu)

- Ctrl+Shift+T: Terminal-Tab im rechten Panel
- Ctrl+Shift+F: Dateien-Tab im rechten Panel
- Ctrl+Shift+E: Eingebettetes Terminal im Dateien-Bereich ein/ausblenden
