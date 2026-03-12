ULTRATHINK

# Phase 3: Größe und Sichtbarkeit merken

## Status

- Status: Fertig
- Abhängigkeit: Phase 2
- Umsetzung geplant in: Umsetzungs-Chat 1

## Ziel

Die eingestellte Höhe und Sichtbarkeit vom eingeblendeten Terminal sollen pro Projekt gemerkt werden.

## Was bedeutet das für den Nutzer?

Du stellst es einmal ein und beim nächsten Öffnen sieht es wieder so aus wie vorher.

## Bereich der Phase

Diese Phase erweitert den Zustand (State), nicht das Grundlayout.

## Geplante Komponenten und Aufgaben

### 1. `explorer-store.ts` (anpassen, ca. 180 Zeilen Änderung)

- Neue Werte für `terminalOpenByProject` und `terminalSizeByProject`.
- Neue Aktionen zum Setzen, Lesen und Zurücksetzen.
- Sinnvolle Standardwerte bei neuem Projekt.

### 2. `files-panel.tsx` (anpassen, ca. 120 Zeilen Änderung)

- Holt den gemerkten Zustand aus dem Store.
- Speichert neue Größe nach Ziehen der Leiste.
- Nutzt Fallback-Werte, wenn noch nichts gespeichert ist.

### 3. `files-panel-terminal-split.tsx` (anpassen, ca. 80 Zeilen Änderung)

- Übergibt Größenänderungen sauber nach oben.
- Schützt gegen ungültige Werte (z. B. 0 oder 100).

### 4. `explorer-store.test-plan.md` (optional Doku, ca. 40 Zeilen)

- Kurze Notiz, welche Zustandsfälle bei manueller Prüfung abgedeckt sein sollen.
- Kein Test-Code, nur Prüfschritte.

## Nutzerbeispiele

### Beispiel 1

Projekt A: Du lässt das Terminal offen mit 40% Höhe.
Beim nächsten Öffnen von Projekt A bleibt diese Einstellung erhalten.

### Beispiel 2

Projekt B: Dort ist das Terminal aus.
Beim Wechsel zwischen A und B bleibt jedes Projekt bei seiner eigenen Einstellung.

## Edge Cases

1. Alter Speicherwert ist ungültig.
   - Lösung: automatisch auf Standardgröße zurücksetzen.
2. Projekt wurde umbenannt oder gelöscht.
   - Lösung: verwaiste Einträge bei Gelegenheit aufräumen.
3. Schneller Projektwechsel.
   - Lösung: immer mit `projectPath` als klaren Schlüssel arbeiten.
4. Sehr kleine Fensterhöhe.
   - Lösung: Mindestgrenzen vor dem Speichern prüfen.

## Performance und Stabilität

- Nur kleine Store-Werte speichern, keine großen Objekte.
- Kein unnötiges Re-Rendern vom kompletten Files Panel.
- Handler mit stabilen Callbacks halten.

## Betroffene Dateien

- `apps/ui/src/store/explorer-store.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-split.tsx`

## Abnahme-Check

- [x] Sichtbarkeit wird pro Projekt gemerkt.
- [x] Höhe wird pro Projekt gemerkt.
- [x] Ungültige Werte werden abgefangen.
- [x] Projektwechsel fühlt sich stabil an.
- [x] `npm run type-check` ist ohne Fehler.
