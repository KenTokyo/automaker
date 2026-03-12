ULTRATHINK

# Files Panel Markdown Explorer - Globale Taskliste

## Status

- Status dieser Planung: ✅ Abgeschlossen
- Erstellt am: 2026-03-11
- Aktueller Fokus: Implementierung Phase 1 (naechster Chat)

## Kurz gesagt

Das Files Panel (`apps/ui`) im rechten Bereich zeigt aktuell **alle Dateien** eines Projekts an - ohne Zeitstempel, ohne farbliche Markierungen, ohne Sortieroptionen. Das ist unuebersichtlich und wenig hilfreich.

Das Ziel: Das Files Panel soll sich verhalten wie der **Markdown Explorer** aus der UniAI Chat VSCode Extension (`uniai-chat-vscode-extension`). Dort werden:

1. **Nur Markdown-Dateien** (.md) angezeigt
2. **Erstellungs- und Aenderungsdatum** pro Datei sichtbar
3. **Kuerzlich geaenderte Dateien farblich hervorgehoben** (rot = gerade eben, orange = 30min, gelb = 1h, etc.)
4. **Ordner erben die Recency** ihres neuesten Kindes
5. **Sortierung** nach Last Modified, Last Created oder Name A-Z
6. **Zeitfilter** funktioniert tatsaechlich (nur Dateien der letzten X Stunden/Tage)
7. **Ordner-Meta** zeigt Dateianzahl + neuestes Datum

## Klare Architektur-Entscheidung

Der aktuelle Ansatz (lazy-loading per `readdir`) wird **ersetzt** durch einen Batch-Ansatz:

1. **Backend liefert alle .md Dateien** eines Projekts in einem Aufruf (mit Timestamps)
2. **Client baut den Baum selbst** aus der flachen Dateiliste
3. **Client filtert, sortiert und faerbt** alles lokal

### Warum Batch statt Lazy-Loading?

| Aspekt | Lazy-Loading (aktuell) | Batch (neu) |
| --- | --- | --- |
| Sortierung ueber ganzen Baum | Nicht moeglich | Ja |
| Recency auf Ordnern | Nicht moeglich | Ja |
| Zeitfilter | Muesste pro Ordner filtern | Ein Filter auf alle Dateien |
| Dateianzahl | Nur pro sichtbarem Ordner | Gesamt korrekt |
| Performance bei .md only | Uebermaessig (laedt alle Dateien) | Effizient (nur .md Dateien) |

## Wiederverwendung vor Neubau

### Backend (bleibt/wird erweitert)

- `apps/server/src/services/markdown-explorer-service.ts` - hat bereits `getFilesFilteredByTime()` und `searchProject()`
- `apps/server/src/routes/markdown-explorer/` - Route-Handler vorhanden
- Endpoint `GET /api/markdown-explorer/files-by-time` wird erweitert (sinceHours=0 = alle Dateien)

### Frontend (wird umgebaut)

- `apps/ui/src/store/explorer-store.ts` - Store bleibt, wird um Timestamps und Recency erweitert
- `apps/ui/src/components/views/agent-view/components/files-panel/` - Alle Komponenten werden angepasst
- `apps/ui/src/lib/http-api-client.ts` - `explorerFilesByTime()` bereits vorhanden

### Referenz-Implementierung (VSCode Extension)

- `uniai-chat-vscode-extension/src/ui/modals/markdown-explorer/markdown-explorer-tree.ts` - Recency-Klassen, Tree-Building, Date-Formatting
- `uniai-chat-vscode-extension/src/ui/modals/markdown-explorer/markdown-explorer-core-state.ts` - Filter-Pipeline, Sortierung
- `uniai-chat-vscode-extension/src/ui/styles/components/markdown-explorer-favorites.ts` - Recency-Farben (CSS)

## Phasenuebersicht

| Phase | Datei | Titel | Ziel | Status |
| --- | --- | --- | --- | --- |
| 1 | `01-markdown-only-tree.md` | Markdown-Only Tree mit Timestamps | Backend erweitern, Store umbauen, Tree client-seitig bauen, nur .md Dateien | ✅ Fertig |
| 2 | `02-recency-highlighting.md` | Recency-Highlighting & Date-Display | Farbliche Zeitmarkierungen, Datums-Anzeige pro Datei, Smart-Date-Formatting | ✅ Fertig |
| 3 | `03-sorting-filtering-toolbar.md` | Sortierung, Filter & Toolbar | Sort-Dropdown, funktionaler Zeitfilter, Collapse/Refresh, Ordner-Meta, File Count | ✅ Fertig |

