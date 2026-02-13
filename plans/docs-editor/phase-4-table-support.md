ULTRATHINK

# 📊 Phase 4: Table Support

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ⬜ OFFEN
> **CHAT**: CHAT 4 (~65.000 Tokens)
> **Voraussetzung**: Phase 1 + Phase 2 + Phase 3 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.200

---

## 🎯 Strategie & Ziele

### Was soll Phase 4 leisten?

Vollständigen Tabellen-Support im Editor implementieren: Tabellen erstellen, Zeilen/Spalten hinzufügen/entfernen, Zellen bearbeiten, Tabellen-Header, und Merge/Split von Zellen. Im View-Modus sollen Markdown-Tabellen schön gerendert werden (Striped Rows, Sticky Header, horizontales Scrollen).

### Verbindungen

- **Phase 2**: Markdown-Serializer muss Tabellen korrekt konvertieren (MD ↔ HTML)
- **Phase 3**: Toolbar wird um Tabellen-Buttons erweitert
- **Phase 5**: Theme beeinflusst Tabellen-Farben (Border, Header, Stripes)

### Abhängigkeiten

- Phase 1-3 müssen abgeschlossen sein
- TipTap Table Extensions müssen in Phase 1 installiert worden sein:
  - `@tiptap/extension-table`
  - `@tiptap/extension-table-row`
  - `@tiptap/extension-table-cell`
  - `@tiptap/extension-table-header`

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Wie erstellt der User eine neue Tabelle?

- Toolbar-Button "Table" → Öffnet ein Mini-Grid-Picker (z.B. 6x6 Grid)
- User fährt mit der Maus über das Grid → Zeigt Vorschau der Größe (z.B. "3x2")
- Klick erstellt die Tabelle mit der gewählten Größe
- Alternative: "Insert Table" Dialog mit Zeilen/Spalten-Eingabe

### ✅ F2: Was passiert wenn eine Tabelle in Markdown geladen wird?

- TipTap Table Extension erkennt `<table>` HTML (aus dem Markdown-Parser)
- Konvertierung: Markdown `| col1 | col2 |` → HTML → TipTap Table Node
- Beim Speichern: TipTap Table → HTML → Markdown Pipe-Format
- **Edge-Case**: Markdown-Tabellen ohne Header-Separator (`---`) → Werden als Text behandelt

### ✅ F3: Wie funktioniert Zeilen/Spalten hinzufügen?

- Kontextmenü (Rechtsklick in Tabelle) mit Optionen:
  - "Insert Row Above / Below"
  - "Insert Column Left / Right"
  - "Delete Row / Column"
  - "Delete Table"
  - "Toggle Header Row"
  - "Toggle Header Column"
- Alternativ: Kleine "+" Buttons an den Rändern der Tabelle (bei Hover)

### ✅ F4: Wie verhält sich die Tab-Taste in Tabellen?

- Tab → Nächste Zelle
- Shift+Tab → Vorherige Zelle
- Tab in letzter Zelle → Neue Zeile erstellen
- Enter → Neue Zeile im Zellinhalt (Soft-Break)

### ✅ F5: Was ist mit sehr breiten Tabellen?

- Horizontales Scrollen innerhalb des Table-Containers
- Sticky erste Spalte (optional, wenn sinnvoll)
- Im View-Modus: Container mit `overflow-x: auto`

---

## 📱 Konkrete Beispiele

```
🖥️ User klickt Tabellen-Button in Toolbar
📊 Grid-Picker erscheint: User wählt 3x4
✅ Tabelle wird eingefügt mit 3 Spalten, 4 Zeilen (erste Zeile = Header)
✏️ User tippt in Zellen, navigiert mit Tab
➕ Rechtsklick → "Add Column Right" → Neue Spalte erscheint
🗑️ Rechtsklick → "Delete Row" → Zeile wird entfernt
💾 Speichern → Tabelle wird als Markdown Pipe-Format gespeichert
```

---

## ⚡ Performance-Optimierung

- **Table Extension** nur laden wenn benötigt (ist bereits in den Phase-1-Extensions enthalten)
- **Grid-Picker** als leichtgewichtige CSS-Grid-Lösung (kein zusätzliches Package)
- **Kontextmenü** nutzt bestehendes `DropdownMenu` Pattern
- **Memoization** der Table-Toolbar-Buttons

---

## 🔄 Code-Wiederverwendung

| Bestehend                          | Wiederverwendung                   |
| ---------------------------------- | ---------------------------------- |
| `DropdownMenu` (shadcn/ui)         | ✅ Für Table-Kontextmenü           |
| `Button`, `Tooltip`                | ✅ Für Table-Toolbar-Buttons       |
| `DocsEditorToolbar` (Phase 3)      | ✅ Wird um Table-Section erweitert |
| `markdown-serializer.ts` (Phase 2) | ✅ Wird um Table-Rules erweitert   |
| `markdown.tsx` View-Rendering      | ✅ Tabellen-Styles dort hinzufügen |
| TipTap Table Extensions            | ✅ Aus Phase 1 installiert         |

---

## 🧩 Komponenten & Tasks

### Task 4.1: TipTap Table Extensions konfigurieren

