ULTRATHINK

# Files Panel UX Verbesserungen - Globale Taskliste

## Status

- Status dieser Planung: ✅ Planung abgeschlossen (Planungs-Chat 2)
- Erstellt am: 2026-03-11
- Orchestrator Run: `orch-run-mmmlcvst-nr5xhy`
- Aktueller Fokus: Übergabe in den Umsetzungs-Chat (Phase 1 + 2)
- temp-Kontext: `plans/files-panel-ux-improvements-styling-overhaul/temp.md`

## Kurz erklärt

Das Files Panel funktioniert schon, aber es fühlt sich noch nicht wie ein fertiges Produkt an.
Einige Eingaben wirken uneinheitlich.
Wichtige Abläufe fehlen oder sind zu klein sichtbar.

Ziel: Das Panel soll ruhig, klar und hochwertig wirken.
Alles soll schnell und für neue Nutzer sofort verständlich sein.

## Wichtiger Begriff (einmal erklärt)

Orchestrator = unser Ablauf-Steuerer für mehrere KI-Schritte hintereinander.

## Wünsche aus dem letzten Verlauf (in einfache Abschnitte geteilt)

1. Eingabefelder sollen so sauber aussehen wie beim Model-Selector.
2. Der Button fürs Einklappen soll 2 Zustände haben: Alles zuklappen und alles aufklappen.
3. Es soll eine Auswahl geben, wie viele Dateien angezeigt werden.
4. Das Highlight-System soll über Optionen fein einstellbar sein.
5. Es soll einen großen `Pfad kopieren`- bzw. `Pfad in Chat`-Button geben.
6. Der Pfad soll direkt im Chat-Eingabefeld landen.
7. Dateien sollen beim Öffnen bearbeitet und gelöscht werden können.
8. Markdown soll wie im Docs-Bereich gerendert werden.
9. Ein klarer Zurück-Button in der Vorschau soll immer sichtbar sein.

## Architektur-Leitplanken

1. Bestehende Dateien im Files Panel weiterverwenden, nicht neu erfinden.
2. UI-Logik im Store bündeln, damit Komponenten klein bleiben.
3. Pro Datei unter 700 Zeilen bleiben.
4. Erst planen, dann umsetzen.
5. Nach jeder Umsetzungsphase TypeScript prüfen (`npm run type-check`).
6. Keine unnötigen Begriffe in der Oberfläche, Texte für 8.-Klässler halten.

## Phasenübersicht

| Phase | Datei | Was wird verbessert? | Status |
| --- | --- | --- | --- |
| 1 | `01-inputfelder-vereinheitlichen.md` | Einheitliche Felder und ruhiger Toolbar-Look | 📝 Geplant |
| 2 | `02-toolbar-collapse-expand-animation.md` | Zwei Zustände für Auf/Zuklappen mit klarer Animation | 📝 Geplant |
| 3 | `03-datei-limit-und-anzahlsteuerung.md` | Auswahl + eigenes Feld für sichtbare Dateimenge | 📝 Geplant |
| 4 | `04-highlight-optionen.md` | Stärke/Farben vom Highlight-System steuerbar machen | 📝 Geplant |
| 5 | `05-copy-path-edit-delete.md` | Großer Pfad-Button + Bearbeiten/Löschen im Datei-Preview | 📝 Geplant |
| 6 | `06-markdown-vorschau-und-zurueck.md` | Gerenderte Markdown-Vorschau mit klarer Zurück-Navigation | 📝 Geplant |

## Chat-Aufteilung mit Token-Schätzung

### CHAT 1 (Planung Teil 1) ~20.000 Tokens

| Inhalt | Status |
| --- | --- |
| Globale Taskliste | ✅ Erstellt |
| Phase 1 Planung | ✅ Erstellt |
| Phase 2 Planung | ✅ Erstellt |
| Phase 3 Planung | ✅ Erstellt |

### CHAT 2 (Planung Teil 2) ~20.000 Tokens

| Inhalt | Status |
| --- | --- |
| Phase 4 Planung | ✅ Erstellt |
| Phase 5 Planung | ✅ Erstellt |
| Phase 6 Planung | ✅ Erstellt |
| temp.md aktualisiert | ✅ Erledigt |

### CHAT 3 (Umsetzung Phase 1 + 2) ~80.000-95.000 Tokens

| Phasen | Ziel |
| --- | --- |
| Phase 1 + 2 | Neues Feld-Design und Auf/Zuklappen mit Animation live bringen |

### CHAT 4 (Umsetzung Phase 3 + 4) ~75.000-90.000 Tokens

| Phasen | Ziel |
| --- | --- |
| Phase 3 + 4 | Dateilimit und Highlight-Optionen umsetzen |

### CHAT 5 (Umsetzung Phase 5 + 6) ~80.000-100.000 Tokens

| Phasen | Ziel |
| --- | --- |
| Phase 5 + 6 | Pfad-in-Chat, Datei-Aktionen und Markdown-Vorschau finalisieren |

## Was bedeutet das konkret für den Nutzer?

- Das Panel fühlt sich deutlich ordentlicher an.
- Man findet schneller wichtige Dateien.
- Ein Pfad landet mit einem Klick direkt im Chat.
- Markdown ist leichter lesbar, weil es nicht nur roher Text ist.

## Abhängigkeiten

`Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6`

Warum in dieser Reihenfolge:

1. Erst einheitliche Eingaben.
2. Dann klare Toolbar-Steuerung.
3. Dann Dateimenge begrenzen.
4. Dann Highlight-Feinsteuerung.
5. Dann Datei-Aktionen im Alltag.
6. Zum Schluss die bessere Vorschau.

## Referenzen für den nächsten Chat

- `plans/files-panel-ux-improvements-styling-overhaul/00-global-tasklist.md`
- `plans/files-panel-ux-improvements-styling-overhaul/temp.md`
- `plans/files-panel-ux-improvements-styling-overhaul/01-inputfelder-vereinheitlichen.md`
- `plans/files-panel-ux-improvements-styling-overhaul/02-toolbar-collapse-expand-animation.md`
- `plans/files-panel-ux-improvements-styling-overhaul/03-datei-limit-und-anzahlsteuerung.md`
- `plans/files-panel-ux-improvements-styling-overhaul/04-highlight-optionen.md`
- `plans/files-panel-ux-improvements-styling-overhaul/05-copy-path-edit-delete.md`
- `plans/files-panel-ux-improvements-styling-overhaul/06-markdown-vorschau-und-zurueck.md`
- `History/files-panel-ux-improvements-styling-overhaul-history.md`

## Aktueller Stand

- ✅ Alle 6 Planungsdateien sind erstellt.
- ✅ Die Planungsphase für den Styling-Overhaul ist abgeschlossen.
- ⏳ Nächster Schritt ist die Umsetzung mit Phase 1 + 2.
