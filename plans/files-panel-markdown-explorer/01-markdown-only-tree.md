ULTRATHINK

# Phase 1: Markdown-Only Tree mit Timestamps

## Status: ✅ Abgeschlossen

## 🎯 Ziel

Das Files Panel soll **ausschliesslich Markdown-Dateien** (.md, .mdx, .markdown) anzeigen - statt aller Dateien. Jeder Dateieintrag enthaelt **Erstellungs- und Aenderungsdatum** als Timestamp. Der Baum wird **client-seitig** aus einer flachen Dateiliste aufgebaut, statt per lazy-loading Ordner fuer Ordner zu laden.

### Was bedeutet das konkret fuer den Nutzer?

Statt eines ueberladenen Dateibaums mit Docker-Dateien, YAML-Configs und Shell-Scripts sieht der Nutzer **nur Markdown-Dateien** - die einzigen Dateien, die im Kontext von Planung und Dokumentation relevant sind. Zusaetzlich sieht er bei jeder Datei, wann sie erstellt und zuletzt geaendert wurde.

---

## 🚀 Strategie

### Architektur-Entscheidung: Batch statt Lazy-Loading

**Aktuell:** `readdir` wird pro Ordner aufgerufen → zeigt alle Dateien → kein Timestamp → kein Gesamtueberblick

**Neu:** Ein einziger API-Call holt **alle .md Dateien** mit Timestamps → Client baut Baum daraus → Filterung/Sortierung client-seitig

### Warum ist das besser?

1. Markdown-Dateien sind typischerweise 50-500 in einem Projekt (vs. 10.000+ Gesamt-Dateien)
2. Ein Call statt dutzender `readdir`-Calls ist schneller
3. Client hat sofort alle Daten fuer Sortierung, Filterung und Recency

---

## ❓ Proaktive F&A

**Was passiert bei sehr grossen Projekten (10.000+ .md Dateien)?**
✅ Der Server hat bereits ein `limit`-Parameter (max 1000). Fuer die meisten Projekte reicht das. Falls noetig kann in Phase 3 ein Limit-Dropdown hinzugefuegt werden.

**Was passiert, wenn das Backend den neuen Endpunkt noch nicht hat?**
✅ Wir erweitern den bestehenden `files-by-time` Endpoint, sodass `sinceHours=0` als "alle Dateien" interpretiert wird. Kein neuer Endpoint noetig.

**Was passiert mit dem bestehenden lazy-loading Code?**
✅ Der `readdir`-basierte Code wird komplett ersetzt. Die `loadDirectory`-Funktion in `files-panel.tsx` entfaellt. Stattdessen gibt es einen einmaligen `loadAllMarkdownFiles()`-Call.

**Was passiert mit Favoriten?**
✅ Favoriten bleiben erhalten. Die Pfade aendern sich nicht, nur die Datenquelle.

---

## ⚡ Regeleinhaltung & Performance

- **Wiederverwendung:** `markdown-explorer-service.ts` hat bereits die Logik zum Scannen von .md Dateien mit Timestamps
- **Performance:** Ein Batch-Call statt N lazy-loading Calls reduziert Netzwerk-Round-Trips drastisch
- **Zustand-Store:** Selektoren geben keine neuen Referenzen bei jedem Render zurueck (useShallow bleibt)
- **Max 700 Zeilen pro Datei:** FileTreeNode-Typ wird erweitert, nicht neu erstellt

---

## 🔄 Code-Wiederverwendung

### Bestehende Funktionen die genutzt werden

- `getFilesFilteredByTime()` in `markdown-explorer-service.ts` - wird erweitert fuer sinceHours=0
- `explorerFilesByTime()` in `http-api-client.ts` - wird fuer den initialen Load genutzt
- `useExplorerStore` - Store wird erweitert, nicht ersetzt
- `buildTreeData()` Logik aus der VSCode Extension wird als React-Pendant uebernommen

### Bestehende Funktionen die entfallen

- `loadDirectory()` in `files-panel.tsx` - wird durch `loadAllMarkdownFiles()` ersetzt
- `shouldIgnore()` in `files-panel.tsx` - nicht mehr noetig, Server filtert bereits
- `sortNodes()` in `files-panel.tsx` - wird durch neue Sort-Logik ersetzt (Phase 3)
- `joinPath()` in `files-panel.tsx` - nicht mehr noetig, Server liefert volle Pfade

---

## 🧩 Komponenten & Implementierung

### 1.1 Backend: `markdown-explorer-service.ts` erweitern **~30 Zeilen Aenderung**

- `getFilesFilteredByTime()` anpassen: Wenn `sinceHours` nicht uebergeben oder 0, alle .md Dateien zurueckgeben (ohne Zeitfilter)
- Rueckgabe erweitern: neben `modified` und `size` auch `created` Timestamp liefern
- `created` kommt aus `fs.stat().birthtime`

### 1.2 Backend: `files-by-time.ts` Route anpassen **~15 Zeilen Aenderung**

- `sinceHours` Query-Parameter optional machen (aktuell Pflicht)
- Wenn `sinceHours` nicht angegeben oder 0: alle .md Dateien zurueckgeben
- Neuer optionaler Rueckgabe-Wert `created` pro Datei

### 1.3 Store: `explorer-store.ts` umbauen **~120 Zeilen Aenderung**

