ULTRATHINK

# Phase 6 - Abschluss und Übergabe

## Status

- Status: ✅ Fertig
- Priorität: Hoch
- Bereich: Frontend/Backend-Phase

## Ziel

Diese Phase macht die Planung komplett.
Sie beschreibt, wie wir nach der späteren Umsetzung sauber prüfen, offene Risiken einsammeln und den Stand so übergeben, dass kein neues Rätsel entsteht.

Kurz gesagt:
Nicht nur bauen, sondern am Ende auch ordentlich prüfen und verständlich abschließen.

## Was bedeutet das konkret für den Nutzer?

Der Nutzer bekommt am Ende nicht nur neue Tabs und neue Bereiche.
Er bekommt auch eine Oberfläche, die sich ruhig anfühlt, keine offensichtlichen Lücken zeigt und bei Projektwechseln nicht durcheinandergerät.

Beispiel:
Ein Nutzer wechselt zwischen zwei Projekten, öffnet links `Docs`, rechts `Dateien` und danach `Übersicht`.
Wenn diese Phase gut vorbereitet ist, bleibt dieses Wechseln stabil und nachvollziehbar.

## Wofür diese Phase da ist

Nach Phase 1 bis 5 gibt es wahrscheinlich viele neue Verbindungen:

1. gemeinsamer Datenweg für Übersicht
2. rechter Bereich mit mehreren Modi
3. linker Bereich mit drei Tabs
4. neue Übergangs-Regeln für `apps/chat`

Gerade deshalb braucht es am Ende eine klare Abschluss-Schicht.

## Geplante Bausteine

### 1. Abschluss-Checkliste für die Umsetzung

- Zweck: am Ende schnell und klar prüfen, ob wirklich alles Wichtige fertig ist
- Inhalte:
  - rechter Bereich zeigt `Browser`, `Dateien` und `Übersicht`
  - linker Bereich zeigt `Sessions`, `Docs` und `Übersicht`
  - Projektwechsel mischt keine Zustände
  - leere Zustände, Laden und Fehler sind verständlich
  - alte Doppel-Wege sind dokumentiert oder bewusst markiert
- Geschätzter Umfang: ~80 bis 140 Zeilen

### 2. TypeScript-Prüfung als Pflicht-Schritt

- Zweck: nach der Umsetzung technische Brüche früh finden
- Befehl:
  - `npm run type-check`
- Wichtig:
  - kein `npm run build`
  - kein `npm run dev`
- Geschätzter Umfang: ~20 bis 40 Zeilen Doku

### 3. Nutzer-Prüfung für die wichtigsten Wege

- Zweck: nicht nur Technik prüfen, sondern auch echte Nutzung
- Beispiele:
  - von Chat zu `Dateien` wechseln
  - links von `Sessions` zu `Docs` und `Übersicht` springen
  - Übersicht neu erzeugen
  - Projekt wechseln und zurückgehen
  - auf schmaler Breite Overlay-Verhalten prüfen
- Geschätzter Umfang: ~80 bis 140 Zeilen

### 4. UTF-8- und Text-Prüfung

- Zweck: kaputte Umlaute, komische Zeichen und zu schwere Texte vor Abgabe finden
- Prüfpunkte:
  - keine sichtbar kaputten Zeichenfolgen in Oberfläche, Doku oder Verlauf
  - echte Umlaute bleiben erhalten
  - UI-Texte sind für 8.-Klässler verständlich
- Geschätzter Umfang: ~40 bis 80 Zeilen

### 5. Offene Restliste für bewusste Spätarbeit

- Zweck: nicht alles unter Zeitdruck noch schnell hineindrücken
- Beispiele:
  - spätere vollständige Entfernung von `apps/chat`
  - letzte Skript-Bereinigung
  - spätere kleine UI-Politur
- Geschätzter Umfang: ~60 bis 100 Zeilen

### 6. Übergabe-Text für den nächsten Arbeitschat

- Zweck: der nächste Chat oder Teamkollege versteht sofort den Stand
- Inhalte:
  - was fertig ist
  - was bewusst offen bleibt
  - welche Dateien wichtig sind
  - welcher Prüfstatus schon vorliegt
- Geschätzter Umfang: ~60 bis 100 Zeilen

## Benötigte Bereiche

