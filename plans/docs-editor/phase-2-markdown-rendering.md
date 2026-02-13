ULTRATHINK

# 🎨 Phase 2: Markdown Rendering & Serialisierung

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ⬜ OFFEN
> **CHAT**: CHAT 2 (~70.000 Tokens)
> **Voraussetzung**: Phase 1 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.500

---

## 🎯 Strategie & Ziele

### Was soll Phase 2 leisten?

Die Brücke zwischen Markdown-Dateien und dem TipTap-Editor schaffen. TipTap arbeitet intern mit einem ProseMirror-Document-Modell, aber unsere Dateien sind Markdown (`.md`). Phase 2 implementiert die bidirektionale Konvertierung und verbessert das Markdown-Rendering.

### Verbindungen

- **Phase 1**: Editor-Grundstruktur wird genutzt
- **Phase 3**: Toolbar baut auf den Extensions auf, die hier konfiguriert werden
- **Bestehend**: `Markdown` Component (`react-markdown`) wird enhanced
- **Bestehend**: `rehype-raw`, `rehype-sanitize` sind bereits installiert

### Abhängigkeiten

- Phase 1 muss abgeschlossen sein
- Zusätzliche npm-Pakete: `turndown` (HTML → Markdown), ggf. `marked` oder `markdown-it`

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Warum nicht direkt Markdown im Editor tippen?

- TipTap ist ein WYSIWYG-Editor (What You See Is What You Get)
- User sieht formatierten Text, nicht Markdown-Syntax
- Aber: Ein "Source Mode" (Raw Markdown) wird als Alternative bereitgestellt
- Konvertierung geschieht beim Laden (MD → TipTap) und Speichern (TipTap → MD)

### ✅ F2: Gehen Markdown-spezifische Features bei der Konvertierung verloren?

- HTML-zu-Markdown via `turndown` ist gut für Standard-Markdown
- Front-Matter, Custom Syntax (z.B. `:::note`) werden als Raw-Text erhalten
- Code-Blöcke behalten ihre Sprach-Tags (`\`\`\`typescript`)
- **Edge-Case**: Sehr komplexes Markdown (Footnotes, Definitions) → Fallback auf Raw-Text

### ✅ F3: Wie verhält sich Syntax-Highlighting in Code-Blöcken?

- TipTap `CodeBlockLowlight` Extension nutzt `lowlight` für Syntax-Highlighting
- Im View-Modus: `react-markdown` + `rehype-highlight` oder eigenes Code-Component
- Sprachen: TypeScript, JavaScript, JSON, HTML, CSS, Python, Bash, SQL, YAML (häufigste)

### ✅ F4: Was passiert wenn Markdown invalide ist?

- TipTap ist tolerant - invalides Markdown wird als Text geparst
- Kein Crash, schlimmstenfalls falsche Formatierung
- User kann jederzeit in "Source Mode" wechseln und Raw bearbeiten

---

## 📱 Konkrete Beispiele

```
📝 User hat eine feature-spec.md mit Headings, Code-Blöcken, Listen
✏️ User öffnet im Editor → TipTap zeigt formatierten Content mit Syntax-Highlighting
💾 User speichert → Content wird als sauberes Markdown zurück in die Datei geschrieben
👁️ User wechselt zu View → react-markdown rendert mit schönen Code-Blöcken
🔀 "Source" Button → Zeigt Raw Markdown mit CodeMirror (read/write)
✅ Markdown-Qualität bleibt erhalten!
```

---

## ⚡ Performance-Optimierung

- **`lowlight`** wird lazy-loaded (nur wenn Code-Blöcke vorhanden)
- **Markdown-Serialisierung** ist synchron und schnell (<10ms für 100KB)
- **`useMemo`** für gerenderten Markdown-Content
- **Code-Splitting**: `react-syntax-highlighter` oder `lowlight` Sprachen werden on-demand geladen

---

## 🔄 Code-Wiederverwendung

| Bestehend                       | Wiederverwendung                     |
| ------------------------------- | ------------------------------------ |
| `Markdown` Component            | ✅ Erweitern mit Syntax-Highlighting |
| `react-markdown` (v10.1.0)      | ✅ Weiterhin im View-Modus           |
| `rehype-raw`, `rehype-sanitize` | ✅ Behalten                          |
| CodeMirror (installiert)        | ✅ Für Source-Mode (Raw Markdown)    |
| `preserveLineBreaks()` Funktion | ✅ Behalten für View-Modus           |

---

## 🧩 Komponenten & Tasks

### Task 2.1: Markdown-Serializer erstellen

**Neue Datei**: `apps/ui/src/lib/markdown-serializer.ts`
**Zweck**: Bidirektionale Konvertierung zwischen TipTap JSON/HTML und Markdown
**Was das Modul tun soll**:

