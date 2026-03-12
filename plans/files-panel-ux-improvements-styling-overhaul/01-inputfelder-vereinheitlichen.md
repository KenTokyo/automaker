ULTRATHINK

# Phase 1: Eingabefelder vereinheitlichen

## Status

- Status: 📝 Geplant
- Abhängigkeit: Keine
- Umsetzung geplant in: Chat 3

## Ziel

Alle Eingabefelder im Files Panel sollen gleich aussehen und sich gleich anfühlen.
Orientierung: saubere Felder wie beim Model-Selector.

### Was bedeutet das für den Nutzer?

Die Oberfläche wirkt ruhiger. Man versteht schneller, wo man klicken oder tippen soll.

## Bereich der Phase

Diese Phase betrifft nur das Aussehen und Verhalten der Felder.
Keine neuen Datei-Aktionen in dieser Phase.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-toolbar-controls.tsx` (neu, ca. 180 Zeilen)

- Bündelt die Feld-Reihe (Suche, Filter, Auswahlfelder) in einer klaren Leiste.
- Sorgt für gleiche Höhen, gleiche Abstände und gleiche Randfarben.
- Kapselt Hilfetexte für deaktivierte Felder.

### 2. `explorer-select.tsx` (neu, ca. 140 Zeilen)

- Kleine wiederverwendbare Auswahl-Komponente für das Files Panel.
- Einheitliches Verhalten bei Hover, Fokus und Tastatur-Nutzung.
- Nutzt klare Beschriftung, damit man sofort versteht, was das Feld macht.

### 3. `files-panel.tsx` (anpassen, ca. 120 Zeilen Änderung)

- Alte direkte Feld-Definitionen durch neue Toolbar-Komponente ersetzen.
- Reihenfolge der Felder vereinfachen.
- Beschriftungen auf einfache Sprache anpassen.

### 4. `files-panel-toolbar-hints.tsx` (neu, ca. 90 Zeilen)

- Zeigt kurze Hilfe unter der Leiste, wenn etwas gesperrt oder leer ist.
- Beispiel: „Noch keine Dateien gefunden. Bitte einmal aktualisieren.“

## Nutzerbeispiele

### Beispiel 1

Du öffnest das Panel und siehst sofort gleich große Felder.
Du erkennst direkt: links suchen, rechts filtern.

### Beispiel 2

Ein Feld ist gerade nicht nutzbar.
Du siehst sofort den Grund als kurzen Hilfetext.

## Edge Cases

1. Sehr schmale Breite vom rechten Panel.
   - Lösung: Felder umbrechen in 2 Zeilen statt abgeschnittenem Text.
2. Sehr lange Labeltexte.
   - Lösung: Kürzen mit Tooltip statt Layout-Bruch.
3. Keine Dateien geladen.
   - Lösung: Leiste bleibt sichtbar, Felder werden sinnvoll deaktiviert.
4. Tastatur-Nutzung ohne Maus.
   - Lösung: Sichtbarer Fokus-Rahmen und logische Tab-Reihenfolge.

## Performance und Stabilität

- Keine schweren Berechnungen in der UI.
- Leiste bleibt in kleine Teil-Komponenten geschnitten, damit Re-Renders klein bleiben.
- Keine Änderung an Server-Calls.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-toolbar-controls.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/explorer-select.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-toolbar-hints.tsx` (neu)

## Abnahme-Check

- [ ] Alle Felder haben gleiche Höhe und gleiche Randfarbe.
- [ ] Fokus-Rahmen ist gut sichtbar.
- [ ] Keine abgeschnittenen Texte bei normaler Panel-Breite.
- [ ] Hilfehinweise sind in einfacher Sprache.
- [ ] `npm run type-check` ist ohne Fehler.