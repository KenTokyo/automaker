ULTRATHINK

# ✨ Phase 7: Polish, Auto-Save & Performance

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ✅ FERTIG
> **CHAT**: CHAT 7 (~60.000 Tokens)
> **Voraussetzung**: Phase 1-6 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.200

---

## 🎯 Strategie & Ziele

### Was soll Phase 7 leisten?

Die finale Polishing-Phase: Auto-Save implementieren, alle Keyboard-Shortcuts durchgängig machen, Performance optimieren, Edge-Cases abfangen und das Gesamterlebnis abrunden. Dies ist die "Quality of Life" Phase.

### Verbindungen

- **Alle vorherigen Phasen**: Nutzt und poliert alles was in Phase 1-6 gebaut wurde
- **Phase 1**: `useEditorState` Hook bekommt Auto-Save-Logik
- **Phase 3**: Keyboard-Shortcuts werden vervollständigt
- **Phase 5**: Theme-Settings werden feinjustiert
- **Bestehend**: Build/Bundle-Optimierung

### Abhängigkeiten

- Phase 1-6 müssen abgeschlossen sein
- Alle Features müssen grundsätzlich funktionieren

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Wie funktioniert Auto-Save?

- Debounced: Nach X Sekunden Inaktivität (konfigurierbar, Default: 3s)
- Visueller Indikator: "Saving..." → "Saved" → Verschwindet nach 2s
- Bei Netzwerk-Fehler: "Save failed" Warnung + Retry
- Auto-Save nur im Edit-Modus (nicht im View/Source-Modus)
- Auto-Save kann in Settings deaktiviert werden

### ✅ F2: Was passiert bei gleichzeitigem manuellem und Auto-Save?

- Manueller Save (Ctrl+S) überschreibt den Debounce-Timer
- Kein doppelter Save (wenn Auto-Save gerade läuft, wird manueller Save nach Abschluss ignoriert)
- Save-Queue: Requests werden nicht parallel gesendet, sondern sequentiell

### ✅ F3: Welche Performance-Optimierungen sind nötig?

- TipTap Bundle-Size: ~100-150KB gzipped → Lazy Loading
- Extensions nur laden wenn benötigt (z.B. Table-Extension nur wenn Tabellen vorhanden)
- Editor Re-Renders minimieren (React.memo, useMemo, useCallback)
- Large Document Handling: Virtualisierung für Dokumente > 500KB
- Toolbar Re-Renders: Nur bei Editor-State-Änderungen

### ✅ F4: Welche Keyboard-Shortcuts brauchen noch Aufmerksamkeit?

- Globale Shortcuts (auch außerhalb des Editors):
  - `Ctrl+S` → Save (wenn Editor aktiv)
  - `Ctrl+Shift+E` → Toggle Edit-Modus
  - `Ctrl+Shift+R` → Toggle Raw/Rendered (bereits vorhanden)
  - `Ctrl+Shift+D` → Toggle Docs Panel (bereits vorhanden)
- Editor-interne Shortcuts:
  - `Ctrl+/` → Toggle Comment (in Code-Blöcken)
  - `Ctrl+Shift+Enter` → Hard Break
  - `Alt+Up/Down` → Zeile/Block hoch/runter bewegen
- Shortcut-Overlay: `Ctrl+?` oder `F1` zeigt alle Shortcuts an

### ✅ F5: Welche Edge-Cases müssen noch abgefangen werden?

- Leere Dokumente: Editor mit Placeholder, kein Save von leerem Content
- Sehr lange Zeilen ohne Breaks: Word-Wrap erzwingen
- Copy/Paste von Rich-Text (z.B. aus Word): Durch TipTap automatisch gehandelt, aber prüfen
- Copy/Paste von HTML: Bereinigung via TipTap Paste-Handler
- Browser-Tab schließen mit unsaved Changes: `beforeunload` Event
- Offline-Mode: Warnung wenn Server nicht erreichbar

---

## 📱 Konkrete Beispiele

```
🖥️ User editiert ein Dokument
⏱️ Nach 3 Sekunden Inaktivität: "Saving..." → "Saved ✓"
💾 User drückt Ctrl+S → Sofortiger Save
⌨️ User drückt Ctrl+? → Shortcuts-Overlay erscheint
🔄 User verlässt Tab → Unsaved Changes Warning
🚀 Editor lädt schnell (Lazy Loading, Code-Splitting)
📊 Große Dokumente performen gut (keine Lag-Spikes)
```

---

## ⚡ Performance-Optimierung (Detail)

- **Code-Splitting**: Separate Chunks für:
  - TipTap Core (~40KB gzip)
  - TipTap Extensions (~30KB gzip)
  - Table Extension (~15KB gzip)
  - CodeBlock + Lowlight (~25KB gzip)
  - Theme Settings Panel (~20KB gzip)
  - AI Integration (~15KB gzip)