- `FileTreeNode` Typ erweitern um `modified?: number`, `created?: number`, `size?: number`
- Neue State-Felder:
  - `allFiles`: Flache Liste aller .md Dateien vom Server (Rohdaten)
  - `sortBy`: 'modified' | 'created' | 'name' (fuer Phase 3 vorbereitet)
  - `highlightWindow`: number (Stunden, fuer Phase 2 vorbereitet)
- Neue Actions:
  - `setAllFiles(files)`: Speichert die flache Dateiliste und baut den Baum daraus
  - `buildTreeFromFiles()`: Baut `rootNodes` aus `allFiles` (client-seitig)
- Entfernte Actions:
  - `setChildren()`, `setChildrenLoading()` - nicht mehr noetig bei Batch-Ansatz
- Helper-Funktion `buildTreeData(files, projectPath)`:
  - Nimmt flache Dateiliste
  - Baut hierarchischen Baum (Ordner werden implizit aus Pfaden erstellt)
  - Ordner bekommen `modified` = neuestes Kind, `created` = neuestes Kind
  - Referenz: `buildTreeData()` aus VSCode Extension

### 1.4 FilesPanel: `files-panel.tsx` umbauen **~80 Zeilen Aenderung**

- `loadDirectory()` entfernen
- `shouldIgnore()`, `sortNodes()`, `joinPath()` entfernen
- Neuer `useEffect` bei projectPath-Wechsel: `loadAllMarkdownFiles(projectPath)`
- `loadAllMarkdownFiles()`: Ruft `api.explorerFilesByTime(projectPath, 0)` auf, speichert Ergebnis im Store
- `handleToggleFolder()` vereinfachen: Nur noch expand/collapse Toggle, kein Nachladen

### 1.5 FileTree: `file-tree.tsx` anpassen **~20 Zeilen Aenderung**

- `TreeNodeList` bleibt weitgehend gleich
- Kein `isLoading` Zustand mehr pro Ordner (alles ist bereits geladen)

### 1.6 FileTreeItem: `file-tree-item.tsx` anpassen **~40 Zeilen Aenderung**

- `node.modified` und `node.created` werden fuer spaetere Phasen durchgereicht (noch nicht angezeigt)
- Markdown-Erkennung (`isMarkdown()`) entfaellt - alle Dateien sind bereits Markdown
- Datei-Icon wird einheitlich `FileText` (statt File vs FileText Unterscheidung)
- Ordner-Icon bleibt Folder/FolderOpen

### 1.7 http-api-client.ts anpassen **~10 Zeilen Aenderung**

- `explorerFilesByTime()` Rueckgabe-Typ erweitern um `created: number` pro Datei
- sinceHours=0 erlauben (aktuell wird 0 nicht gesendet)

---

## 📋 Chat-Implementierungs-Reihenfolge

### Chat 2 - Phase 1 Implementierung (~100.000-120.000 Tokens)

**Schritt 1:** Backend erweitern (1.1 + 1.2)

- `markdown-explorer-service.ts`: `created` Feld hinzufuegen, sinceHours=0 behandeln
- `files-by-time.ts`: sinceHours optional machen
- TypeScript-Check

**Schritt 2:** API-Client anpassen (1.7)

- `http-api-client.ts`: Rueckgabe-Typ erweitern
- TypeScript-Check

**Schritt 3:** Store umbauen (1.3)

- `explorer-store.ts`: Neue Felder, `buildTreeData()`, Actions anpassen
- Alte Actions (`setChildren`, `setChildrenLoading`) entfernen
- TypeScript-Check

**Schritt 4:** FilesPanel umbauen (1.4)

- `files-panel.tsx`: Batch-Loading statt lazy-loading
- Alte Hilfsfunktionen entfernen
- TypeScript-Check

**Schritt 5:** FileTree + FileTreeItem anpassen (1.5 + 1.6)

- `file-tree.tsx`: Loading-States vereinfachen
- `file-tree-item.tsx`: Icon-Logik vereinfachen, Timestamps vorbereiten
- TypeScript-Check

**Abschluss:** Gesamt-TypeScript-Check ueber alle betroffenen Packages

---

## 🔗 Betroffene Dateien

| Datei                                                              | Aenderungstyp | Geschaetzte Zeilen |
| ------------------------------------------------------------------ | ------------- | ------------------ |
| `apps/server/src/services/markdown-explorer-service.ts`            | Erweitern     | ~30                |
| `apps/server/src/routes/markdown-explorer/routes/files-by-time.ts` | Anpassen      | ~15                |
| `apps/ui/src/store/explorer-store.ts`                              | Umbauen       | ~120               |
| `apps/ui/src/components/.../files-panel/files-panel.tsx`           | Umbauen       | ~80                |
| `apps/ui/src/components/.../files-panel/file-tree.tsx`             | Anpassen      | ~20                |
| `apps/ui/src/components/.../files-panel/file-tree-item.tsx`        | Anpassen      | ~40                |
| `apps/ui/src/lib/http-api-client.ts`                               | Erweitern     | ~10                |
| **Gesamt**                                                         |               | **~315**           |

---

## 🧪 Validierung nach Abschluss

- [ ] `cd apps/server && npx tsc --noEmit` → 0 Fehler
- [ ] `cd apps/ui && npx tsc --noEmit` → 0 Fehler
- [ ] Files Panel zeigt nur .md Dateien
- [ ] Ordner werden korrekt aus Pfaden aufgebaut
- [ ] Expand/Collapse funktioniert
- [ ] Favoriten funktionieren weiterhin
- [ ] Leere Ordner (keine .md Kinder) werden nicht angezeigt
