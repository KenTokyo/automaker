ULTRATHINK

# Phase 3: Datei-Limit und Anzahl-Steuerung

## Status

- Status: 📝 Geplant
- Abhängigkeit: Phase 1 und 2
- Umsetzung geplant in: Chat 4

## Ziel

Der Nutzer soll selbst festlegen können, wie viele Dateien in der Liste sichtbar sind.
Dafür gibt es:

1. Eine schnelle Auswahl (z. B. 25, 50, 100, 200)
2. Ein eigenes Zahlenfeld für einen individuellen Wert

### Was bedeutet das für den Nutzer?

Bei sehr großen Projekten bleibt das Panel schnell und übersichtlich.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-limit-control.tsx` (neu, ca. 170 Zeilen)

- Kombi aus Auswahlfeld + Zahlenfeld.
- Modus `Preset` oder `Eigener Wert`.
- Klare Validierung: nur positive ganze Zahlen.

### 2. `explorer-store.ts` (anpassen, ca. 120 Zeilen Änderung)

- Neue Felder:
  - `fileLimitMode` (`preset` oder `custom`)
  - `fileLimitValue` (Zahl)
- Neue Aktion `setFileLimit(...)`.
- Begrenzung wird vor dem Rendern angewendet, nicht im Server.

### 3. `files-panel.tsx` (anpassen, ca. 90 Zeilen Änderung)

- Limit-Steuerung in Toolbar einbauen.
- Anzeige `x von y` klar darstellen.
- Wenn Limit aktiv: kurzer Hilfetext „Nicht alle Dateien sichtbar“.

### 4. `file-tree.tsx` (anpassen, ca. 70 Zeilen Änderung)

- Nutzt bereits begrenzte Datenliste.
- Leerer Zustand zeigt klaren Hinweis, wenn Limit + Filter zusammen zu 0 Treffern führen.

## Nutzerbeispiele

### Beispiel 1

Du stellst auf `50`.
Die Liste ist kurz und schnell.
Unten steht klar: „50 von 392 Dateien“.

### Beispiel 2

Du gibst `120` als eigenen Wert ein.
Die Anzeige passt sich direkt an.

## Edge Cases

1. Nutzer tippt `0` oder negative Zahlen.
   - Lösung: Sofort auf Mindestwert 1 korrigieren.
2. Nutzer tippt sehr hohe Zahl (z. B. 999999).
   - Lösung: auf sinnvolle Obergrenze begrenzen (z. B. 2000).
3. Limit kleiner als aktuell gefilterte Treffer.
   - Lösung: Hinweis anzeigen, dass Liste gekürzt ist.
4. Wechsel zwischen Projekten mit unterschiedlichen Dateimengen.
   - Lösung: Limit bleibt, aber Anzeige passt sich korrekt an.

## Performance und Stabilität

- Begrenzung früh in der Anzeige-Pipeline anwenden.
- Kein zusätzlicher Netzwerkverkehr.
- Klarer Zustand im Store verhindert wilde Sonderfälle.

## Betroffene Dateien

- `apps/ui/src/store/explorer-store.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-tree.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-limit-control.tsx` (neu)

## Abnahme-Check

- [ ] Preset-Auswahl funktioniert.
- [ ] Eigener Zahlenwert funktioniert.
- [ ] Ungültige Werte werden sauber abgefangen.
- [ ] Anzeige `x von y` ist korrekt.
- [ ] `npm run type-check` ist ohne Fehler.
