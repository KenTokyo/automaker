ULTRATHINK

# 🛠️ Phase 3: Editor Toolbar & Formatting

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ✅ FERTIG
> **CHAT**: CHAT 3 (~75.000 Tokens)
> **Voraussetzung**: Phase 1 + Phase 2 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.600

---

## 🎯 Strategie & Ziele

### Was soll Phase 3 leisten?

Eine vollständige Formatting-Toolbar für den TipTap-Editor implementieren. Die Toolbar soll alle gängigen Markdown-Formatierungen per Klick/Shortcut anbieten und visuell den aktiven Zustand anzeigen (z.B. wenn der Cursor in einer H2 steht, ist H2-Button aktiv).

### Verbindungen

- **Phase 1**: `DocsEditor` Komponente wird um Toolbar erweitert
- **Phase 2**: Extensions (Bold, Italic, Heading, etc.) sind bereits konfiguriert
- **Phase 4**: Tabellen-Toolbar-Buttons werden in Phase 4 separat behandelt
- **Phase 5**: Theme-Einstellungen beeinflussen Toolbar-Darstellung (Farben, etc.)

### Abhängigkeiten

- Phase 1 + 2 müssen abgeschlossen sein
- TipTap Editor-Instanz muss verfügbar sein
- Alle benötigten TipTap Extensions aus Phase 2 müssen konfiguriert sein

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Wo wird die Toolbar platziert?

- Direkt über dem Editor-Content, unterhalb des DocsViewer-Headers
- Sticky (bleibt oben beim Scrollen des Editor-Contents)
- Responsive: Bei schmalem Panel werden Buttons in eine zweite Zeile umgebrochen oder in ein Overflow-Menü verschoben

### ✅ F2: Wie verhält sich die Toolbar wenn nichts selektiert ist?

- Inline-Formatierungen (Bold, Italic, etc.) sind disabled wenn kein Text selektiert
- Block-Formatierungen (Heading, Liste, Blockquote) sind immer verfügbar
- Aktiver Zustand wird über `editor.isActive()` abgefragt

### ✅ F3: Soll es ein Floating-Menu geben (bei Textselektion)?

- Ja, ein kleines Floating-Menu das bei Textselektion erscheint
- Enthält: Bold, Italic, Strike, Code, Link
- Verschwindet bei Klick außerhalb oder Deselect
- Implementierung über TipTap `BubbleMenu` Extension

### ✅ F4: Wie werden Heading-Levels gewählt?

- Dropdown/Select-Button mit Optionen: "Normal Text", "H1", "H2", "H3", "H4"
- Zeigt aktuelles Level an (z.B. "Heading 2" wenn Cursor in H2)
- Tastatur-Shortcuts: Ctrl+1 bis Ctrl+4 für H1-H4

### ✅ F5: Was passiert bei sehr schmalem Panel?

- Toolbar Buttons werden in Gruppen organisiert (divider zwischen Gruppen)
- Bei zu wenig Platz: Overflow-Menü (MoreHorizontal Icon) enthält die überlaufenden Buttons
- Mindestbreite: Die wichtigsten Buttons (Bold, Italic, Heading) sind immer sichtbar

---

## 📱 Konkrete Beispiele

```
🖥️ User öffnet Editor
📋 Toolbar erscheint: [B] [I] [U] [S] [H1▾] | [•] [1.] [☐] [—] | [<>] [" "] [🔗] [📎]
✏️ User selektiert Text → Floating-Menu: [B] [I] [S] [<>] [🔗]
📝 User klickt [B] → Text wird fett, [B]-Button wird "aktiv" (hervorgehoben)
🔢 User klickt [H1▾] → Dropdown: Normal Text / H1 / H2 / H3 / H4
💾 Alle Formatierungen werden als Markdown gespeichert
```

---

## ⚡ Performance-Optimierung

- **`useCallback`** für alle Toolbar-Button-Handler
- **`editor.isActive()` Abfragen** nur bei Editor-Updates (nicht bei jedem Render)
- **Toolbar als `memo` Komponente** mit `editor` als einzige Dependency
- **CSS Transitions** für Active-State statt Re-Renders
- **Floating Menu** wird lazy via TipTap BubbleMenu gehandelt (kein eigener Portal-Overhead)

