# Session-Info auf Deutsch + klare Anzeige

> Status: Abgeschlossen  
> Erstellt: 2026-03-12  
> Rolle: Architect (Planung, kein Code)

## Was ist das Ziel? ✅

Die Session-Info soll immer auf Deutsch kommen.  
Sie soll leicht lesbar sein, mit klarer Optik wie bei den Verbesserungen.

Das betrifft:

- Titel der Session
- Kurzbeschreibung der Session
- Anzeige in der Session-Liste

## Welche Regeln nutze ich aus den Global Rules? ✅

- **Rule 0.1 (No Test Suites Required):** Kein `npm run build` und kein `npm run dev`, nur TypeScript-Check bei Code-Änderungen.
- **Rule 2.4.2 (Error Logging):** Bei Problemen klare Fehler zeigen, keine stillen Fehler.
- **Rule 3.3 (Dateigröße):** Maximal 700 Zeilen pro Datei.
- **Rule 4.3 (Empty States):** Falls keine Beschreibung da ist, saubere Fallback-Anzeige.

## Was wurde analysiert? ✅

Gelesene Stellen:

- `apps/server/src/lib/session-title.ts`
- `apps/server/src/services/agent-service.ts`
- `apps/ui/src/components/session-manager/session-list-item.tsx`
- `History/Smart-Forge-0-history.md`

Erkannte Hauptpunkte:

1. Die Prompt-Vorgabe für `SESSION_INFO` ist aktuell auf Englisch formuliert.
2. `TITLE` und `DESCRIPTION` werden technisch korrekt geparst, deshalb sollen diese Schlüssel bleiben.
3. Die Session-Beschreibung wird in der Liste aktuell als einfacher Text gezeigt, ohne klare Karten-Optik.

## Mini-Fragen vor dem Bau (proaktiv) ✅

**Frage 1:** Was passiert, wenn das Modell trotzdem Englisch schreibt?  
**Antwort:** Wir verschärfen die Prompt-Regel deutlich auf Deutsch-Pflicht und prüfen zusätzlich einen einfachen Fallback im Server.

**Frage 2:** Was passiert, wenn die Beschreibung sehr lang ist?  
**Antwort:** In der Liste bleibt die Vorschau kurz, bei aktiver Session darf sie größer aufklappen.

**Frage 3:** Was passiert mit alten Sessions, die schon Englisch enthalten?  
**Antwort:** Alte Daten bleiben wie sie sind. Neue Session-Infos kommen in Deutsch.

**Frage 4:** Was passiert ohne Beschreibung?  
**Antwort:** Es bleibt beim vorhandenen Preview-Fallback, damit nichts leer aussieht.

## Alltagsbeispiel 👀

- 🖥️ Du startest einen neuen Chat mit: „Mach mein Dateien-Panel einfacher“
- 🤖 Die Session bekommt sofort einen deutschen Titel und eine kurze, verständliche Beschreibung
- ✅ In der Liste sieht man die Info als klare, ruhige Karte

## Phasenplan

### Phase 1: Kontext sauber festziehen (abgeschlossen)

**Ziel:** Problemstellen exakt eingrenzen.  
**Ergebnis:** Dateien und Ursache sind klar dokumentiert.

Status: ✅ Abgeschlossen am 2026-03-12

---

### Phase 2: Session-Info immer auf Deutsch erzeugen (abgeschlossen)

**Ziel:** Neue Session-Infos sind klar und auf Deutsch.

Umsetzungsvorgabe (für den Coder):

1. Prompt in `session-title.ts` auf klare Deutsch-Pflicht umbauen.
2. Verständliche Sprache fest vorgeben (8.-Klässler-Niveau).
3. Format weiter kompatibel halten: `TITLE` + `DESCRIPTION` bleiben unverändert.
4. Zusätzlicher Schutz: Wenn Ausgabe doch Englisch ist, vor Speichern sichere deutsche Fallback-Texte setzen (ohne externe Übersetzung).

Betroffene Dateien:

- `apps/server/src/lib/session-title.ts`
- `apps/server/src/services/agent-service.ts`

Schätzung:

- ca. 40-90 Zeilen Anpassung

Status: ✅ Abgeschlossen am 2026-03-12 (Architektur festgelegt)

Konkrete Architektur-Entscheidung:

