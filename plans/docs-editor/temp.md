ULTRATHINK

# 🔄 Temp Context - Docs Editor Feature

> Dieses Dokument wird zwischen Chat-Sessions weitergegeben und enthält den aktuellen Kontext.
> **Letzte Aktualisierung**: 2026-02-13

---

## 🎯 Aktueller Stand

**Phase 1-7**: ✅ IMPLEMENTIERT - Alle Features gebaut (~5.500 Zeilen, 16 neue Dateien)
**Phase 8**: ✅ IMPLEMENTIERT - TooltipProvider Bugfix abgeschlossen
**Status**: ALLE PHASEN ABGESCHLOSSEN

---

## 🐛 KRITISCHER BUG: `Tooltip must be used within TooltipProvider`

### Ursache

Die 7 neuen docs-Dateien verwenden `<Tooltip>` ohne `<TooltipProvider>`. Die Codebase hat das Pattern, dass JEDE Tooltip-Verwendung individuell mit `<TooltipProvider>` gewrappt wird. Es gibt KEINE globale `<TooltipProvider>` in `__root.tsx`.

### Betroffene Dateien (7 Dateien, 10 Tooltip-Stellen)

1. **`docs-editor-toolbar.tsx`** - 5 Stellen (ToolbarButton, HeadingDropdown, LinkButton, ImageButton)
2. **`docs-ai-menu.tsx`** - 1 Stelle (AI-Transform Trigger)
3. **`docs-editor.tsx`** - 1 Stelle (BubbleButton)
4. **`docs-table-picker.tsx`** - 1 Stelle (Table-Insert Trigger)
5. **`docs-viewer.tsx`** - 1 Stelle (SaveStatusBadge)
6. **`docs-theme-settings.tsx`** - 1 Stelle (Settings Trigger)
7. **`message-bubble.tsx`** - 1 Stelle (InsertIntoDocsButton)

### Fix-Strategie

- `TooltipProvider` zum Import hinzufügen in jeder Datei
- Jede `<Tooltip>` Stelle mit `<TooltipProvider>` wrappen
- Pattern: `<TooltipProvider><Tooltip>...</Tooltip></TooltipProvider>`
- Konsistent mit bestehendem Codebase-Pattern (z.B. `project-badge.tsx`, `board-controls.tsx`, etc.)

---

## 📁 Aktuelle Dateipfade

### Neue Dateien (Phase 1-7)

- `apps/ui/src/components/views/agent-view/components/docs-editor.tsx` - TipTap WYSIWYG Editor (~670 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-source-editor.tsx` - CodeMirror Source Editor (~131 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-viewer.tsx` - 3-Mode Viewer (~824 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-panel.tsx` - Panel (~211 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-editor-toolbar.tsx` - Formatting Toolbar (~527 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-ai-menu.tsx` - AI Transform Menu (~537 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-slash-commands.tsx` - Slash Commands (~339 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-theme-settings.tsx` - Theme Settings (~543 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-shortcuts-overlay.tsx` - Shortcuts Overlay (~144 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-table-picker.tsx` - Table Grid Picker (~114 Zeilen)
- `apps/ui/src/components/views/agent-view/components/docs-table-menu.tsx` - Table Context Menu (~243 Zeilen)
- `apps/ui/src/hooks/use-editor.ts` - Editor State Hook (~111 Zeilen)
- `apps/ui/src/hooks/use-editor-theme.ts` - Theme CSS Hook (~99 Zeilen)
- `apps/ui/src/lib/markdown-serializer.ts` - Markdown Konvertierung (~181 Zeilen)
- `apps/server/src/routes/docs/routes/ai-transform.ts` - AI Transform Endpoint (~200 Zeilen)

### Modifizierte Dateien

- `apps/ui/src/components/views/agent-view/components/message-bubble.tsx` - Insert-to-Docs Button
- `apps/ui/src/store/app-store.ts` - Docs State + Theme Settings
- `apps/ui/src/lib/http-api-client.ts` - Docs API + AI Transform
- `apps/ui/src/components/ui/markdown.tsx` - Enhanced Rendering + Syntax Highlighting
- `libs/types/src/docs.ts` - DocContent, DocFile, EditorThemeSettings Types
- `libs/types/src/index.ts` - Type Exports
- `apps/server/src/routes/docs/index.ts` - AI Transform Route Registration
- `apps/server/src/index.ts` - Server Config
- `apps/ui/package.json` - TipTap, Turndown, Marked Dependencies
- `apps/ui/vite.config.mts` - Code-Splitting Config
- `package-lock.json` - Lockfile

### Installierte Packages

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tiptap/core`
- `@tiptap/extension-placeholder`, `@tiptap/extension-underline`, `@tiptap/extension-link`
- `@tiptap/extension-image`, `@tiptap/extension-typography`
- `@tiptap/extension-code-block-lowlight`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- `turndown`, `@types/turndown`
- `marked`
- `lowlight`
- `@codemirror/lang-markdown`
- `hast-util-to-html`

---

## 📊 Build-Status

- `npm run build` ✅ erfolgreich (Build geht durch, aber Runtime-Fehler vorhanden)
- Code-Splitting funktioniert:
  - `docs-editor-*.js` (~439 kB) - TipTap + lowlight
  - `docs-source-editor-*.js` (~184 kB) - CodeMirror
  - `markdown-*.js` (~485 kB) - Markdown View + lowlight

---

## 🔄 Nächste Phase

Keine weiteren Phasen. Alle 8 Phasen des Docs-Editor Features sind abgeschlossen.

- Phase 8 (TooltipProvider Bugfix) wurde in CHAT 8 implementiert
- Alle 10 Tooltip-Stellen in 7 Dateien mit `<TooltipProvider>` gewrappt
- Build verifiziert: `npm run build` läuft erfolgreich durch