- **Lazy Loading Strategy**:
  - `DocsEditor` → `React.lazy()`
  - `DocsThemeSettings` → `React.lazy()`
  - `DocsAIMenu` → `React.lazy()`
  - Lowlight Languages → Dynamic Import
- **Memoization Audit**: Überprüfung aller Komponenten auf unnötige Re-Renders
- **Bundle Analysis**: `vite-plugin-visualizer` für Bundle-Breakdown

---

## 🔄 Code-Wiederverwendung

| Bestehend                  | Wiederverwendung                |
| -------------------------- | ------------------------------- |
| `useEditorState` (Phase 1) | ✅ Erweitern um Auto-Save       |
| `toast` (sonner)           | ✅ Für Save-Feedback            |
| `AlertDialog` (shadcn/ui)  | ✅ Für Unsaved Changes          |
| Alle Phase 1-6 Komponenten | ✅ Optimieren und polieren      |
| Vite Config                | ✅ Code-Splitting konfigurieren |

---

## 🧩 Komponenten & Tasks

### Task 7.1: Auto-Save Implementierung

**Bestehende Datei**: `apps/ui/src/hooks/use-editor.ts`
**Zweck**: Automatisches Speichern nach Inaktivität
**Was implementiert werden soll**:

- `useAutoSave(editor, options)` Logic innerhalb von `useEditorState`:
  - `debounceMs`: Konfigurierbare Verzögerung (Default: 3000ms)
  - `enabled`: Toggle (aus Settings)
  - `onSave`: Callback der `updateDoc()` aufruft
- Debounce-Timer wird bei jeder Editor-Änderung zurückgesetzt
- Status-States: `'idle' | 'pending' | 'saving' | 'saved' | 'error'`
- Save-Queue: Verhindert parallele Saves
- Cleanup: Timer bei Unmount/Doc-Wechsel aufräumen
- Settings-Integration: Auto-Save an/aus Toggle im Theme-Settings Panel hinzufügen

**Geschätzte Zeilen**: ~200

---

### Task 7.2: Save-Status Indikator

**Bestehende Datei**: `docs-viewer.tsx` (Header-Bereich)
**Zweck**: Visueller Indikator für den Save-Status
**Was implementiert werden soll**:

- Kleiner Status-Badge neben dem Dateinamen:
  - Kein Badge: Keine Änderungen
  - Gelber Punkt: Unsaved Changes (pending)
  - Spinning-Icon: "Saving..."
  - Grüner Haken: "Saved" (verschwindet nach 2s)
  - Roter Punkt: "Save failed" (mit Tooltip für Error-Details)
- Transition/Animation zwischen States
- Kompakt: Nicht aufdringlich, aber informativ

**Geschätzte Zeilen**: ~100-150

---

