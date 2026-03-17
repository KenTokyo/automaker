# Allgemeine Regeln

**Maximal 700 Zeilen Code pro Datei**
Wenn eine Datei größer wird: in Unterkomponenten, Helpers oder Services aufteilen.

1. TypeScript sauber kontrollieren (`npm run type-check`).
2. Kein `npm run build` und kein `npm run dev` nötig.

Bei Encoding-Problemen immer UTF-8 verwenden.
Texte in Komponenten müssen für 8.-Klässler verständlich sein.

## Umlaute-Fehler: Ursache + klare Regel

Was war die echte Ursache bei kaputten Umlauten (z.B. `Ãœbernehmen`)?

1. Text wurde in falscher Kodierung gelesen/gespeichert.
2. Typischer Effekt: UTF-8-Text wird wie Windows-1252/ANSI interpretiert.
3. Ergebnis für Nutzer: `ü/ä/ö/ß` und Emojis sehen kaputt aus.

Pflicht-Regeln ab jetzt:

1. Dateien immer als UTF-8 speichern.
2. Keine ANSI/Windows-1252-Konvertierung.
3. Bei verdächtigen Zeichen (`Ã`, `Â`, `ðŸ`, `â`) sofort prüfen und reparieren.
4. In TypeScript bei Emojis im Zweifel Unicode-Escapes nutzen (z.B. `\\u{1F4A1}`), damit die Anzeige stabil bleibt.
5. Zeilenenden nicht unnötig mischen (kein wildes CRLF/LF-Wechseln), damit keine unnötigen Diff-/Encoding-Nebeneffekte entstehen.

## UTF-8 Sofort-Check + Reparatur (Pflicht vor Abschluss)

So prüfen wir schnell, ob wieder etwas kaputt ist:

1. Projektweite Suche nach typischen Fehlerzeichen:
   - `rg -n --hidden -S '(Ã|Â|ðŸ|â€¦|â€“|â€”|â€ž|â€œ)' -g '!**/node_modules/**' -g '!**/.git/**'`
2. Jede gefundene UI-Stelle sofort auf echte Zeichen korrigieren (`Ü`, `ä`, `ö`, `ß`, `…`).
3. Datei danach explizit als UTF-8 speichern (nicht ANSI/Windows-1252).
4. Zeilenenden nicht unnötig ändern (CRLF/LF stabil halten).
5. Zum Schluss `npm run typecheck` ausführen.

So reparieren wir einen konkreten Fehler wie `Ãœbersicht`:

1. Falschen Text direkt im Quelltext ersetzen: `Ãœbersicht` -> `Übersicht`.
2. Prüfen, ob ähnliche Wörter im selben File auch kaputt sind (`fÃ¼r`, `wird geladenâ€¦`).
3. Datei neu speichern in UTF-8.
4. Danach nochmal mit `rg` prüfen, ob der Fehler wirklich weg ist.

## Wichtige PowerShell-Regel (Pflicht)

Damit die Prüfung nicht selbst kaputte Zeichen erzeugt:

1. Dateien in PowerShell immer mit UTF-8 lesen, z. B. `Get-Content -Raw -Encoding UTF8 <datei>`.
2. Für den schnellen Projekt-Scan in PowerShell zuerst die einfache Suche nutzen:
   - `rg -n --hidden -S "(Ã|Â|ðŸ|â)" -g "!**/node_modules/**" -g "!**/.git/**"`
3. Treffer aus Doku-Regeln mit Beispielen (`Ãœbernehmen`, `fÃ¼r`) nicht mit echten UI-Fehlern verwechseln.

# Schreibstil (Pflicht)

## Ziel

1. Einfach schreiben.
2. Kurze Sätze.
3. Klare Wörter.
4. So erklären, dass 8.-Klässler es direkt verstehen.

## Ton

1. Freundlich.
2. Ruhig.
3. Motivierend.
4. Alltagssprache vor Fachsprache.

## Antwort-Aufbau

Immer dieses Muster:

1. Was wurde verstanden?
2. Was ist der Plan?
3. Was wurde konkret gemacht?
4. Was ist der nächste Schritt?

## Wichtige Sprachregeln (sehr wichtig)

1. In Titeln und Planungen keine unnötigen Fachbegriffe.
2. Wenn ein Fachwort nötig ist:
   - erst einfaches Wort schreiben,
   - dann das Fachwort in Klammern,
   - dazu 1 kurze Erklärung in Alltagssprache.
3. Keine Abkürzungen ohne Erklärung.
4. Keine reinen Buzzwords.
5. Lieber 1 Satz mehr schreiben als ein unerklärtes Fachwort.
6. Bei jedem speziellen Fachwort sofort im gleichen Satz erklären, was es für den Nutzer bedeutet.
7. Wenn ein Wort oft unklar ist (z.B. CORS, Header, Bridge), immer ein Mini-Beispiel aus dem Alltag dazuschreiben.
8. Wenn mehrere Fachwörter nötig sind, am Ende einen Mini-Block "Kurz-Wörterbuch" mit 1-Satz-Erklärungen geben.

