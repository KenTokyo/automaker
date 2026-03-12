ULTRATHINK

# temp.md - Automaker Chat Zusammenführung

## Kurzstand

- Die Master-Planung steht vollständig.
- Phase 6 wurde in diesem Chat ergänzt.
- Ziel bleibt: Automaker-Chat ausbauen, Standalone-Chat nicht weiter als eigene Produktfläche fortführen.

## Bereits angelegte Plan-Dateien

| Phase | Datei | Status |
| --- | --- | --- |
| 1 | `01-shared-foundation.md` | ✅ Datei erstellt |
| 2 | `02-right-panel-files.md` | ✅ Datei erstellt |
| 3 | `03-right-panel-dashboard.md` | ✅ Datei erstellt |
| 4 | `04-left-panel-overview-docs.md` | ✅ Datei erstellt |
| 5 | `05-legacy-cleanup.md` | ✅ Datei erstellt |
| 6 | `06-validation-handover.md` | ✅ Datei erstellt |

## Wichtigste Architektur-Entscheidung

`apps/ui` ist ab jetzt der Haupt-Chat.

`apps/chat` wird nicht weiter als eigener Zielort ausgebaut.
Es dient nur noch dazu, bereits gebaute Bausteine sauber herauszulösen und in den Automaker-Chat zu überführen.

## Was in diesem Chat neu geplant wurde

### Phase 6

- Abschluss-Checkliste für die spätere Umsetzung ergänzt
- TypeScript-Prüfung als Pflicht-Schritt festgehalten
- Nutzerwege, Projektwechsel, UTF-8-Prüfung und Rest-Risiken beschrieben
- klare Übergabe für Folge-Chats vorbereitet

## Wichtige Referenzen

- `plans/automaker-chat-unification/00-global-tasklist.md`
- `plans/automaker-chat-unification/06-validation-handover.md`
- `History/automaker-chat-unification-verlauf.md`

## Nächster Schritt

- Die Planung ist komplett.
- Der nächste Arbeitschat kann direkt mit der Umsetzung beginnen.
- Falls die Umsetzung in Teilen startet, ist Phase 1 der sauberste Einstieg.