### Task 7.3: Keyboard Shortcuts Overlay

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-shortcuts-overlay.tsx`
**Zweck**: Overlay/Modal das alle Keyboard-Shortcuts anzeigt
**Was die Komponente tun soll**:

- Trigger: `Ctrl+?` oder `F1` (wenn Editor fokussiert)
- Oder: "Keyboard Shortcuts" Option im More-Actions-Dropdown
- Layout: Gruppierte Liste aller Shortcuts:
  - **General**: Save, Toggle Mode, Close, etc.
  - **Text Formatting**: Bold, Italic, Underline, etc.
  - **Block Types**: Headings, Lists, Code Block, etc.
  - **Table**: Navigation, Insert Row/Column, etc.
  - **AI**: Open AI Menu, Slash Commands, etc.
- Jeder Eintrag: Beschreibung + Shortcut-Badge (z.B. `Ctrl` + `B`)
- Filterbar: Suchfeld oben (optional)
- Nutzt `Dialog` (shadcn/ui) als Container

**Geschätzte Zeilen**: ~250-300

---

### Task 7.4: Performance-Optimierung & Code-Splitting

**Bestehende Dateien**: `docs-editor.tsx`, `docs-viewer.tsx`, `vite.config.ts`
**Zweck**: Bundle-Optimierung und Lazy-Loading
**Was implementiert werden soll**:

- `React.lazy()` Wrapper für:
  - `DocsEditor` (mit Suspense + Fallback-Spinner)
  - `DocsThemeSettings` (mit Suspense)
  - `DocsAIMenu` (mit Suspense)
- Vite manualChunks Configuration:
  - `tiptap-core`: Alle @tiptap/\* Packages
  - `tiptap-extensions`: Table, CodeBlock, etc.
  - `lowlight`: Syntax-Highlighting
- `useMemo` / `useCallback` Audit:
  - Überprüfung aller Editor-Komponenten
  - Unnötige Re-Renders identifizieren und beheben
- Large Document Test:
  - Dokument mit >100KB laden
  - Editor-Performance messen
  - Ggf. Content-Chunking einführen

**Geschätzte Zeilen**: ~200 (Modifikation über mehrere Dateien)

---

### Task 7.5: Edge-Case Handling & Final Polish

**Bestehende Dateien**: Diverse
**Zweck**: Alle Edge-Cases abfangen und Gesamterlebnis abrunden
**Was implementiert werden soll**:

- `beforeunload` Handler:
  - Warnung beim Tab-Schließen wenn unsaved Changes
  - Integration mit Router-Navigation (wenn vorhanden)
- Paste-Handling:
  - Rich-Text aus Word/Google Docs → Saubere Konvertierung
  - HTML-Paste → TipTap Bereinigung (bereits built-in, aber testen)
  - Plain-Text Paste → Als normaler Text einfügen
- Empty-Document Handling:
  - Placeholder anzeigen
  - Kein Auto-Save für leere Dokumente
- Offline-Detection:
  - `navigator.onLine` Check vor Save
  - Warnung wenn offline
  - Auto-Retry wenn wieder online
- Focus-Management:
  - Editor bekommt Focus bei Mode-Wechsel zu Edit
  - Focus-Trap im Settings-Panel
- Accessibility:
  - Toolbar-Buttons haben `aria-label` und `aria-pressed`
  - Keyboard-Navigation in Toolbar mit Pfeiltasten
  - Screen-Reader-freundliche Status-Meldungen

**Geschätzte Zeilen**: ~250-300

---

## 📊 Zusammenfassung Phase 7

| Task       | Komponente                 | Typ             | ~Zeilen    |
| ---------- | -------------------------- | --------------- | ---------- |
| 7.1        | Auto-Save Logic            | Modifikation    | ~200       |
| 7.2        | Save-Status Indikator      | Modifikation    | ~125       |
| 7.3        | Shortcuts Overlay          | Neue Komponente | ~275       |
| 7.4        | Performance/Code-Splitting | Modifikation    | ~200       |
| 7.5        | Edge-Cases & Polish        | Modifikation    | ~275       |
| **Gesamt** |                            |                 | **~1.075** |

---

## ✅ Abnahmekriterien

1. [ ] Auto-Save funktioniert mit konfigurierbarer Verzögerung
2. [ ] Save-Status wird korrekt im Header angezeigt (Pending/Saving/Saved/Error)
3. [ ] Ctrl+S löst manuellen Save aus
4. [ ] Keyboard Shortcuts Overlay zeigt alle Shortcuts gruppiert an
5. [ ] TipTap wird lazy-loaded (kein Impact auf Initial-Bundle)
6. [ ] Große Dokumente (>100KB) laden und editieren flüssig
7. [ ] Tab-Schließen mit unsaved Changes zeigt Warnung
8. [ ] Copy/Paste von Rich-Text funktioniert korrekt
9. [ ] Offline-Erkennung zeigt Warnung
10. [ ] Accessibility: Toolbar navigierbar mit Pfeiltasten, aria-labels vorhanden
11. [ ] `npm run build` läuft erfolgreich durch
12. [ ] Bundle-Analyse zeigt saubere Chunk-Trennung

---

## 🏁 Finale Checkliste (Gesamtprojekt)

Nach Abschluss von Phase 7 sollten folgende Features komplett funktionieren:

| Feature                             | Phase   | Status |
| ----------------------------------- | ------- | ------ |
| TipTap Editor mit View/Edit Toggle  | Phase 1 | ⬜     |
| Markdown ↔ TipTap Serialisierung    | Phase 2 | ⬜     |
| Syntax-Highlighting in Code-Blöcken | Phase 2 | ⬜     |
| Source-Mode (Raw Markdown)          | Phase 2 | ⬜     |
| Formatting-Toolbar                  | Phase 3 | ⬜     |
| Floating Bubble-Menu                | Phase 3 | ⬜     |
| Link-Einfüge-Dialog                 | Phase 3 | ⬜     |
| Tabellen erstellen/bearbeiten       | Phase 4 | ⬜     |
| Tabellen-Kontextmenü                | Phase 4 | ⬜     |
| Theme/Typography Settings           | Phase 5 | ⬜     |
| Heading-Gradients                   | Phase 5 | ⬜     |
| Font-Size Anpassung                 | Phase 5 | ⬜     |
| AI-Text-Transform                   | Phase 6 | ⬜     |
| Slash-Commands                      | Phase 6 | ⬜     |
| Insert Chat → Docs                  | Phase 6 | ⬜     |
| Auto-Save                           | Phase 7 | ⬜     |
| Keyboard Shortcuts Overlay          | Phase 7 | ⬜     |
| Performance Optimierung             | Phase 7 | ⬜     |
| Accessibility                       | Phase 7 | ⬜     |
