# Phase 7: Verlauf-Panel (linke Sidebar)

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 3
**Geschätzte Tokens**: ~40.000

---

## Was ist das Problem?

Im neuen Layout ist links Platz für den Verlauf.
Aktuell gibt es aber noch kein richtiges Verlauf-Panel.
Der User kann alte Chats nicht schnell finden.

## Was soll passieren?

Ein klares Verlauf-Panel mit Suche, Filtern und Gruppen nach Datum.
Jeder Verlaufseintrag zeigt Titel, letzte Aktivität und Status.

## Wie der User die App danach erlebt

1. Links sieht man alle Chats in einer Liste.
2. Mit Suche findet man alte Themen schnell.
3. Mit Filtern sieht man z.B. nur laufende oder fehlerhafte Chats.
4. Ein Klick öffnet den Chat sofort im Hauptbereich.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `components/history-panel.tsx` | Gesamtes Verlauf-Panel links |
| `components/history-search.tsx` | Suchfeld mit klarer Rückmeldung |
| `components/history-list.tsx` | Liste mit Verlaufseinträgen |
| `components/history-item.tsx` | Einzelner Verlaufseintrag |
| `components/history-filters.tsx` | Einfache Filter-Auswahl |
| `components/history-empty-state.tsx` | Leerer Zustand mit Hilfe-Text |

---

## Aufgaben

### Aufgabe 7.1: Grundaufbau des Panels

- Header mit Titel „Verlauf“
- Suchfeld oben
- Filter-Zeile darunter
- Scrollbare Liste im Hauptbereich
- Unten kleiner Bereich für Anzahl der Treffer

### Aufgabe 7.2: Suche

- Suche über Titel, letzte Nachricht und Modell
- Direkte Rückmeldung („12 Treffer“)
- Markierung der Suchbegriffe in der Liste
- Bei leerer Suche wieder komplette Liste anzeigen

### Aufgabe 7.3: Filter

- Filter nach Status: `Alle`, `Läuft`, `Gestoppt`, `Fehler`
- Filter nach Zeitraum: `Heute`, `7 Tage`, `30 Tage`, `Alle`
- Filter bleiben beim Wechsel zwischen Tabs erhalten

### Aufgabe 7.4: Gruppierung nach Datum

- Gruppen wie „Heute“, „Gestern“, „Diese Woche“, „Älter“
- Jede Gruppe kann ein- und ausgeklappt werden
- Anzahl der Chats pro Gruppe anzeigen

### Aufgabe 7.5: Verlaufseintrag

- Titel (AI-Titel oder Fallback wie „Chat 4“)
- Letzte Aktivität (z.B. „vor 12 Min“)
- Modell-Kürzel und kleines Status-Symbol
- Optional: kurzes Snippet der letzten Nachricht

### Aufgabe 7.6: Aktionen je Eintrag

- Linksklick: Chat öffnen
- Rechtsklick-Menü: Umbenennen, Archivieren, Löschen
- Tastaturfokus sichtbar, damit Bedienung ohne Maus klappt

---

## Prüfpunkte

- [x] Verlauf-Panel zeigt alle Sessions korrekt
- [x] Suche liefert passende Treffer
- [x] Filter kombinierbar ohne Fehler
- [x] Datum-Gruppen sind stabil sortiert
- [x] Ein Klick auf Eintrag öffnet den richtigen Chat
- [x] Leerer Zustand ist verständlich

---

## Edge Cases

| Fall | Lösung |
|---|---|
| 0 Sessions vorhanden | Klarer Start-Hinweis mit „Neuen Chat starten“ |
| 300+ Sessions | Liste nutzt gruppierte Anzeige und `content-visibility` für flüssiges Scrollen |
| Session ohne Titel | Fallback-Titel wie „Chat ohne Titel“ |
| Sehr lange Titel | Abschneiden mit `...` und Tooltip |
