ULTRATHINK

# Phase 5: Pfad in Chat + Bearbeiten/Löschen

## Status

- Status: 📝 Geplant
- Abhängigkeit: Phase 4
- Umsetzung geplant in: Chat 5

## Ziel

Wenn eine Datei geöffnet ist, soll ein großer Button sofort den Pfad in das Chat-Eingabefeld einfügen.
Außerdem sollen Nutzer Dateien direkt aus der Vorschau bearbeiten und löschen können.

### Was bedeutet das konkret für den Nutzer?

Weniger Klicks: Datei öffnen, Pfad ins Chatfeld setzen, bei Bedarf direkt ändern oder löschen.

## Bereich der Phase

Diese Phase betrifft die Vorschau-Aktionen und die Verbindung zum Chat-Eingabefeld.
Keine neue Highlight-Logik und keine neue Markdown-Render-Logik in dieser Phase.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-chat-bridge.ts` (neu, ca. 90 Zeilen)

- Kleine Brücke zwischen Files Panel und Chat-Eingabefeld.
- Einheitliches Event für „Text in Chat einfügen“.
- Bestehende Mechanik aus dem Docs-Bereich wird mitgenutzt, damit nichts doppelt gebaut wird.

### 2. `input-controls.tsx` (anpassen, ca. 130 Zeilen Änderung)

- Lauscht neben dem bisherigen Event auch auf das neue Event der Files-Brücke.
- Fügt den Pfad sauber mit Zeilenumbruch ein.
- Fokus springt zurück ins Eingabefeld, damit der Nutzer direkt weiterschreiben kann.

### 3. `file-preview-actions.tsx` (neu, ca. 200 Zeilen)

- Großer Primär-Button: `Pfad in Chat einfügen`.
- Sekundäre Aktionen:
  - `Pfad kopieren`
  - `Datei bearbeiten`
  - `Datei löschen`
- Deaktivierte Zustände bekommen klare Hilfetexte.

### 4. `file-preview.tsx` (anpassen, ca. 220 Zeilen Änderung)

- Action-Bereich einbauen.
- Einfacher Bearbeiten-Modus mit `Speichern` und `Abbrechen`.
- Lösch-Dialog mit klarer Warnung.
- Nach Löschen wird sauber zurück zur Liste gewechselt.

### 5. `files-panel.tsx` (anpassen, ca. 170 Zeilen Änderung)

- Neue Handler für:
  - Pfad in Chat einfügen
  - Datei speichern (`writeFile`)
  - Datei löschen (`deleteFile`)
- Nach Speichern/Löschen wird die Dateiliste neu geladen.
- Nutzer bekommt klare Rückmeldungen bei Erfolg und Fehler.

## Nutzerbeispiele

### Beispiel 1

Du öffnest `README.md`.
Ein Klick auf `Pfad in Chat einfügen` setzt den Pfad direkt unten in dein Chatfeld.

### Beispiel 2

Du findest einen Tippfehler in einer Datei.
Du klickst `Datei bearbeiten`, speicherst, und siehst danach sofort die aktualisierte Version.

### Beispiel 3

Eine Datei ist veraltet.
Du klickst `Datei löschen`, bestätigst, und bist sofort wieder in der Liste.

## Edge Cases

1. Datei wurde extern schon gelöscht.
   - Lösung: Klare Fehlermeldung und automatische Rückkehr zur Liste.
2. Kein Schreibrecht im Ordner.
   - Lösung: Speichern zeigt verständlichen Fehler, Inhalt bleibt im Editor erhalten.
3. Pfad-Einfügen bei leerem und bei vollem Chatfeld.
   - Lösung: Immer sauber mit passendem Zeilenumbruch einfügen.
4. Mehrfachklick auf Löschen.
   - Lösung: Während Aktion läuft, Button kurz sperren.

## Performance und Stabilität

- Nur gezielte Datei-Calls (`readFile`, `writeFile`, `deleteFile`).
- Kein komplettes UI-Neuladen, nur relevante Bereiche aktualisieren.
- Aktionstasten nutzen Ladezustand, damit es keine Doppelaufrufe gibt.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview-actions.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-chat-bridge.ts` (neu)
- `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx`

## Abnahme-Check

- [ ] Großer `Pfad in Chat einfügen`-Button ist sichtbar und funktioniert.
- [ ] Pfad landet direkt im Chat-Eingabefeld.
- [ ] Datei kann bearbeitet und gespeichert werden.
- [ ] Datei kann gelöscht werden inklusive Bestätigung.
- [ ] Nach Aktionen ist die Liste konsistent.
- [ ] `npm run type-check` ist ohne Fehler.
