# Phase 13: Tool-Call Anzeige im Chat

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 6
**Geschätzte Tokens**: ~35.000

---

## Was ist das Problem?

Tool-Aufrufe sind wichtig, aber oft unübersichtlich.
Der User soll schnell verstehen, was der Agent getan hat.

## Was soll passieren?

Eine klare, aufklappbare Tool-Ansicht mit Gruppen.
Kurzinfos zuerst, Details auf Wunsch.

## Wie der User die App danach erlebt

1. Tool-Schritte sind sichtbar, aber nicht störend.
2. Ergebnisse lassen sich bei Bedarf aufklappen.
3. Fehler in Tool-Schritten sind sofort erkennbar.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `components/tool-call-group.tsx` | Gruppe mehrerer Tool-Aufrufe |
| `components/tool-call-item.tsx` | Einzelner Tool-Schritt |
| `components/tool-call-result.tsx` | Ausgabe/Ergebnis des Tools |
| `components/tool-call-summary.tsx` | Kurze Zusammenfassung pro Gruppe |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `components/chat-messages.tsx` | Tool-Elemente einbauen |
| `stores/session-store.ts` | Tool-Events sauber ablegen |
| `hooks/use-chat-stream-sync.ts` | Tool-Schritte live im Stream zusammenführen |
| `components/chat-center.tsx` | Store-Tooldaten in die sichtbaren Nachrichten mergen |
| `services/tool-call-utils.ts` | Hilfen für Dauer, Status, Timeout und Ergebnis |

---

## Aufgaben

### Aufgabe 13.1: Datenmodell für Tool-Events

- Einheitliche Struktur für Start, Laufzeit, Ende, Fehler
- Zuordnung zur passenden Assistant-Nachricht
- Zeitdauer und Status speichern

### Aufgabe 13.2: Gruppenansicht

- Mehrere Tool-Calls als Gruppe bündeln
- Kopfzeile z.B. „3 Tool-Schritte ausgeführt“
- Gruppe ein-/ausklappbar

### Aufgabe 13.3: Einzelansicht

- Name des Tools und kurze Beschreibung
- Statuschip: `läuft`, `ok`, `fehler`
- Dauer des Schritts in Sekunden
- Parameter und Ergebnis im Detailbereich

### Aufgabe 13.4: Ergebnis-Anzeige

- Kurzer Vorschau-Text
- „Mehr anzeigen“ bei langen Ergebnissen
- JSON schön formatiert darstellen

### Aufgabe 13.5: Fehlerdarstellung

- Fehler klar rot markiert
- Kurztext „Was bedeutet das für mich?“ direkt sichtbar
- Technische Details erst im Aufklappbereich

---

## Prüfpunkte

- [x] Tool-Calls erscheinen in richtiger Reihenfolge
- [x] Gruppierung funktioniert stabil
- [x] Details lassen sich öffnen und schließen
- [x] Fehler sind klar verständlich
- [x] Sehr lange Ergebnisse bleiben bedienbar

---

## Umsetzung (2026-03-10)

- Neue Tool-Ansicht ist aktiv: Gruppe, Einzel-Schritt, Ergebnis-Block und Zusammenfassung.
- Stream-Logik baut Tool-Gruppen jetzt live auf und ordnet sie der passenden Assistant-Nachricht zu.
- Bei `complete` werden laufende Schritte sauber abgeschlossen und das Ergebnis wird als Vorschau + Details gespeichert.
- Bei `error` werden Tool-Schritte klar als Fehler markiert, inklusive Text „Was bedeutet das für mich?“.
- Timeout-Fälle werden sichtbar markiert, wenn ein laufender Schritt zu lange dauert.
- Store-Merge wurde verbessert: bestehende Tool-Gruppen gehen bei späteren Message-Updates nicht mehr verloren.
- Chat-Mitte merged gespeicherte Tool-Daten in die sichtbaren Nachrichten, damit Live-Status stabil angezeigt wird.

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Tool liefert riesige Ausgabe | Kürzen + „Mehr anzeigen“ |
| Tool bleibt hängen | Timeout-Status anzeigen |
| Tool-Events kommen verspätet | Nachträgliches Einsortieren |
| Unbekannter Tool-Typ | Neutraler Standardblock |
