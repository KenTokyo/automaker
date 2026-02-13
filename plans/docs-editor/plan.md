ULTRATHINK

# 🎯 GLOBALER MASTER PLAN: Docs Editor - Vollständiger Markdown Editor mit TipTap

> **Projekt**: Automaker Docs System - Von Read-Only zu Full-Featured Editor
> **Status**: ✅ ALLE PHASEN ABGESCHLOSSEN
> **Erstellt**: 2026-02-13
> **Letzte Aktualisierung**: 2026-02-13

---

## 📋 Übersicht

Das bestehende Docs-System in Automaker hat bereits ein vollständiges CRUD-Backend, eine Dateiverwaltungs-UI und einen Read-Only Markdown-Viewer. **Was fehlt**: Ein interaktiver Editor, mit dem der User Dokumente direkt bearbeiten, formatieren und gestalten kann.

### Ziel

Einen **TipTap-basierten WYSIWYG Markdown-Editor** implementieren mit:

- Rich-Text Editing (Bold, Italic, Headings, Listen, Code, Links, Blockquotes)
- Tabellen-Support (erstellen, editieren, Spalten/Zeilen hinzufügen)
- Schönes Markdown-Rendering (gerenderte Ansicht + Editor-Ansicht)
- Theme-System (Farben, Gradients für H1/H2/H3, Font-Size Settings)
- AI-Integration (KI kann Dokumente editieren, User kann Textpassagen selektieren)
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Speichern (Auto-Save + manuell)

---

## 🏗️ Architektur-Überblick

### Bestehende Infrastruktur (bereits vorhanden ✅)

| Komponente                     | Status | Beschreibung                                                                    |
| ------------------------------ | ------ | ------------------------------------------------------------------------------- |
| Backend CRUD API               | ✅     | `/api/docs/create`, `/read`, `/update`, `/delete`, `/rename`, `/mkdir`, `/list` |
| `use-docs.ts` Hook             | ✅     | `updateDoc(content)` Methode existiert                                          |
| `http-api-client.ts`           | ✅     | `docs.update()` API-Call existiert                                              |
| `DocFile` / `DocContent` Types | ✅     | In `@automaker/types` definiert                                                 |
| `docs-viewer.tsx`              | ✅     | 3-Mode Viewer (view/edit/source)                                                |
| `docs-panel.tsx`               | ✅     | Panel mit Breadcrumbs, Dateiliste                                               |
| `docs-list.tsx`                | ✅     | Datei-Browser mit Rename/Delete                                                 |
| `Markdown` Component           | ✅     | `react-markdown` + `rehype-raw` + `rehype-sanitize` + Syntax Highlighting       |
| shadcn/ui + Radix              | ✅     | Alle benötigten UI-Primitives                                                   |
| CodeMirror                     | ✅     | Bereits installiert für Source-Mode                                             |

### Implementierte Komponenten (~5.500 Zeilen, 16 neue Dateien)

| Komponente                 | Phase   | Datei                        | Zeilen |
| -------------------------- | ------- | ---------------------------- | ------ |
| TipTap WYSIWYG Editor      | Phase 1 | `docs-editor.tsx`            | ~670   |
| Doc Viewer/Switcher        | Phase 1 | `docs-viewer.tsx`            | ~824   |
| Markdown Serializer        | Phase 2 | `markdown-serializer.ts`     | ~181   |
| Source Editor (CodeMirror) | Phase 2 | `docs-source-editor.tsx`     | ~131   |
| Editor Toolbar             | Phase 3 | `docs-editor-toolbar.tsx`    | ~527   |
| AI Transform Menu          | Phase 6 | `docs-ai-menu.tsx`           | ~537   |
| Slash Commands             | Phase 6 | `docs-slash-commands.tsx`    | ~339   |
| Theme Settings             | Phase 5 | `docs-theme-settings.tsx`    | ~543   |
| Shortcuts Overlay          | Phase 7 | `docs-shortcuts-overlay.tsx` | ~144   |
| Table Picker               | Phase 4 | `docs-table-picker.tsx`      | ~114   |
| Table Context Menu         | Phase 4 | `docs-table-menu.tsx`        | ~243   |
| Editor State Hook          | Phase 1 | `use-editor.ts`              | ~111   |
| Editor Theme Hook          | Phase 5 | `use-editor-theme.ts`        | ~99    |
| AI Transform Endpoint      | Phase 6 | `ai-transform.ts` (server)   | ~200   |
| Insert-to-Docs (Chat)      | Phase 6 | `message-bubble.tsx` (mod)   | ~250   |
| Docs Panel (enhanced)      | Phase 1 | `docs-panel.tsx` (mod)       | ~211   |

---

## 📊 Phasen-Übersicht & Status

