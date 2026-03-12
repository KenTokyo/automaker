ULTRATHINK

# Phase 5 - Altlasten abbauen

## Status

- Status: ✅ Fertig
- Priorität: Mittel bis hoch
- Bereich: Frontend/Backend-Phase

## Ziel

Nach den neuen Planungen für rechts und links müssen wir die alte Doppel-Struktur gezielt abbauen.

Wichtig:
`apps/chat` wird dabei **nicht** sofort blind gelöscht.
Es bleibt vorerst eine Übergangs-Quelle für Wiederverwendung.
Aber es soll nicht weiter wie ein gleichwertiger Hauptweg behandelt werden.

## Was bedeutet das konkret für den Nutzer?

Der Nutzer soll nicht mehr rätseln:

1. Starte ich den richtigen Chat?
2. Warum gibt es zwei ähnliche Oberflächen?
3. Wo ist jetzt die echte aktuelle Funktion?

Am Ende bleibt klar:
Automaker ist der Hauptweg.

## Bestehende Altlasten

Heute gibt es noch mehrere Stellen, die den Standalone-Chat wie einen eigenen Produktweg behandeln:

1. Root-Skripte wie `dev:chat`, `build:chat` und `start:chat`
2. Launcher-Hinweise wie `Chat Web`
3. eigene Doku in `apps/chat/HOW-TO-RUN.md`
4. viele alte Plan-Dateien für den Standalone-Ausbau
5. doppelte UI-Logik in `apps/chat`, obwohl Automaker der Zielort sein soll

## Architektur-Entscheidung

Wir unterscheiden ab jetzt klar zwischen:

1. **Übergangs-Quelle**
   `apps/chat` bleibt nur so lange wichtig, bis die wiederverwendbaren Teile sauber im Automaker-Chat angekommen sind.
2. **Hauptweg**
   `apps/ui` ist der echte Nutzerweg.

Das heißt:

1. keine neuen Features nur für `apps/chat`
2. alte Startwege markieren oder später entfernen
3. Doku und Launcher auf die neue Wahrheit ausrichten

## Geplante Bausteine

### 1. Altlasten-Liste mit klaren Gruppen

- Zweck: unterscheiden zwischen
  - sofort behalten
  - später entfernen
  - nur dokumentieren
- Betroffene Stellen:
  - `package.json`
  - `start-automaker.sh`
  - `apps/chat/HOW-TO-RUN.md`
  - vorhandene Standalone-Pläne
- Geschätzter Umfang: ~80 bis 140 Zeilen Doku oder kleine Anpassungen

### 2. Startwege und Benennung aufräumen

- Zweck: Nutzer nicht weiter in den alten Produktweg lenken
- Beispiele:
  - Launcher-Text klarer machen
  - alte Chat-Option als Übergang markieren oder später ausblenden
  - Doku auf Automaker als Hauptweg umstellen
- Geschätzter Umfang: ~80 bis 160 Zeilen

### 3. Wiederverwendete Bausteine aus `apps/chat` sauber markieren

- Zweck: klar festhalten, welche Teile noch Quelle sind und welche schon im Automaker angekommen sind
- Beispiele:
  - Übersicht-Bausteine
  - Datei-Bausteine
  - linke Tab-Idee
- Geschätzter Umfang: ~60 bis 120 Zeilen Doku

### 4. Neue Arbeiten am falschen Ort stoppen

- Zweck: verhindern, dass wieder neue Funktionen direkt in `apps/chat` landen
- Mittel:
  - Hinweise in Plan-Dateien
  - Hinweise in Doku
  - klare Übergangs-Regeln
- Geschätzter Umfang: ~40 bis 80 Zeilen

### 5. Rest-Risiken für spätere Entfernung sammeln

- Zweck: vor späterem Rückbau keine versteckten Abhängigkeiten übersehen
- Beispiele:
  - eigene Electron-Chat-Skripte
  - eigene Chat-Builds
  - eigene Start-Dokumente
- Geschätzter Umfang: ~60 bis 100 Zeilen

## Benötigte Bereiche

| Bereich | Zweck | Geschätzte Zeilen |
| --- | --- | --- |
| Legacy-Audit-Liste | alle alten Standalone-Wege sammeln | 80-120 |
| Startweg-Bereinigung | Scripts, Launcher, Hinweise ordnen | 80-160 |
| Übergangs-Regeln | klare Ansage für neue Arbeiten | 40-80 |
| Quellen-Map | was aus `apps/chat` noch gebraucht wird | 60-120 |
| Rückbau-Risiken | spätere Stolperstellen festhalten | 60-100 |

## Wiederverwendung und Vorsicht

Diese Dinge sollen vorerst bleiben, bis die Migration wirklich durch ist:

- `apps/chat` als Quellordner für schon gebaute UI-Bausteine
- alte Plan-Dateien als Archiv
- Startskripte, falls sie noch für Vergleich oder Extraktion gebraucht werden

Diese Dinge sollen **nicht** weiter wachsen:

1. neue Standalone-Features
2. neue Stores nur in `apps/chat`
3. neue Nutzer-Doku, die `apps/chat` als Hauptweg verkauft

## Nutzerfluss

### Beispiel 1 - Neuer Teamkollege

1. Jemand öffnet das Projekt.
2. Er schaut in die Start-Doku.
3. Er sieht sofort: Automaker ist der Hauptweg.
4. Der alte Standalone-Weg ist höchstens noch Übergang.

### Beispiel 2 - Späterer Rückbau

1. Die wiederverwendeten Teile sind im Automaker-Chat angekommen.
2. Das Team schaut in die Altlasten-Liste.
3. Es ist klar, welche Skripte und Hinweise entfernt werden können.

## Fragen und Edge Cases

### Was passiert, wenn wir `apps/chat` zu früh entfernen?

Dann verlieren wir eventuell noch Bausteine, die wir erst in Phase 6 oder später sauber prüfen wollen.

### Was passiert, wenn wir die alten Startwege einfach so stehen lassen?

Dann startet jemand weiter den falschen Weg und baut dort versehentlich neue Sachen ein.

### Was passiert mit alten Plan-Dateien?

Sie müssen nicht sofort weg.
Sie können als Archiv bleiben, sollten aber nicht mehr die aktuelle Wahrheit darstellen.

### Was passiert mit Skripten wie `dev:chat`?

Sie brauchen eine klare Entscheidung:
vorerst als Übergang behalten oder nach Abschluss entfernen.
Diese Entscheidung soll in Phase 6 sauber festgezurrt werden.

## Nicht Teil dieser Phase

1. neue UI-Umsetzung
2. TypeScript-Endprüfung
3. endgültiges Löschen von `apps/chat`

## Fertig, wenn

1. klar ist, welche Altlasten es noch gibt
2. klar ist, welche Übergangs-Wege vorerst bleiben
3. neue Arbeit nicht mehr versehentlich im Standalone-Weg landet
4. Doku und Startwege auf den Automaker-Hauptweg zeigen
5. Phase 6 mit einer klaren Restliste starten kann

## Abhängigkeit für nächste Phase

Phase 6 nutzt diese Restliste für Abschluss, Prüfung und Übergabe.
Dort wird dann festgelegt, was sofort geprüft wird und was bewusst als späterer Rückbau offen bleibt.