**Bestehende Datei**: `apps/ui/src/components/views/agent-view/components/docs-editor.tsx`
**Zweck**: Table Extensions zum Editor hinzufügen und konfigurieren
**Was angepasst werden soll**:

- `Table.configure({ resizable: true, HTMLAttributes: { class: 'editor-table' } })`
- `TableRow` Extension hinzufügen
- `TableCell` Extension hinzufügen
- `TableHeader` Extension mit Styling hinzufügen
- Extensions-Array in `useMemo` erweitern
- CSS-Klassen für Tabellen-Darstellung im Editor definieren:
  - Border für alle Zellen
  - Header-Row mit Hintergrundfarbe
  - Resizable Column Handles (kleine Drag-Handles an Spaltenrändern)
  - Selektierte Zellen hervorheben (TipTap Table Selection)

**Geschätzte Zeilen**: ~100 (Modifikation)

---

### Task 4.2: Grid-Picker für Tabellen-Erstellung

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-table-picker.tsx`
**Zweck**: Visueller Grid-Picker zum Erstellen von Tabellen
**Was die Komponente tun soll**:

- Popover (shadcn/ui) das vom Tabellen-Toolbar-Button getriggert wird
- 8x8 oder 6x6 Grid aus kleinen Quadraten
- Hover-Effekt: Selektierte Zellen werden hervorgehoben
- Label zeigt aktuelle Größe: "3 x 2" (Spalten x Zeilen)
- Klick erstellt Tabelle: `editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()`
- Mindestgröße: 1x1
- Option "With Header Row" Toggle (Default: ein)

**Geschätzte Zeilen**: ~200-250

---

### Task 4.3: Table Kontextmenü

**Neue Datei oder Erweiterung**: `docs-editor-toolbar.tsx` oder separate Sub-Komponente
**Zweck**: Rechtsklick-Menü für Tabellen-Operationen
**Was die Komponente tun soll**:

- Wird nur angezeigt wenn Cursor in einer Tabelle steht
- Menü-Optionen mit TipTap-Commands:
  - **Zeilen**: "Insert Row Above", "Insert Row Below", "Delete Row"
  - **Spalten**: "Insert Column Before", "Insert Column After", "Delete Column"
  - **Zellen**: "Merge Cells" (wenn mehrere selektiert), "Split Cell" (wenn gemerged)
  - **Header**: "Toggle Header Row", "Toggle Header Column"
  - **Tabelle**: "Delete Table"
- Icons für jede Option (Lucide)
- Separator zwischen Gruppen
- Disabled-State für nicht-anwendbare Optionen (z.B. "Merge" wenn nur eine Zelle selektiert)

**Geschätzte Zeilen**: ~250-300

---

### Task 4.4: Markdown-Serializer für Tabellen erweitern

**Bestehende Datei**: `apps/ui/src/lib/markdown-serializer.ts`
**Zweck**: Korrekte bidirektionale Konvertierung von Tabellen
**Was angepasst werden soll**:

- **HTML → Markdown** (`turndown` Rule):
  - `<table>` → Markdown Pipe-Format
  - `<th>` → Header mit `---` Separator
  - `<td>` → Daten-Zellen
  - Alignment (`text-align`) → `:---`, `:---:`, `---:`
  - Merged Cells → Best-Effort (Markdown kann kein Merge, fallback auf einzelne Zellen)
- **Markdown → HTML** (Parser):
  - Pipe-Format `| a | b |` → `<table>` mit `<th>` und `<td>`
  - Header-Separator `| --- | --- |` erkennen
  - Alignment-Marker erkennen
- Tests für Edge-Cases:
  - Leere Zellen
  - Zellen mit Pipes (`\|` escaped)
  - Einzeilige Tabellen (nur Header)

**Geschätzte Zeilen**: ~200-250

---

## 📊 Zusammenfassung Phase 4

| Task       | Komponente                 | Typ                 | ~Zeilen  |
| ---------- | -------------------------- | ------------------- | -------- |
| 4.1        | Table Extensions Config    | Modifikation        | ~100     |
| 4.2        | `DocsTablePicker`          | Neue Komponente     | ~225     |
| 4.3        | Table Kontextmenü          | Neue Sub-Komponente | ~275     |
| 4.4        | Markdown-Serializer Tables | Modifikation        | ~225     |
| **Gesamt** |                            |                     | **~825** |

---

## ✅ Abnahmekriterien

1. [ ] Tabellen können über Grid-Picker erstellt werden
2. [ ] Zellen können bearbeitet und mit Tab navigiert werden
3. [ ] Zeilen und Spalten können hinzugefügt/entfernt werden (Kontextmenü)
4. [ ] Header-Row wird korrekt dargestellt und kann getoggelt werden
5. [ ] Tabellen werden als korrektes Markdown Pipe-Format gespeichert
6. [ ] Markdown-Tabellen werden korrekt im Editor geladen
7. [ ] View-Modus zeigt Tabellen mit Borders, Striped Rows, Sticky Header
8. [ ] Breite Tabellen sind horizontal scrollbar
9. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 5 benötigt:

- Funktionierende Tabellen im Editor und View
- CSS-Klassen-Struktur der Tabellen (für Theme-Anpassung)
- Editor-Content-Area Styles (für Font-Size Anpassung)
