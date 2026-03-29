# Agent Git Panel Commit Push - Performance Testplan

## Fokus

- Reaktionszeit beim Oeffnen des Git-Tabs.
- Re-Render-Verhalten bei Diff-Liste und Commit/Push-Statuswechseln.
- Keine unnoetigen Polling-Spitzen durch neue Queries.

## Tests

1. Git-Tab 10x oeffnen/schliessen und auf sichtbare Lag-Spitzen achten.
2. Bei 100+ geaenderten Dateien die Dateiliste und Diff-Ausklappen pruefen.
3. Commit -> Push -> Refresh hintereinander ausfuehren und auf UI-Blockaden achten.
4. Split-Mode im Right Panel mit Git + Terminal pruefen.

## Akzeptanzkriterien

- Tab-Wechsel bleibt fluessig.
- Keine Endlosschleifen durch Query-Invalidierung.
- Bedienung bleibt responsiv waehrend laufender Git-Aktion.

## Durchfuehrungsstatus

- Type-Check abgeschlossen (`npm run typecheck`).
- Manuelle Performance-Checks im UI stehen als naechster Kurztest im Browser aus.