---

## 🔄 Code-Wiederverwendung

| Bestehend                      | Wiederverwendung                    |
| ------------------------------ | ----------------------------------- |
| `Button` Component (shadcn/ui) | ✅ Für Toolbar-Buttons              |
| `Tooltip` Component            | ✅ Für Button-Beschreibungen        |
| `DropdownMenu` Component       | ✅ Für Heading-Level-Dropdown       |
| `Separator` Component          | ✅ Für Toolbar-Gruppen-Divider      |
| `Toggle` / `ToggleGroup`       | ✅ Für aktive Formatierung anzeigen |
| `cn()` Utility                 | ✅ Für bedingte Klassen             |
| TipTap `BubbleMenu`            | ✅ Für Floating-Menu                |

---

## 🧩 Komponenten & Tasks

### Task 3.1: `DocsEditorToolbar` Hauptkomponente erstellen

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-editor-toolbar.tsx`
**Zweck**: Die gesamte Formatting-Toolbar als eigenständige Komponente
**Was die Komponente tun soll**:

- Props: `editor: Editor` (TipTap Editor-Instanz)
- Button-Gruppen in Bereichen:
  - **Text-Formatting**: Bold, Italic, Underline, Strikethrough
  - **Block-Typ**: Heading-Dropdown (Normal, H1-H4), Paragraph
  - **Listen**: Bullet-List, Ordered-List, Task-List
  - **Block-Elemente**: Code-Block, Blockquote, Horizontal Rule
  - **Inline-Elemente**: Code (inline), Link, Image-URL
- Jeder Button:
  - Icon (Lucide)
  - Tooltip mit Name + Shortcut
  - Active-State Styling (via `editor.isActive('bold')` etc.)
  - onClick Handler der den TipTap-Command ausführt
- Sticky-Positioning am oberen Rand des Editors
- Separator/Divider zwischen Button-Gruppen

**Geschätzte Zeilen**: ~500-600

---

### Task 3.2: Heading-Dropdown Komponente

**Innerhalb von**: `docs-editor-toolbar.tsx` (oder als Sub-Komponente)
**Zweck**: Dropdown zur Auswahl des Block-Typs (Normal Text, H1-H4)
**Was die Komponente tun soll**:

- `DropdownMenu` (shadcn/ui) mit Optionen:
  - "Normal Text" → `editor.chain().focus().setParagraph().run()`
  - "Heading 1" → `editor.chain().focus().toggleHeading({ level: 1 }).run()`
  - "Heading 2" → ...
  - "Heading 3" → ...
  - "Heading 4" → ...
- Trigger-Button zeigt aktuellen Block-Typ an ("Normal Text", "H1", etc.)
- Visuell unterschiedliche Font-Größen in der Dropdown-Liste (H1 groß, H4 klein)
- Keyboard-Shortcuts neben den Optionen anzeigen

**Geschätzte Zeilen**: ~150

---

### Task 3.3: Link-Einfüge-Dialog

**Innerhalb von oder neben**: `docs-editor-toolbar.tsx`
**Zweck**: Dialog zum Einfügen/Bearbeiten von Links
**Was die Komponente tun soll**:

- Popover/Dialog mit zwei Feldern:
  - URL (text input, mit URL-Validierung)
  - Link-Text (optional, nutzt selektierten Text als Default)
- "Einfügen" Button → `editor.chain().focus().setLink({ href: url }).run()`
- "Entfernen" Button (wenn Cursor bereits auf Link) → `editor.chain().focus().unsetLink().run()`
- Auto-Detection: Wenn User eine URL einfügt, automatisch als Link formatieren (TipTap Link Extension mit `autolink: true`)
- "Open in Browser" Option für bestehende Links

**Geschätzte Zeilen**: ~200

---

### Task 3.4: Floating Bubble-Menu

**Innerhalb von**: `docs-editor.tsx` (neben EditorContent)
**Zweck**: Kleines Popup-Menu das bei Textselektion erscheint
**Was die Komponente tun soll**:

- TipTap `BubbleMenu` Plugin nutzen
- Erscheint wenn Text selektiert wird
- Buttons: Bold, Italic, Strikethrough, Code (inline), Link
- Kompakt: Nur Icons, keine Labels
- Styling: Dunkler Hintergrund, abgerundete Ecken, leichter Schatten
- Verschwindet bei:
  - Klick außerhalb
  - Cursor-Bewegung ohne Selektion
  - Escape-Taste
- Nicht anzeigen wenn Cursor in Code-Block (dort macht Inline-Formatting keinen Sinn)

**Geschätzte Zeilen**: ~150-200

---

### Task 3.5: Keyboard Shortcuts für Formatierung

**Bestehende Datei**: `docs-editor.tsx` oder `docs-editor-toolbar.tsx`
**Zweck**: Alle Keyboard-Shortcuts für den Editor definieren und dokumentieren
**Was implementiert werden soll**:

- Shortcuts sind teilweise durch TipTap StarterKit bereits vorhanden:
  - `Ctrl+B` → Bold
  - `Ctrl+I` → Italic
  - `Ctrl+U` → Underline (via Extension)
  - `Ctrl+Shift+X` → Strikethrough
  - `Ctrl+E` → Code (inline) — **Achtung**: Conflict mit View/Edit Toggle aus Phase 1, muss angepasst werden
  - `Ctrl+Shift+8` → Bullet List
  - `Ctrl+Shift+7` → Ordered List
- Zusätzliche Shortcuts registrieren:
  - `Ctrl+1` bis `Ctrl+4` → Heading 1-4
  - `Ctrl+Shift+B` → Blockquote
  - `Ctrl+K` → Link-Dialog öffnen
  - `Ctrl+Shift+C` → Code-Block (aus Phase 2)
- Shortcuts in Tooltip-Texten der Toolbar-Buttons anzeigen (z.B. "Bold (Ctrl+B)")
- **Wichtig**: Shortcuts nur aktiv wenn Editor fokussiert ist (nicht global)
- **Conflict Resolution**: `Ctrl+E` View/Edit Toggle umwidmen zu `Ctrl+Shift+E` oder anderem Shortcut

**Geschätzte Zeilen**: ~100 (hauptsächlich Konfiguration)

---

## 📊 Zusammenfassung Phase 3

| Task       | Komponente           | Typ             | ~Zeilen    |
| ---------- | -------------------- | --------------- | ---------- |
| 3.1        | `DocsEditorToolbar`  | Neue Komponente | ~550       |
| 3.2        | Heading-Dropdown     | Sub-Komponente  | ~150       |
| 3.3        | Link-Einfüge-Dialog  | Sub-Komponente  | ~200       |
| 3.4        | Floating Bubble-Menu | Integration     | ~175       |
| 3.5        | Keyboard Shortcuts   | Konfiguration   | ~100       |
| **Gesamt** |                      |                 | **~1.175** |

---

## ✅ Abnahmekriterien

1. [ ] Toolbar wird über dem Editor angezeigt mit allen Button-Gruppen
2. [ ] Bold, Italic, Underline, Strikethrough funktionieren per Button und Shortcut
3. [ ] Heading-Dropdown zeigt aktuellen Block-Typ und erlaubt Wechsel
4. [ ] Listen (Bullet, Ordered, Task) können erstellt und verschachtelt werden
5. [ ] Link-Dialog erlaubt Links einzufügen und zu bearbeiten
6. [ ] Floating Bubble-Menu erscheint bei Textselektion
7. [ ] Active-State wird korrekt für alle Buttons angezeigt
8. [ ] Keyboard Shortcuts funktionieren im Editor
9. [ ] Toolbar bleibt sticky beim Scrollen
10. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 4 benötigt:

- Funktionierende Toolbar-Infrastruktur
- Button-Pattern für Toolbar-Erweiterungen
- Die Toolbar wird um Table-Buttons erweitert
