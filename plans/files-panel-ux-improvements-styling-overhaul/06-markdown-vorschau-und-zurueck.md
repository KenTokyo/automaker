ULTRATHINK

# Phase 6: Markdown-Vorschau und Zurück

## Status

- Status: 📝 Geplant
- Abhängigkeit: Phase 5
- Umsetzung geplant in: Chat 5

## Ziel

Die Datei-Vorschau soll Markdown nicht nur als Rohtext zeigen.
Sie soll wie im Docs-Bereich auch gerendert dargestellt werden.
Zusätzlich soll der Zurück-Weg klar und jederzeit sichtbar sein.

### Was bedeutet das konkret für den Nutzer?

Lange Markdown-Dateien sind leichter lesbar und man findet schneller zurück zur Dateiliste.

## Bereich der Phase

Diese Phase betrifft Darstellung und Navigation in der Vorschau.
Keine neue Highlight- oder Dateilimit-Logik in dieser Phase.

## Geplante Komponenten und Aufgaben

### 1. `file-preview-render-mode.tsx` (neu, ca. 130 Zeilen)

- Kleiner Umschalter für zwei Ansichten:
  - `Gerendert`
  - `Roh`
- Beschriftung in einfacher Sprache.
- Zustand pro Session merken, damit der Nutzer nicht dauernd neu wählen muss.

### 2. `file-preview-markdown.tsx` (neu, ca. 170 Zeilen)

- Nutzt die vorhandene `Markdown`-Komponente aus dem UI-Bereich.
- Übernimmt die Grundoptik vom Docs-Viewer, damit es vertraut wirkt.
- Zeigt bei nicht-Markdown-Dateien automatisch den Rohtext.

### 3. `file-preview.tsx` (anpassen, ca. 240 Zeilen Änderung)

- Schaltet je nach Modus zwischen gerendert und Rohtext um.
- Zeigt einen deutlich sichtbaren `Zurück zur Liste`-Button im Kopfbereich.
- Behält den bestehenden Zurück-Weg im Footer als zusätzliche Hilfe bei.
- Räumt den Kopfbereich auf, damit Aktionen und Navigation klar getrennt sind.

### 4. `files-panel.tsx` (anpassen, ca. 90 Zeilen Änderung)

- Einheitlicher Handler für „Vorschau schließen“.
- Übergibt Vorschau-Modus und Zurück-Aktion sauber an `file-preview.tsx`.

### 5. `file-preview-utils.ts` (neu, ca. 80 Zeilen)

- Kleine Helfer, z. B. `isMarkdownFile(path)`.
- Verhindert doppelte Dateityp-Prüfungen in mehreren Komponenten.

## Nutzerbeispiele

### Beispiel 1

Du öffnest eine `README.md`.
Mit `Gerendert` siehst du Überschriften, Listen und Codeblöcke sauber formatiert.

### Beispiel 2

Du willst den Originaltext prüfen.
Du wechselst auf `Roh` und siehst den unveränderten Markdown-Inhalt.

### Beispiel 3

Du bist fertig mit Lesen.
Ein Klick auf `Zurück zur Liste` bringt dich sofort wieder in den Dateibaum.

## Edge Cases

1. Sehr große Markdown-Datei.
   - Lösung: Standardmäßig `Roh` als Fallback erlauben, damit die Ansicht flüssig bleibt.
2. Defekter oder ungewöhnlicher Markdown-Inhalt.
   - Lösung: Rendering fällt sicher auf Rohtext zurück statt leere Ansicht.
3. Bilder mit relativen Pfaden im Markdown.
   - Lösung: Wenn Bild nicht ladbar ist, bleibt Link/Text sichtbar.
4. Nutzer ist tief gescrollt in der Vorschau.
   - Lösung: Beim Dateiwechsel startet die Vorschau wieder oben.

## Performance und Stabilität

- Markdown-Rendern nur im aktiven Vorschau-Modus.
- Keine zusätzlichen Server-Anfragen.
- Einfache Utility-Funktionen statt Logik-Duplikate.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview-render-mode.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview-markdown.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/file-preview-utils.ts` (neu)

## Abnahme-Check

- [ ] Markdown-Dateien werden gerendert angezeigt.
- [ ] Umschalter `Gerendert/Roh` funktioniert stabil.
- [ ] `Zurück zur Liste` ist im Kopf klar sichtbar.
- [ ] Fallback auf Rohtext funktioniert bei Sonderfällen.
- [ ] `npm run type-check` ist ohne Fehler.