- `markdownToHtml(markdown: string): string` - Markdown → HTML für TipTap Import
- `htmlToMarkdown(html: string): string` - HTML → Markdown für File-Save
- `tiptapToMarkdown(editor: Editor): string` - Editor-Content → Markdown
- `markdownToTiptap(markdown: string): JSONContent` - Markdown → TipTap JSON (Alternative)
- Konfiguration von `turndown` Rules für:
  - Headings (h1-h6)
  - Code-Blöcke mit Sprach-Tags
  - Tabellen
  - Task-Listen (Checkboxen)
  - Links, Bilder
  - Blockquotes
- **Edge-Case Handling**: Unbekannte HTML → Raw HTML in Markdown erhalten

**Geschätzte Zeilen**: ~300-350

---

### Task 2.2: TipTap Extensions konfigurieren

**Bestehende Datei**: `apps/ui/src/components/views/agent-view/components/docs-editor.tsx`
**Zweck**: Extensions für alle benötigten Markdown-Features konfigurieren
**Was angepasst werden soll**:

- StarterKit konfigurieren mit:
  - `Heading` (levels: [1, 2, 3, 4, 5, 6])
  - `Bold`, `Italic`, `Strike`
  - `BulletList`, `OrderedList`, `ListItem`
  - `CodeBlock` (durch `CodeBlockLowlight` ersetzen)
  - `Blockquote`
  - `HorizontalRule`
  - `HardBreak`
- Zusätzliche Extensions:
  - `Underline`
  - `Link` (mit Auto-Detection)
  - `Image` (inline + block)
  - `Placeholder` (Konfigurierbar pro Datei-Typ)
  - `CodeBlockLowlight` mit `lowlight` für Syntax-Highlighting
  - `Typography` (Smart Quotes, etc.)
- Extensions-Array als `useMemo` cachen

**Geschätzte Zeilen**: ~200 (Modifikation)

---

### Task 2.3: Enhanced Markdown-View Rendering

**Bestehende Datei**: `apps/ui/src/components/ui/markdown.tsx`
**Zweck**: Das Markdown-Rendering im View-Modus verbessern
**Was geändert werden soll**:

- Syntax-Highlighting für Code-Blöcke hinzufügen
  - Option A: `rehype-highlight` + `lowlight`
  - Option B: Custom `code` Component mit `lowlight`
- Bessere Tabellen-Darstellung:
  - Striped Rows (alternierend)
  - Sticky Header
  - Horizontales Scrollen bei breiten Tabellen
- Checkbox-Listen Rendering (`- [x]` / `- [ ]`)
- Verbesserte Blockquote-Styles (verschiedene Typen: info, warning, note)
- Image-Rendering: Klickbar für Vollbild / Lightbox-Vorbereitung
- Kopfzeilen-Anker-Links (klickbare Heading-IDs)

**Geschätzte Zeilen**: ~200 zusätzlich (bestehende 80 → ~280)

---

### Task 2.4: Source-Mode (Raw Markdown Editor)

**Bestehende Datei**: `apps/ui/src/components/views/agent-view/components/docs-viewer.tsx`
**Zweck**: Dritten Modus hinzufügen: "Source" für Raw-Markdown-Bearbeitung
**Was geändert werden soll**:

- Mode erweitern: `'view' | 'edit' | 'source'`
- Source-Mode nutzt bestehende CodeMirror-Integration
- CodeMirror konfiguriert mit:
  - Markdown-Syntax-Highlighting
  - Zeilennummern
  - Word-Wrap
  - Theme passend zu App-Theme (dark/light)
- Toggle-Buttons im Header: 👁️ View | ✏️ Edit | `</>` Source
- Beim Wechsel zwischen Edit ↔ Source: Content automatisch konvertieren

**Geschätzte Zeilen**: ~250 zusätzlich

---

## 📊 Zusammenfassung Phase 2

| Task       | Komponente                   | Typ          | ~Zeilen  |
| ---------- | ---------------------------- | ------------ | -------- |
| 2.1        | `markdown-serializer.ts`     | Neues Modul  | ~325     |
| 2.2        | `docs-editor.tsx` Extensions | Modifikation | ~200     |
| 2.3        | `markdown.tsx` Enhancement   | Modifikation | ~200     |
| 2.4        | Source-Mode                  | Modifikation | ~250     |
| **Gesamt** |                              |              | **~975** |

---

## ✅ Abnahmekriterien

1. [ ] Markdown → TipTap Konvertierung funktioniert korrekt (Headings, Listen, Code, Links)
2. [ ] TipTap → Markdown Serialisierung erzeugt sauberes Markdown
3. [ ] Code-Blöcke haben Syntax-Highlighting (View + Edit Modus)
4. [ ] Source-Mode zeigt Raw Markdown in CodeMirror
5. [ ] Wechsel zwischen View ↔ Edit ↔ Source ohne Datenverlust
6. [ ] Tabellen werden im View-Modus korrekt gerendert
7. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 3 benötigt:

- Konfigurierte TipTap Extensions (aus Task 2.2)
- Funktionierende Markdown-Serialisierung (aus Task 2.1)
- Editor-Instanz Zugriff für Toolbar-Commands
