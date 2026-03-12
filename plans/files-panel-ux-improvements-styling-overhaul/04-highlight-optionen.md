ULTRATHINK

# Phase 4: Highlight-Optionen

## Status

- Status: 📝 Geplant
- Abhängigkeit: Phase 3
- Umsetzung geplant in: Chat 4

## Ziel

Das Highlight-System soll nicht nur an oder aus sein.
Der Nutzer soll die Stärke und die Farbwirkung einfach selbst einstellen können.
Die Optionen sollen über einen klaren Button erreichbar sein.

### Was bedeutet das konkret für den Nutzer?

Jeder kann die Hervorhebung so einstellen, dass sie gut lesbar ist und nicht zu stark ablenkt.

## Bereich der Phase

Diese Phase betrifft nur die Hervorhebungs-Logik und die dazugehörige Bedienung.
Keine Datei-Aktionen und keine Markdown-Vorschau in dieser Phase.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-highlight-optionen.tsx` (neu, ca. 190 Zeilen)

- Neuer Optionen-Button in der Toolbar: „Highlight-Optionen“.
- Öffnet ein kleines Einstellungsfenster (Popover = kleines Aufklapp-Fenster am Button).
- Enthält einfache Einstellungen:
  - Stärke: `Sanft`, `Normal`, `Stark`
  - Farbwelt: `Neutral`, `Warm`, `Kühl`
  - Schnell-Reset auf Standard
- Zeigt eine Mini-Vorschau, damit der Nutzer sofort sieht, was sich ändert.

### 2. `explorer-store.ts` (anpassen, ca. 140 Zeilen Änderung)

- Neuer Zustand `highlightSettings` mit klaren Feldern:
  - `intensity`
  - `palette`
- Neue Aktion `setHighlightSettings(...)`.
- Einstellungen werden in `localStorage` gespeichert.
- Defekte alte Werte werden automatisch auf Standard zurückgesetzt.

### 3. `recency-utils.ts` (anpassen, ca. 170 Zeilen Änderung)

- Bisher feste Highlight-Farben in eine konfigurierbare Berechnung umbauen.
- Farb- und Stärkewerte kommen aus `highlightSettings` statt aus starren Tabellen.
- Wenn Highlight aus ist oder Zeitfenster `0` ist: neutrale Anzeige ohne Spezialfarben.

### 4. `file-tree-item.tsx` (anpassen, ca. 90 Zeilen Änderung)

- Übergibt die neuen Highlight-Einstellungen in die Stil-Berechnung.
- Nutzt weiterhin die bestehende Recency-Klasse, aber mit neuen Varianten.

### 5. `files-panel.tsx` (anpassen, ca. 100 Zeilen Änderung)

- Bindet den neuen Optionen-Button in die Toolbar ein.
- Deaktiviert den Button sinnvoll, wenn kein Highlight-Fenster aktiv ist.
- Zeigt bei Bedarf einen kurzen Hinweistext in einfacher Sprache.

## Nutzerbeispiele

### Beispiel 1

Du findest die Farben zu stark.
Du stellst auf `Sanft` und die Liste wirkt sofort ruhiger.

### Beispiel 2

Du willst neue Dateien stärker sehen.
Du stellst auf `Stark` + `Warm` und erkennst neue Änderungen schneller.

## Edge Cases

1. Highlight-Zeitfenster steht auf `0` (aus).
   - Lösung: Optionen bleiben sichtbar, aber mit Hinweis „Highlight ist gerade aus“.
2. Sehr schmale Panel-Breite.
   - Lösung: Popover schiebt sich automatisch nach innen und bleibt vollständig sichtbar.
3. Alte kaputte Speicherwerte im Browser.
   - Lösung: Store nutzt sichere Standardwerte statt Fehlerzustand.
4. Heller und dunkler Hintergrund.
   - Lösung: Kontraste prüfen, damit Text immer gut lesbar bleibt.

## Performance und Stabilität

- Keine zusätzlichen Server-Aufrufe.
- Stilberechnung bleibt lokal im Client.
- Einstellungen werden klein gehalten, damit Re-Renders leicht bleiben.

## Betroffene Dateien

- `apps/ui/src/store/explorer-store.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-tree-item.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/recency-utils.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-highlight-optionen.tsx` (neu)

## Abnahme-Check

- [ ] Optionen-Button ist sichtbar und klar benannt.
- [ ] Stärke und Farbwelt lassen sich direkt umstellen.
- [ ] Einstellungen bleiben nach Neuladen erhalten.
- [ ] Hervorhebung ist in allen Modi gut lesbar.
- [ ] `npm run type-check` ist ohne Fehler.