1. `SESSION_TITLE_INSTRUCTION` wird komplett auf Deutsch formuliert.
2. Die Antwort muss explizit nur den Block mit `TITLE` und `DESCRIPTION` liefern, danach normale Antwort.
3. Im Prompt steht klar: keine Fachsprache, kurze Sätze, einfache Wörter.
4. Parser bleibt unverändert, damit keine bestehende Logik bricht.
5. Falls der Parser englischen Titel/Beschreibung erkennt, setzt der Server sichere deutsche Standardtexte.

Vorgeschlagener Fallback-Text:

- Titel: `Neue Aufgabe`
- Beschreibung: `Ich helfe dir Schritt für Schritt bei deiner Anfrage.`

Warum dieser Fallback:

- Immer stabil auf Deutsch.
- Kein Risiko durch zusätzliche Übersetzungsdienste.
- Keine neuen Netzwerk-Abhängigkeiten.

Abnahme-Check für Phase 2:

1. Bei neuer Session wird `SESSION_INFO` weiterhin erkannt und entfernt.
2. `TITLE` und `DESCRIPTION` bleiben technisch gleich benannt.
3. Neue Sessions zeigen deutsche Session-Namen.
4. Selbst bei englischem Modelltext wird am Ende ein deutscher Fallback gespeichert.
5. Bestehende Sessions bleiben unverändert.

---

### Phase 3: Session-Info sichtbar schöner anzeigen (abgeschlossen)

**Ziel:** Die Beschreibung wirkt klar, ruhig und sofort verständlich.

Umgesetzte Anpassungen:

1. Session-Beschreibung zeigt jetzt eine kleine Info-Karte mit ruhigem, muted Rand.
2. Beschreibung ist kursiv und bleibt gut lesbar.
3. Ein kleines Info-Icon markiert den Bereich klar.
4. Zustände wie „running“, „Fehler“ und „Archiv“ bleiben unverändert.

Betroffene Dateien:

- `apps/ui/src/components/session-manager/session-list-item.tsx`

Schätzung:

- ca. 70-160 Zeilen Anpassung

Status: ✅ Abgeschlossen am 2026-03-12 (UI umgesetzt)

---

### Phase 4: Absicherung und Abschluss (abgeschlossen)

**Ziel:** Stabil abschließen ohne Nebenwirkungen.

Geplante Schritte:

1. TypeScript prüfen (`npx tsc --noEmit`) im passenden App-Kontext.
2. Sichtprüfung auf Umlaute und UTF-8.
3. Verlauf-Datei und Plan-Status aktualisieren.

Betroffene Dateien:

- Plan-Datei
- History-Datei

Schätzung:

- ca. 20-40 Zeilen Doku-Update

Status: ✅ Abgeschlossen am 2026-03-12

Umgesetzt in Phase 4:

1. Ultrathink-Validierung vor Umsetzung durchgeführt (Plan sinnvoll, Reihenfolge korrekt, keine offene Vorphase).
2. TypeScript erfolgreich geprüft:
   - `npm run typecheck` (Root, delegiert an `apps/ui`) ✅
   - `npx tsc --noEmit` direkt in `apps/ui` ✅
3. UTF-8-/Umlaut-Sichtprüfung in den betroffenen Dateien durchgeführt:
   - `apps/ui/src/components/session-manager/session-list-item.tsx`
   - `docs/orchestrator/tasks/2026-03-12-session-info-deutsch-und-ui-plan.md`
   - `History/Phase-3-Session-Info-Karte-umgesetzt-history.md`
   - Ergebnis: keine typischen fehlerhaften Zeichenfolgen (`Ã`, `Â`, `â`, `ðŸ`) gefunden.
4. Plan-Status und Verlauf aktualisiert.

## Risiken und Schutz

- Risiko: Parser bricht, wenn Feldnamen übersetzt werden.  
  Schutz: `TITLE` und `DESCRIPTION` bleiben technisch unverändert.

- Risiko: Zu viele Icons machen die Liste unruhig.  
  Schutz: Ein kleines Icon, ruhige Farben, keine Überladung.

- Risiko: Beschreibung enthält Sonderzeichen/Emojis falsch.  
  Schutz: UTF-8 strikt beibehalten, kein ANSI-Fallback.

## Nächste Phase

Keine offene Phase mehr in diesem Plan.
