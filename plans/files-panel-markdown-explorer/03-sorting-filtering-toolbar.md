ULTRATHINK

# Phase 3: Sortierung, Filter & Toolbar-Redesign

## Status: ✅ Fertig

## Abhaengigkeit: Phase 1 + Phase 2 muessen abgeschlossen sein

## 🎯 Ziel

Das Files Panel bekommt eine **vollstaendig funktionale Toolbar** mit Sortierung (Last Modified / Last Created / Name A-Z), einem **tatsaechlich funktionierenden Zeitfilter**, Ordner-Meta (Dateianzahl + neuestes Datum), Collapse/Refresh-Buttons und einem Highlight-Window-Dropdown. Der Footer zeigt die korrekte Dateianzahl an.

### Was bedeutet das konkret fuer den Nutzer?

Der Nutzer kann jetzt aktiv steuern, was er sieht: "Zeig mir nur die Dateien der letzten 2 Tage, sortiert nach Aenderungsdatum" - und das funktioniert tatsaechlich. Ordner zeigen auf einen Blick "17 Dateien, letzte Aenderung 21:58". Ein Klick auf "Collapse" klappt alle Ordner zu. "Refresh" holt frische Daten vom Server.

---

## 🚀 Strategie

### Toolbar-Layout (orientiert an VSCode Extension)

```
┌──────────────────────────────────────────┐
│ 🌲 Baum    ⭐ Favoriten    🔍 Suche     │  ← Tab-Bar (besteht schon)
├──────────────────────────────────────────┤
│ [Last Modified ▾]  [2 Tage ▾]  [6h ▾]   │  ← Sort | Zeitfilter | Highlight-Window
├──────────────────────────────────────────┤
│ [Collapse]  [Refresh]                    │  ← Aktions-Buttons
├──────────────────────────────────────────┤
│ Zeige 42 von 419 Dateien                │  ← File Count (nur wenn gefiltert)
├──────────────────────────────────────────┤
│ ▼ 📁 History       17 · ✏️ 21:58       │  ← Ordner mit Meta
│   📄 chat-history          14:35 ✏️14:35│  ← Datei mit Dates
│   ...                                    │
├──────────────────────────────────────────┤
│ 42 Eintraege                             │  ← Footer
└──────────────────────────────────────────┘
```

### Filter-Pipeline (aus VSCode Extension uebernommen)

Reihenfolge der Filterung:
1. **Zeitfilter** (nur Dateien innerhalb des gewaehlten Zeitraums)
2. **Such-Filter** (wenn Suche aktiv)
3. **Sortierung** (nach gewahltem Kriterium)
4. **Tree-Building** (aus gefilterter + sortierter Liste)

Wichtig: Die Filterung passiert **komplett client-seitig** auf der `allFiles` Liste aus Phase 1. Kein Server-Call noetig beim Wechsel des Filters.

---

## ❓ Proaktive F&A

**Was passiert, wenn der Zeitfilter so eng ist, dass keine Dateien uebrig bleiben?**
✅ Leerer Zustand wird angezeigt: "Keine Dateien im gewaehlten Zeitraum." Der Footer zeigt "0 von 419 Dateien".

**Wie funktioniert die Sortierung bei Ordnern?**
✅ Ordner werden nach ihrem neuesten Kind sortiert (bei "Last Modified" / "Last Created"). Bei "Name A-Z" alphabetisch. Ordner kommen immer vor Dateien auf gleicher Ebene.

**Was passiert beim Wechsel des Zeitfilters - wird der Server erneut aufgerufen?**
✅ Nein. Phase 1 hat alle .md Dateien mit Timestamps im Store. Zeitfilter und Sortierung passieren rein client-seitig. Nur "Refresh" ruft den Server erneut auf.

**Was passiert mit dem aktuellen Zeitfilter-Dropdown?**
✅ Der bestehende `<select>` in `files-panel.tsx` wird beibehalten und verbessert. Die Werte aendern sich leicht: Statt Stunden (12, 24, 48...) werden Tage verwendet wie in der VSCode Extension (0.5, 1, 2, 4, 7, 14, 30 Tage). Die Anzeige-Labels bleiben benutzerfreundlich ("12h", "1 Tag", "2 Tage" etc.).

**Was ist der Unterschied zwischen Zeitfilter und Highlight-Window?**
✅ **Zeitfilter** blendet Dateien komplett aus (nicht sichtbar). **Highlight-Window** faerbt sichtbare Dateien ein (rot/orange/gelb). Beides unabhaengig konfigurierbar.