| Bereich | Zweck | Geschätzte Zeilen |
| --- | --- | --- |
| FinalChecklist | Abschluss-Liste für rechts, links und Altlasten | 80-140 |
| ValidationNotes | Nutzerwege, Fehlerfälle und Projektwechsel prüfen | 80-140 |
| TypeCheckStep | TypeScript-Endprüfung festhalten | 20-40 |
| Utf8Review | Umlaute und verständliche Texte prüfen | 40-80 |
| OpenRisksList | bewusst offene Restpunkte sammeln | 60-100 |
| HandoverBlock | klare Übergabe für Folge-Chat oder Team | 60-100 |

## Was genau geprüft werden soll

### Rechte Seite

1. `Browser` funktioniert weiter wie vorher.
2. `Dateien` öffnen, suchen und Vorschau laufen stabil.
3. `Übersicht` lädt, zeigt Status und kann neu erstellt werden.

### Linke Seite

1. `Sessions` bleibt der schnelle Einstieg in alte Chats.
2. `Docs` verliert geöffnete Inhalte nicht unnötig.
3. `Übersicht` nutzt denselben Datenweg wie rechts.

### Projektwechsel

1. linker aktiver Tab bleibt pro Projekt sauber getrennt
2. rechter aktiver Modus bleibt pro Projekt sauber getrennt
3. Übersicht und Datei-Auswahl landen nicht im falschen Projekt

### Kleine Breiten

1. linkes Overlay bleibt antippbar
2. rechter Bereich wirkt nicht überladen
3. Tab-Leisten bleiben verständlich

## Nutzerfluss

### Beispiel 1 - Normale Arbeitsrunde

1. Nutzer öffnet ein Projekt.
2. Er schaut rechts in `Dateien`.
3. Danach öffnet er rechts `Übersicht`.
4. Links springt er kurz in `Docs`.
5. Danach geht er zurück zu `Sessions`.

Erwartung:
Der Zustand bleibt ruhig, logisch und ohne sichtbares Durcheinander.

### Beispiel 2 - Projektwechsel

1. Nutzer arbeitet in Projekt A.
2. Rechts ist `Übersicht` offen.
3. Er wechselt zu Projekt B.
4. Dort öffnet er links `Docs`.
5. Danach geht er zurück zu Projekt A.

Erwartung:
Projekt A zeigt wieder seinen eigenen Stand.
Projekt B hat seinen eigenen linken und rechten Zustand.

## Fragen und Edge Cases

### Was passiert, wenn die TypeScript-Prüfung Fehler findet?

Dann ist die Umsetzung noch nicht abgabereif.
Die Fehler müssen vor einer echten Übergabe eingeordnet und möglichst behoben werden.

### Was passiert, wenn die Oberfläche technisch läuft, aber Texte schwer verständlich sind?

Dann ist die Aufgabe noch nicht sauber fertig.
Die Texte müssen vereinfacht werden, damit Nutzer schnell verstehen, was sie sehen.

### Was passiert, wenn rechts und links dieselben Daten zeigen, aber sich unterschiedlich verhalten?

Dann fehlt wahrscheinlich noch eine gemeinsame Zustands-Regel oder ein sauberer Adapter.
Das muss vor Abschluss sichtbar gemacht werden.

### Was passiert, wenn alte Standalone-Skripte noch gebraucht werden?

Dann bleiben sie vorerst bewusst als Übergang stehen.
Sie dürfen aber nicht mehr wie der Hauptweg beschrieben werden.

## Nicht Teil dieser Phase

1. neue große Produktfunktionen
2. zusätzliche Tests außerhalb der geplanten Abschluss-Prüfung
3. spontanes Komplett-Löschen von `apps/chat`

## Fertig, wenn

1. alle sechs Plan-Dateien vorhanden sind
2. die Abschluss-Checkliste klar beschreibt, was später geprüft werden muss
3. `npm run type-check` als Pflicht-Schritt festgehalten ist
4. UTF-8- und Text-Prüfung ausdrücklich mitgedacht ist
5. es eine klare Restliste und einen klaren Übergabe-Block gibt

## Ergebnis dieser Phase

Mit dieser Datei ist die Plan-Reihe vollständig.
Der nächste Chat muss nicht mehr weiter planen, sondern kann die Umsetzung oder einen Teil davon gezielt starten.
