ULTRATHINK

# Phase 2 - Rechte Seite: Browser und Dateien

## Status

- Status: ✅ Fertig
- Priorität: Hoch
- Bereich: Frontend-Phase

## Ziel

Die rechte Seite im Automaker-Chat soll nicht mehr nur der Browser sein.

Stattdessen bekommt sie einen klaren Umschalter für:

1. Browser
2. Dateien

Die spätere Übersicht wird in Phase 3 ergänzt.

## Was bedeutet das konkret für den Nutzer?

Der Nutzer kann rechts sofort zwischen Webseiten-Vorschau und Projektdateien wechseln, ohne den Chat zu verlassen.

Beispiel:

1. Er schaut rechts seine laufende App im Browser an.
2. Danach tippt er auf `Dateien`.
3. Er sieht sofort den Datei-Baum und kann Inhalte prüfen.

## Bestehende Grundlage

Heute gibt es schon:

1. rechten Browser-Bereich im Automaker-Chat
2. Datei-Explorer im Standalone-Chat
3. Server-Logik für Suche und Zeitfilter bei Dateien

Die Aufgabe ist also nicht Neubau, sondern sauberes Zusammenführen.

## Geplante Bausteine

### 1. Rechter Bereich als Hülle mit Modus-Umschalter

- Zweck: nicht mehr nur `browserPanelOpen`, sondern ein klarer rechter Bereich mit auswählbarem Inhalt
- Betroffene Stelle:
  - `apps/ui/src/components/views/agent-view.tsx`
  - `apps/ui/src/components/views/agent-view/components/browser-panel.tsx` oder ein neuer Hüllen-Container
- Geschätzter Umfang: ~180 bis 260 Zeilen

### 2. Modus-Leiste oben im rechten Bereich

- Zweck: einfache Tabs für `Browser` und `Dateien`
- Verhalten:
  - letzter aktiver Modus pro Projekt merken
  - keine neue Browser-Tab-Logik zerstören
- Geschätzter Umfang: ~100 bis 160 Zeilen

### 3. Datei-Bereich mit Adapter auf vorhandene Server-Endpunkte

- Zweck: Datei-Baum, Suche, Favoriten, Vorschau und Zeitfilter im Automaker-Chat sichtbar machen
- Wiederverwendung:
  - Anzeige-Bausteine aus `apps/chat`
  - gemeinsame API-Helfer aus Phase 1
- Geschätzter Umfang: ~220 bis 320 Zeilen

### 4. Header-Anbindung

- Zweck: bestehender Knopf im Header öffnet weiter den rechten Bereich, aber nicht nur den Browser
- Verhalten:
  - öffnet rechten Bereich
  - merkt den zuletzt genutzten Modus
  - auf kleinen Bildschirmen weiter vorsichtig bleiben
- Geschätzter Umfang: ~80 bis 140 Zeilen

## Benötigte Komponenten

| Komponente oder Bereich   | Zweck                                 | Geschätzte Zeilen |
| ------------------------- | ------------------------------------- | ----------------- |
| RightPanelShell           | Hülle für Browser und Dateien         | 180-260           |
| RightPanelModeTabs        | Umschalter für Modi                   | 100-160           |
| AgentFilesPanel           | Datei-Fläche im Automaker-Chat        | 160-240           |
| AgentFilesExplorerAdapter | verbindet Store, API und Anzeige      | 180-260           |
| Header-Trigger-Anpassung  | bestehender Knopf bleibt verständlich | 80-140            |

## Wiederverwendung aus dem Standalone-Chat

Diese Dinge sollen bevorzugt übernommen werden:

- `markdown-search`
- `markdown-preview`
- `markdown-tree-item`
- Teile von `markdown-tree`
- Teile von `markdown-favorites`

Diese Dinge sollen nicht 1:1 eingeklebt werden:

1. kompletter Container `markdown-explorer`
2. kompletter alter Explorer-Store ohne Anpassung

Warum nicht?

Weil die rechte Automaker-Seite schon einen eigenen Aufbau hat.
Wir brauchen deshalb einen Adapter statt eines zweiten kompletten Insel-Systems.

## Nutzerfluss

### Beispiel 1 - Datei finden

1. Nutzer chattet in der Mitte.
2. Rechts öffnet er `Dateien`.
3. Er sucht nach `README`.
4. Er klickt die Datei an.
5. Rechts sieht er die Vorschau.

### Beispiel 2 - Zuletzt geänderte Datei prüfen

1. Nutzer wechselt rechts zu `Dateien`.
2. Er setzt den Zeitfilter auf `24 Stunden`.
3. Er sieht schneller, was zuletzt bearbeitet wurde.

## Fragen und Edge Cases

### Was passiert bei sehr kleinen Bildschirmen?

Rechter Bereich darf Mobilansichten nicht überladen.
Er bleibt deshalb an die bestehende Öffnen/Schließen-Logik gebunden.

### Was passiert bei Projektwechsel?

Datei-Auswahl, Vorschau und Favoriten dürfen nicht zwischen Projekten vermischt werden.

### Was passiert, wenn eine Datei nicht lesbar ist?

Es braucht eine einfache Fehlermeldung mit klarer Aussage für den Nutzer.

### Was passiert, wenn rechts gerade der Browser offen war?

Der letzte Modus soll gemerkt werden.
Der Nutzer muss nicht jedes Mal neu umschalten.

### Was passiert, wenn keine Datei gewählt ist?

Dann zeigt der Bereich einen ruhigen Startzustand statt eine leere kaputte Fläche.

## Nicht Teil dieser Phase

1. Dashboard rechts
2. Übersicht links in der Session-Seite
3. Altlasten-Aufräumen im Standalone-Chat

## Fertig, wenn

1. der rechte Bereich einen sichtbaren Modus-Umschalter hat
2. Browser weiter normal funktioniert
3. Dateien rechts nutzbar sind
4. Datei-Vorschau und Suche laufen
5. Projektwechsel keine falschen Daten mischt

## Abhängigkeit für nächste Phase

Phase 3 nutzt dieselbe rechte Hülle weiter und ergänzt dort die Übersicht.