---

## ⚡ Regeleinhaltung & Performance

- **Client-seitige Filterung:** Kein Netzwerk-Call beim Filter-Wechsel → sofortige Reaktion
- **Memoization:** `useMemo` fuer die Filter-Pipeline (abhaengig von allFiles, timeFilter, sortBy, searchQuery)
- **Sortierung:** In-place auf bereits geladener Liste → O(n log n) im Worst Case
- **Collapse All:** Setzt `expandedPaths` auf leeres Set → sofortiger Re-render
- **Refresh:** Einziger Punkt, der den Server erneut aufruft

---

## 🔄 Code-Wiederverwendung

### Aus VSCode Extension uebernommen

- `filterMdExplorerFiles()` → Client-seitige Filter-Pipeline (Zeit + Suche + Limit)
- `sortMdExplorerFilesForDisplay()` → Sort-Logik (modified/created/name)
- `sortTreeChildren()` → Sortierung innerhalb des Baums (Ordner + Dateien getrennt)
- `countFilesInFolder()` → Dateianzahl pro Ordner
- `getNewestModified()` → Neuestes Modified-Datum pro Ordner

### Bestehend

- Tab-Bar bleibt (Baum/Favoriten/Suche)
- Zeitfilter-Dropdown bleibt (Werte werden angepasst)
- Footer bleibt (wird erweitert)

---

## 🧩 Komponenten & Implementierung

### 3.1 Store: `explorer-store.ts` erweitern **~80 Zeilen Aenderung**

- Neue State-Felder:
  - `sortBy`: `'modified' | 'created' | 'name'` (Standard: 'modified')
- Neue Actions:
  - `setSortBy(sortBy)`: Aendert Sortierung, baut Tree neu
  - `refreshFiles()`: Marker-Flag, damit FilesPanel den Server erneut aufruft
- Aenderung `setTimeFilter()`: Nach Filter-Aenderung Tree neu bauen
- Neuer **computed Helper** `getFilteredAndSortedFiles()`:
  - Nimmt `allFiles`, wendet `timeFilter` an (nur Dateien innerhalb Zeitfenster)
  - Sortiert nach `sortBy`
  - Gibt gefilterte + sortierte flache Liste zurueck
- `buildTreeFromFiles()` anpassen: Nutzt `getFilteredAndSortedFiles()` statt `allFiles` direkt
- **Ordner-Sortierung in `buildTreeData()`:**
  - Ordner nach gleichen Kriterien wie Dateien sortieren
  - Ordner bekommen `fileCount` Feld (Gesamtanzahl .md Kinder rekursiv)

### 3.2 Utility: `tree-utils.ts` erstellen (NEUE DATEI) **~100 Zeilen**

Pfad: `apps/ui/src/components/views/agent-view/components/files-panel/tree-utils.ts`

- `filterFilesByTime(files, timeFilterDays)`: Filtert flache Dateiliste nach Zeitraum
  - timeFilterDays=0 → kein Filter (alle Dateien)
  - timeFilterDays=2 → nur Dateien mit modified >= now - 2 * 86400000
- `sortFiles(files, sortBy)`: Sortiert flache Dateiliste
  - 'modified': absteigend nach modified Timestamp
  - 'created': absteigend nach created Timestamp
  - 'name': alphabetisch aufsteigend
- `sortTreeChildren(node, sortBy)`: Rekursive Sortierung der Baum-Kinder
  - Ordner + Dateien getrennt sortiert
  - Ordner immer vor Dateien
- `countFilesInFolder(node)`: Rekursive Dateianzahl
- `getNewestModified(node)`: Rekursives neuestes Modified-Datum
- `buildFilteredTree(allFiles, projectPath, timeFilter, sortBy)`: Komplette Pipeline
  - Filter → Sort → buildTreeData → sortTreeChildren → return rootNodes + fileCount

### 3.3 FilesPanel: `files-panel.tsx` Toolbar erweitern **~100 Zeilen Aenderung**

- **Sort-Dropdown** (NEU): `<select>` mit "Zuletzt geaendert", "Zuletzt erstellt", "Name A-Z"
  - Aendert `sortBy` im Store
  - Sofortige Aktualisierung des Trees (kein Server-Call)
- **Zeitfilter-Dropdown** (ANPASSEN): Werte als Tage statt Stunden
  - Optionen: Alle, 12h, 1 Tag, 2 Tage, 4 Tage, 1 Woche, 14 Tage, 30 Tage
  - Label "Letzte {X}" rechts daneben