| Phase                                            | Datei                                                                | Planung   | Implementation   | CHAT   | ~Tokens |
| ------------------------------------------------ | -------------------------------------------------------------------- | --------- | ---------------- | ------ | ------- |
| **Phase 1**: TipTap Editor Foundation            | [phase-1-tiptap-foundation.md](./phase-1-tiptap-foundation.md)       | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 1 | ~80.000 |
| **Phase 2**: Markdown Rendering & Serialisierung | [phase-2-markdown-rendering.md](./phase-2-markdown-rendering.md)     | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 2 | ~70.000 |
| **Phase 3**: Editor Toolbar & Formatting         | [phase-3-editor-toolbar.md](./phase-3-editor-toolbar.md)             | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 3 | ~75.000 |
| **Phase 4**: Table Support                       | [phase-4-table-support.md](./phase-4-table-support.md)               | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 4 | ~65.000 |
| **Phase 5**: Theme System & Typography           | [phase-5-theme-system.md](./phase-5-theme-system.md)                 | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 5 | ~80.000 |
| **Phase 6**: AI Integration & Advanced           | [phase-6-ai-integration.md](./phase-6-ai-integration.md)             | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 6 | ~70.000 |
| **Phase 7**: Polish, Auto-Save & Performance     | [phase-7-polish-performance.md](./phase-7-polish-performance.md)     | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 7 | ~60.000 |
| **Phase 8**: Bugfix & Stabilisierung             | [phase-8-bugfix-stabilization.md](./phase-8-bugfix-stabilization.md) | ✅ FERTIG | ✅ IMPLEMENTIERT | CHAT 8 | ~40.000 |

**Gesamt**: ~540.000 Tokens über 8 CHATs (jeder CHAT unter 150.000 Token-Limit)

---

## 🔗 Referenzen

- **temp.md**: [temp.md](./temp.md) - Kontext zwischen Chat-Sessions
- **CLAUDE.md**: Projekt-Richtlinien, Import-Konventionen, Architektur
- **Bestehende Komponenten**: `apps/ui/src/components/views/agent-view/components/docs-*.tsx`
- **Types**: `libs/types/src/docs.ts`
- **Hook**: `apps/ui/src/hooks/use-docs.ts`
- **API Client**: `apps/ui/src/lib/http-api-client.ts`
- **Server Routes**: `apps/server/src/routes/docs/`
- **UI Components**: `apps/ui/src/components/ui/` (shadcn/ui)
- **Markdown Component**: `apps/ui/src/components/ui/markdown.tsx`

---

## 📝 Chat-Workflow

Jeder CHAT bekommt:

1. Diese `plan.md` (globale Taskliste)
2. Die relevante `phase-X-*.md` Datei
3. Optional: `temp.md` für Kontext aus vorherigem Chat

### CHAT-Zuordnung

| CHAT       | Phasen                  | Fokus                                                      | ~Tokens |
| ---------- | ----------------------- | ---------------------------------------------------------- | ------- |
| **CHAT 1** | Phase 1 (Tasks 1.1-1.5) | TipTap installieren, Basis-Editor, View/Edit Toggle        | ~80.000 |
| **CHAT 2** | Phase 2 (Tasks 2.1-2.4) | Markdown ↔ TipTap, Enhanced Rendering, Syntax Highlighting | ~70.000 |
| **CHAT 3** | Phase 3 (Tasks 3.1-3.5) | Toolbar-Komponente, Formatting-Buttons, Floating Menu      | ~75.000 |
| **CHAT 4** | Phase 4 (Tasks 4.1-4.4) | Table Extension, Table-UI, Tabellen-Toolbar                | ~65.000 |
| **CHAT 5** | Phase 5 (Tasks 5.1-5.5) | Theme-Settings Panel, Font-Size, H1-H6 Farben, Gradients   | ~80.000 |
| **CHAT 6** | Phase 6 (Tasks 6.1-6.4) | AI-Editing Integration, Textblock-Selektion, KI-Commands   | ~70.000 |
| **CHAT 7** | Phase 7 (Tasks 7.1-7.5) | Auto-Save, Keyboard Shortcuts, Performance, Final QA       | ~60.000 |
| **CHAT 8** | Phase 8 (Tasks 8.1-8.8) | TooltipProvider Bugfix, Stabilisierung                     | ~40.000 |

---

## 🔄 Fortschritts-Tracking

### Abgeschlossene Phasen (Planung + Implementation)

- Phase 1: TipTap Editor Foundation ✅
- Phase 2: Markdown Rendering & Serialisierung ✅
- Phase 3: Editor Toolbar & Formatting ✅
- Phase 4: Table Support ✅
- Phase 5: Theme System & Typography ✅
- Phase 6: AI Integration & Advanced ✅
- Phase 7: Polish, Auto-Save & Performance ✅
- Phase 8: Bugfix & Stabilisierung ✅

### Aktuelle Phase

**Keine offenen Phasen** - Alle 8 Phasen abgeschlossen ✅

### Offene Phasen

Keine

---

## ⚠️ Wichtige Regeln

1. **Kein Code in Planungen** - Nur Beschreibungen, Komponentennamen und Aufgaben
2. **Import-Konventionen** aus CLAUDE.md einhalten (`@automaker/types`, etc.)
3. **shadcn/ui Patterns** verwenden für alle UI-Komponenten
4. **Bestehende Infrastruktur** wiederverwenden (insb. `updateDoc()`, Markdown-Komponente)
5. **Build muss durchlaufen** am Ende jeder Phase: `npm run build`
6. **Maximal 150.000 Tokens** pro CHAT-Session
7. **TooltipProvider-Pattern**: Jede `<Tooltip>` Stelle MUSS mit `<TooltipProvider>` gewrappt werden (Codebase-Konvention)
