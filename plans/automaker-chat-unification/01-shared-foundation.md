ULTRATHINK

# Phase 1 - Gemeinsame Basis und Wiederverwendung

## Status

- Status: ✅ Fertig
- Priorität: Hoch
- Bereich: Frontend/Backend-Phase

## Ziel

Bevor wir neue Flächen im Automaker-Chat einbauen, ziehen wir die gemeinsame Grundlage gerade.

Das heißt:

1. gleiche Datentypen nicht doppelt pflegen
2. gleiche Server-Aufrufe nicht doppelt bauen
3. gleiche Zustands-Logik nicht in zwei Chat-Welten verstecken

## Was bedeutet das konkret für den Nutzer?

Neue Funktionen wie `Dateien` und `Übersicht` werden stabiler.
Der Nutzer merkt das daran, dass spätere Verbesserungen nicht an einer Stelle fehlen und an der anderen Stelle anders aussehen.

## Ausgangslage

Heute gibt es schon viel nutzbare Logik.
Aber sie liegt an ungünstigen Stellen:

1. Dashboard-Typen liegen im Server und noch einmal im Standalone-Chat.
2. Explorer-Zustand liegt im Standalone-Chat.
3. Overview-API-Helfer liegen im Standalone-Chat.
4. Der Automaker-Chat kennt diese Bausteine noch nicht als saubere gemeinsame Grundlage.

## Architektur-Entscheidung

Der Server bleibt die Hauptquelle für Daten.

`apps/chat` wird nicht weiter als eigener Zielort ausgebaut.
Stattdessen wird daraus gezielt wiederverwendbare Logik herausgelöst.

## Geplante Bausteine

### 1. Gemeinsame Übersicht-Typen

- Zweck: dieselben Datenformen in Server, Automaker-UI und Übergangsbereich nutzen
- Betroffene Stellen:
  - `apps/server/src/services/overview-types.ts`
  - `apps/chat/src/stores/dashboard-types.ts`
  - künftiger gemeinsamer Ort in `libs/types` oder einem vergleichbaren gemeinsamen Paket
- Geschätzter Umfang: ~120 bis 180 Zeilen

### 2. Gemeinsame API-Helfer für Übersicht und Dateien

- Zweck: dieselben Server-Endpunkte aus Automaker-UI und Übergangsbereich ansprechen
- Betroffene Stellen:
  - `apps/chat/src/services/overview-api.ts`
  - neuer gemeinsamer API-Helfer im UI-nahen Bereich
- Geschätzter Umfang: ~120 bis 180 Zeilen

### 3. Gemeinsame Zustands-Basis für rechten Bereich

- Zweck: merken, welcher Bereich rechts offen ist und welcher Tab zuletzt aktiv war
- Betroffene Stellen:
  - `apps/ui/src/store/app-store.ts`
  - neuer kleiner Zustand für rechten Bereich oder saubere Erweiterung des vorhandenen Stores
- Geschätzter Umfang: ~120 bis 200 Zeilen

### 4. Anzeige-Bausteine aus `apps/chat` zum Herauslösen vorbereiten

- Zweck: reine Anzeige-Komponenten vom Standalone-Chat trennen, damit sie im Automaker-Chat nutzbar werden
- Kandidaten:
  - Dashboard-Karten
  - Ladezustände
  - Zeit-Tabs
  - Datei-Vorschau
  - Such-Bausteine
- Geschätzter Umfang: ~180 bis 260 Zeilen für erste Extraktionsarbeit

## Komponenten und Dateien, die in dieser Phase vorbereitet oder angepasst werden

| Bereich | Zweck | Geschätzte Zeilen |
| --- | --- | --- |
| Gemeinsame Overview-Typen | einheitliche Datenform für Übersicht | 120-180 |
| Gemeinsame Explorer-Typen | einheitliche Datenform für Dateien und Filter | 80-140 |
| Gemeinsamer Overview-API-Helfer | Laden, Status, Generieren, Abbrechen | 120-180 |
| Gemeinsamer Explorer-API-Helfer | Suche und Zeitfilter sauber bündeln | 80-140 |
| Rechter-Bereich-Zustand | merkt offenen Bereich und aktiven Modus | 120-200 |
| Extraktions-Liste für UI-Bausteine | klare Zuordnung, was direkt nutzbar ist | 80-120 |

## Wiederverwendungsliste

Diese Teile sollen möglichst direkt übernommen oder nur leicht angepasst werden:

- Server-Routen für Übersicht
- Server-Routen für Markdown-Explorer
- Server-Service für Übersicht
- Server-Service für Zeitfilter bei Dateien
- Dashboard-Bausteine aus `apps/chat`
- Datei-Bausteine aus `apps/chat`

Diese Teile sollen **nicht** einfach blind kopiert werden:

1. komplette Standalone-Chat-Stores
2. komplette Standalone-Chat-Container-Komponenten
3. Logik, die noch zu stark an `apps/chat` hängt

## Fragen und Edge Cases

### Was passiert, wenn wir die Typen nicht zusammenziehen?

Dann kann ein kleines Server-Update später den Automaker-Chat kaputt machen, obwohl der Standalone-Chat noch läuft.

### Was passiert, wenn wir die API-Helfer doppelt behalten?

Dann werden Fehler und Änderungen an zwei Stellen gepflegt.
Genau das wollen wir vermeiden.

### Was passiert bei Projektwechsel?

Rechter Bereich, aktiver Modus und geladenes Material müssen pro Projekt sauber getrennt bleiben.

### Was passiert, wenn kein Projekt aktiv ist?

Dann dürfen neue rechte Bereiche nicht versuchen, Daten zu laden.
Es braucht einen klaren leeren Zustand.

### Was passiert bei langsamer Übersicht-Erstellung?

Der Nutzer soll einen ruhigen Ladehinweis sehen.
Alte Daten dürfen sichtbar bleiben, statt dass alles leer wird.

## Beispiel aus Nutzersicht

Ein Nutzer arbeitet an Projekt A.
Er wechselt rechts zu `Übersicht`.
Dann wechselt er zu Projekt B.

Erwartung:

1. Projekt A behält seinen letzten Zustand.
2. Projekt B zeigt seinen eigenen Zustand.
3. Nichts mischt sich durcheinander.

## Nicht Teil dieser Phase

Diese Dinge werden hier noch nicht fertig eingebaut:

1. rechter Dateien-Tab als fertige sichtbare Fläche
2. rechter Übersicht-Tab als fertige sichtbare Fläche
3. linke Seitenleiste mit neuem Übersicht-Tab

## Fertig, wenn

1. klar ist, welche Typen gemeinsam genutzt werden
2. klar ist, welche API-Helfer gemeinsam genutzt werden
3. klar ist, welcher Store den rechten Bereich steuert
4. klar ist, welche UI-Bausteine direkt wiederverwendbar sind
5. kein neuer Doppel-Weg mehr geplant ist

## Abhängigkeit für nächste Phase

Phase 2 baut direkt auf dieser Phase auf.
Ohne gemeinsame Basis würde der rechte Dateien-Bereich wieder unnötig neue Logik bekommen.