- **Highlight-Window-Dropdown** (NEU): `<select>` mit "Kein Highlight", "1h", "2h", "6h", "12h", "24h"
  - Aendert `highlightWindow` im Store (aus Phase 2)
  - Sofortige Aktualisierung der Recency-Farben
- **Aktions-Buttons** (NEU): Unter den Dropdowns
  - "Collapse": Setzt alle expandedPaths zurueck
  - "Refresh": Ruft Server erneut auf
- **File Count** (NEU): Zwischen Toolbar und Tree
  - "419 Dateien" wenn kein Filter aktiv
  - "Zeige 42 von 419 Dateien" wenn Filter aktiv
  - Nur sichtbar wenn > 0 Dateien

### 3.4 FileTreeItem: Ordner-Meta hinzufuegen **~40 Zeilen Aenderung**

- **Ordner-Zeile erweitern:** Rechts neben dem Ordnernamen:
  - Dateianzahl (z.B. "17")
  - Trennzeichen (·)
  - Stift-Icon + neuestes Modified-Datum (z.B. "✏️ 21:58")
- **Ordner-Meta-Styling:** Klein, grau, `text-[10px]`, rechtsbuendig
- Referenz: VSCode Extension zeigt `17 · ✏️ 21:58` als Badge

### 3.5 TIME_FILTER_OPTIONS anpassen **~10 Zeilen Aenderung**

In `explorer-store.ts`:
- Werte von Stunden auf Tage umstellen (Alignment mit VSCode Extension)
- Oder: Beibehalten als Stunden, aber Labels anpassen
- Empfehlung: Intern als Stunden beibehalten (0, 12, 24, 48, 96, 168, 336, 720), Labels bleiben

---

## 📋 Chat-Implementierungs-Reihenfolge

### Chat 4 - Phase 3 Implementierung (~80.000-100.000 Tokens)

**Schritt 1:** Utility erstellen (3.2)
- `tree-utils.ts` mit Filter, Sort, CountFiles, NewestModified
- TypeScript-Check

**Schritt 2:** Store erweitern (3.1)
- `sortBy` Feld und Action
- `getFilteredAndSortedFiles()` Helper
- `buildTreeFromFiles()` an Pipeline anbinden
- TypeScript-Check

**Schritt 3:** FilesPanel Toolbar (3.3)
- Sort-Dropdown einbauen
- Zeitfilter-Dropdown anpassen
- Highlight-Window-Dropdown hinzufuegen
- Collapse/Refresh Buttons
- File Count Anzeige
- TypeScript-Check

**Schritt 4:** Ordner-Meta (3.4)
- FileTreeItem: Dateianzahl + neuestes Datum pro Ordner
- TypeScript-Check

**Schritt 5:** TIME_FILTER_OPTIONS (3.5)
- Labels und Werte finalisieren
- TypeScript-Check

**Abschluss:** Gesamt-TypeScript-Check ueber alle Packages

---

## 🔗 Betroffene Dateien

| Datei | Aenderungstyp | Geschaetzte Zeilen |
| --- | --- | --- |
| `apps/ui/src/.../files-panel/tree-utils.ts` | **NEU** | ~100 |
| `apps/ui/src/store/explorer-store.ts` | Erweitern | ~80 |
| `apps/ui/src/.../files-panel/files-panel.tsx` | Erweitern | ~100 |
| `apps/ui/src/.../files-panel/file-tree-item.tsx` | Erweitern | ~40 |
| **Gesamt** | | **~320** |

---

## 🧪 Validierung nach Abschluss

- [ ] `cd apps/ui && npx tsc --noEmit` → 0 Fehler
- [ ] `cd apps/server && npx tsc --noEmit` → 0 Fehler
- [ ] Sort-Dropdown wechselt zwischen Modified/Created/Name
- [ ] Wechsel der Sortierung aktualisiert Tree sofort (kein Server-Call)
- [ ] Zeitfilter "2 Tage" zeigt nur Dateien der letzten 48h
- [ ] Zeitfilter "Alle" zeigt alle Dateien
- [ ] File Count zeigt "42 von 419 Dateien" bei aktivem Filter
- [ ] Collapse-Button klappt alle Ordner zu
- [ ] Refresh-Button laedt Daten vom Server neu
- [ ] Ordner zeigen "17 · ✏️ 21:58" als Meta
- [ ] Highlight-Window-Dropdown aendert Recency-Farben sofort
- [ ] Leere Ordner (nach Zeitfilter) werden ausgeblendet