## Aufteilung nach Chats

### Chat 1 (Planung) ✅ ABGESCHLOSSEN

| Phase | Datei | Schwerpunkt | Status |
| --- | --- | --- | --- |
| 0 | `00-global-tasklist.md` | Globale Taskliste | ✅ Erstellt |
| 1 | `01-markdown-only-tree.md` | Backend + Store + Tree-Umbau | ✅ Planung fertig |
| 2 | `02-recency-highlighting.md` | Recency + Dates | ✅ Planung fertig |
| 3 | `03-sorting-filtering-toolbar.md` | Sort, Filter, Toolbar | ✅ Planung fertig |

### Chat 2 (Implementierung Phase 1)

| Phase | Datei | Schwerpunkt | Geschaetzte Tokens |
| --- | --- | --- | --- |
| 1 | `01-markdown-only-tree.md` | Backend-Erweiterung, Store-Umbau, Tree client-seitig aufbauen, Markdown-only Filter | ~100.000-120.000 |

### Chat 3 (Implementierung Phase 2)

| Phase | Datei | Schwerpunkt | Geschaetzte Tokens |
| --- | --- | --- | --- |
| 2 | `02-recency-highlighting.md` | Recency-Klassen, Farbsystem, Date-Display, Smart-Formatting | ~80.000-100.000 |

### Chat 4 (Implementierung Phase 3)

| Phase | Datei | Schwerpunkt | Geschaetzte Tokens |
| --- | --- | --- | --- |
| 3 | `03-sorting-filtering-toolbar.md` | Sort-Dropdown, Zeitfilter, Toolbar-Buttons, Ordner-Meta, File Count | ~80.000-100.000 |

## Reihenfolge und Abhaengigkeiten

```text
Phase 1 -> Phase 2 -> Phase 3
```

Warum diese Reihenfolge:

1. **Phase 1** baut die Datenbasis: Ohne Timestamps und .md-only Tree kann nichts gefaerbt oder sortiert werden
2. **Phase 2** baut das visuelle System: Recency-Farben und Datums-Anzeige setzen auf den Timestamps aus Phase 1 auf
3. **Phase 3** baut die Interaktion: Sortierung und Filter brauchen sowohl die Daten (Phase 1) als auch die visuelle Darstellung (Phase 2)

## Was das konkret fuer den Nutzer bedeutet

Nach Abschluss aller Phasen:

- Der Nutzer sieht **nur relevante Markdown-Dateien** statt eines ueberladenen Dateibaums
- **Kuerzlich geaenderte Dateien fallen sofort auf** durch farbliche Hervorhebung (rot/orange/gelb)
- **Ordner zeigen auf einen Blick**, wie viele Dateien sie enthalten und wann die letzte Aenderung war
- **Sortierung** erlaubt schnellen Zugriff auf die neuesten oder aeltesten Dateien
- **Zeitfilter** reduziert die Anzeige auf den relevanten Zeitraum (z.B. "nur letzte 2 Tage")

## Wichtige Regeln fuer alle Phasen

1. Kein Build starten - nur TypeScript-Fehler pruefen (`npx tsc --noEmit`)
2. Keine neuen Features in `apps/chat` - alles geht nach `apps/ui`
3. Referenz-Implementierung aus VSCode Extension uebernehmen, nicht neu erfinden
4. Zustand-Store-Regeln beachten (keine neuen Objekt-Referenzen in Selektoren)
5. Max 700 Zeilen pro Datei
6. Jede Phase sagt, was sie fuer den Nutzer verbessert

## Referenzdateien fuer jeden Folge-Chat

- `plans/files-panel-markdown-explorer/00-global-tasklist.md` (diese Datei)
- Die jeweils betroffenen Phasen-Dateien
- `CLAUDE.md`
- `apps/ui/src/store/explorer-store.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/`
- `apps/server/src/services/markdown-explorer-service.ts`
- `apps/server/src/routes/markdown-explorer/`

## Aktueller Stand

- ✅ Alle Planungsdokumente erstellt (Chat 1 abgeschlossen)
- ✅ Implementierung Phase 1 abgeschlossen (Chat 2)
- ✅ Implementierung Phase 2 abgeschlossen (Chat 3)
- ✅ Implementierung Phase 3 abgeschlossen (Chat 4)