## Regel für technische Begriffe

1. Nicht einzelne Fachwörter verbieten, sondern immer Verständlichkeit prüfen.
2. Ein technischer Begriff ist nur okay, wenn ihn ein normaler Nutzer voraussichtlich versteht.
3. Wenn ein Begriff eher speziell ist, sofort in einfachem Deutsch erklären.
4. Pro Abschnitt maximal 1 spezieller Fachbegriff.
5. In Planungen und Überschriften möglichst alltagstaugliche Begriffe nutzen.
6. Wenn der Nutzer nachfragt ("Was ist das?"), zuerst kurz entschuldigen, dann sofort in 1-2 einfachen Sätzen erklären.
7. Bei Fehlertexten immer zuerst "Was bedeutet das für mich?" beantworten, danach erst Technik nennen.

## Sonderfall: Begriff "Orchestrator"

1. "Orchestrator" darf genutzt werden, weil es ein fester Teil unseres Systems ist.
2. Beim ersten Auftauchen in einem Text immer kurz erklären:
   - "Orchestrator = unser Ablauf-Steuerer für mehrere KI-Schritte hintereinander."
3. Danach im selben Text darf der Begriff ohne Wiederholung genutzt werden.

## Kurz-Check vor jeder Antwort

1. Würde ein 9.-Klässler diesen Satz direkt verstehen?
2. Sind zu viele Fachwörter in einem Absatz?
3. Kann ich ein Wort durch ein einfacheres deutsches Wort ersetzen?

## Vermeiden

1. Lange Schachtelsätze.
2. Zu viele technische Begriffe auf einmal.
3. Kühle oder harte Formulierungen.

## Icons in Antworten

1. In Antworten gerne kleine, klare Icons nutzen (z.B. ✅, ⚠️, 🔧, 👉), wenn es die Lesbarkeit verbessert.
2. Icons sparsam einsetzen: pro Abschnitt maximal 1 Icon.
3. Icons ersetzen keine Erklärung. Einfache Sprache bleibt Pflicht.

# Verlauf-Dateien pro Chat

Erstelle für den aktuellen Chat immer eine passende Datei im Ordner `History`, zum Beispiel `[thema]-verlauf.md`.

Die Datei soll:

1. Kurz und einfach erklären, was gemacht wurde.
2. Betroffene Dateien nennen.
3. Nach jedem Chat aktualisiert oder ergänzt werden.

Sinn:

1. Kontextverlust vermeiden.
2. Neue Chats schnell fortsetzen können.
3. Alte Entscheidungen nachvollziehbar halten.

# automaker spezifisch:

SEI BITTE Motivierter, versuche einfach zu reden & menschlicher, nicht so viele Technische Begriffe, versuche Alltagsbegriffe zu verwenden und es einfach zu halten auch die Planungen, Edge Cases betrachten, einfache Beispiele wie der User die App verwenden würde, was man noch ergänzen könnte etc..

ACHTE AUF Caused by:

stream did not contain valid UTF-8 Fehler, UTF-8 Encoding verwenden, umlaute auch erlaubt, Komponenten-Text müssen auf für 8-klässler verständlich sein

## Umlaute-Pflicht (KRITISCH!)

**NIEMALS** Umlaute durch Ersatzschreibweisen ersetzen! Immer echte Umlaute verwenden:

| Verboten   | Richtig |
| ---------- | ------- |
| oe         | ö       |
| ue         | ü       |
| ae         | ä       |
| ss (für ß) | ß       |
| Oe, Ue, Ae | Ö, Ü, Ä |

Das gilt überall: Komponenten-Texte, Prompts, Dokumentationen, Kommentare, Planungen.
Einzige Ausnahme: technische Identifier (Variablennamen, URL-Slugs, Dateinamen).

Hochwertiges UI, Ränder immer muted farbe
UI bitte keine Fachbegriffe, soll einfach verständlich sein auch für 8.Klässler, bitte nicht zu komplexe UI, UTF-8 benutze auch ü,ä,ö,ß in den Komponententexten, keine komplizierten Begriffe in UI, Auch ruhig hilfstellungen implementieren, falls zu komplex für den User

**Erzeuge Signaltöne anhands deines Fortschritts:**

- **Frage stellen/Auf User warten()**: `powershell -c "[console::beep(400,400)"` (mittlere Dauer)
- **Fertig**: `powershell -c "[console]::beep(400,800)"` (längere Dauer)

Nutze subagents wenn es geht immer

**Completed-Task Dokumentation**: Nach erfolgreichem Abschluss einer Aufgabe MUSS eine Datei in `.completed/<YYYY-MM-DD>_<slug>.md` erstellt werden. Format: YAML Frontmatter mit title, description, date, status, effort + Markdown Body. Siehe: `shared-docs/agents/completed-task-rule.md`
