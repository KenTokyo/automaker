ULTRATHINK

# Phase 3 - Rechte Seite: Übersicht

## Status

- Status: ✅ Implementiert
- Priorität: Hoch
- Bereich: Frontend/Backend-Phase

## Ziel

Die bestehende Projekt-Übersicht aus dem Standalone-Chat soll im Automaker-Chat rechts erscheinen.

Sie wird in denselben rechten Bereich eingebaut, in dem schon:

1. Browser
2. Dateien

liegen.

Danach hat der rechte Bereich drei klare Modi:

1. Browser
2. Dateien
3. Übersicht

## Was bedeutet das konkret für den Nutzer?

Der Nutzer sieht rechts auf einen Blick:

1. was zuletzt im Projekt passiert ist
2. welche Verbesserungen offen sind
3. welche Vorsichtspunkte wichtig sind

Er muss dafür nicht in einen zweiten Chat oder in eine getrennte App wechseln.

## Bestehende Grundlage

Schon vorhanden sind:

1. Server-Routen für Übersicht
2. Server-Service für Übersicht
3. Dashboard-Bausteine im Standalone-Chat
4. Hook und Store im Standalone-Chat

Die Hauptaufgabe hier ist:
bestehende Logik wiederverwenden, aber die Kopplung an `apps/chat` auflösen.

## Geplante Bausteine

### 1. Übersicht-Modus im rechten Bereich

- Zweck: `Übersicht` als dritter Modus im rechten Panel
- Verhalten:
  - letzter Modus wird gemerkt
  - vorhandene Browser- und Dateien-Modi bleiben stabil
- Geschätzter Umfang: ~80 bis 140 Zeilen

### 2. Übersicht-Adapter für Automaker

- Zweck: vorhandene Overview-API und Zustands-Logik im Automaker-Chat nutzbar machen
- Basis:
  - gemeinsame Typen aus Phase 1
  - gemeinsame API-Helfer aus Phase 1
- Geschätzter Umfang: ~180 bis 260 Zeilen

### 3. Übersicht-Panel im Automaker-Stil

- Zweck: vorhandene Dashboard-Bausteine in die rechte Seitenfläche einsetzen
- Inhalte:
  - Zeit-Tabs
  - Modellwahl
  - Laden
  - Generieren
  - Vereinfachen
  - Mehr Details
  - Sicherheits-Hinweise
- Geschätzter Umfang: ~220 bis 320 Zeilen

### 4. Kleiner Status-Hinweis im Modus-Umschalter

- Zweck: zeigen, ob für einen Zeitraum schon Daten da sind oder gerade erzeugt wird
- Geschätzter Umfang: ~60 bis 120 Zeilen

## Benötigte Komponenten

| Komponente oder Bereich        | Zweck                                             | Geschätzte Zeilen |
| ------------------------------ | ------------------------------------------------- | ----------------- |
| AgentOverviewPanel             | sichtbare Übersicht im rechten Bereich            | 180-260           |
| AgentOverviewAdapter           | verbindet Store, API und Panel                    | 180-260           |
| RightPanelModeTabs Erweiterung | dritter Modus `Übersicht`                         | 80-140            |
| OverviewStatusHint             | kleiner Hinweis für Laden oder vorhandene Daten   | 60-120            |
| Reused Dashboard Cards         | Anzeige von Inhalt, Verbesserungen und Sicherheit | 140-220           |

## Wiederverwendung aus dem Standalone-Chat

Diese Bausteine sollen möglichst direkt übernommen oder nur leicht angepasst werden:

- `dashboard-action-bar`
- `dashboard-time-tabs`
- `dashboard-loading`
- `dashboard-empty-state`
- `dashboard-overview-cards`
- `dashboard-section-card`
- `dashboard-stats-bar`
- `dashboard-security`
- `dashboard-model-selector`

Diese Teile brauchen eher einen neuen Automaker-Adapter:

1. `dashboard-panel`
2. `use-dashboard`
3. `dashboard-store`

## Nutzerfluss

### Beispiel 1 - Neue Übersicht erstellen

1. Nutzer ist im Automaker-Chat.
2. Rechts wechselt er auf `Übersicht`.
3. Er klickt auf `Neu erstellen`.
4. Während die KI arbeitet, bleibt der Bereich verständlich.
5. Nach dem Laden sieht er eine kurze Zusammenfassung.

### Beispiel 2 - Übersicht vereinfachen

1. Nutzer findet die Übersicht zu lang.
2. Er klickt auf `Vereinfachen`.
3. Die gleiche Fläche lädt neu.
4. Die alte Übersicht bleibt sichtbar, bis die neue da ist.

## Fragen und Edge Cases

### Was passiert, wenn noch keine Übersicht gespeichert ist?

Dann sieht der Nutzer einen klaren leeren Zustand mit verständlicher Aktion.

### Was passiert, wenn die Generierung lange dauert?

Dann bleibt die alte Übersicht sichtbar und ein ruhiger Ladehinweis liegt darüber.

### Was passiert bei Fehlern?

Der Nutzer bekommt eine klare Fehlermeldung und einen erneuten Versuch.

### Was passiert beim Projektwechsel mitten in der Generierung?

Die Übersicht darf nicht versehentlich im falschen Projekt landen.
Projektgebundene Zustände müssen sauber getrennt bleiben.

### Was passiert, wenn der Nutzer zwischen `Browser`, `Dateien` und `Übersicht` springt?

Die rechte Fläche darf nicht jedes Mal ihren kompletten Zustand verlieren.

## Nicht Teil dieser Phase

1. linker Übersicht-Tab in der Session-Seite
2. Abschalten alter Standalone-Wege
3. Abschluss-Doku und Gesamt-Validierung

## Fertig, wenn

1. `Übersicht` rechts sichtbar auswählbar ist
2. Laden, Status und Generieren funktionieren
3. vorhandene Dashboard-Bausteine wiederverwendet sind
4. keine neue Doppel-Logik nur für Automaker entsteht
5. der Nutzer die Übersicht dort findet, wo er auch Browser und Dateien findet

## Abhängigkeit für nächste Phase

Phase 4 klärt danach die linke Seitenleiste.
Dort soll `Übersicht` später zusätzlich als schneller Einstieg neben `Sessions` und `Docs` auftauchen.
