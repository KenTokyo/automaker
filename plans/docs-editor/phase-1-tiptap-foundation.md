ULTRATHINK

# 🏗️ Phase 1: TipTap Editor Foundation

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ⬜ OFFEN
> **CHAT**: CHAT 1 (~80.000 Tokens)
> **Geschätzte Code-Zeilen**: ~1.800

---

## 🎯 Strategie & Ziele

### Was soll Phase 1 leisten?

Das Fundament für den gesamten Editor legen: TipTap installieren, eine Basis-Editor-Komponente erstellen und den bestehenden Read-Only Viewer um einen Edit-Modus erweitern.

### Verbindungen zu anderen Features

- **Bestehend**: `docs-viewer.tsx` (Read-Only) wird erweitert um Edit-Toggle
- **Bestehend**: `use-docs.ts` → `updateDoc()` wird endlich an UI angebunden
- **Folge-Phase**: Phase 2 baut Markdown-Serialisierung auf dieser Basis auf
- **Folge-Phase**: Phase 3 fügt Toolbar zu dieser Editor-Komponente hinzu

### Abhängigkeiten

- Keine externen Abhängigkeiten außer neuen npm-Paketen
- Baut auf bestehender `docs-viewer.tsx` und `use-docs.ts` auf

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Was passiert, wenn der User zwischen View und Edit wechselt?

- Der Content wird als Markdown gespeichert (`.md` Dateien)
- Beim Wechsel zu Edit: Markdown wird in TipTap-Document geladen
- Beim Wechsel zu View: TipTap-Content wird als Markdown serialisiert und im Viewer gerendert
- **Edge-Case**: Unsaved Changes → Warnung anzeigen beim Verlassen des Edit-Modus

### ✅ F2: Was passiert bei sehr großen Dokumenten?

- TipTap ist performant bis ~100KB Content
- Die bestehende Server-Route hat ein 5MB Limit → passt
- Lazy-Loading des Editor-Bundles via `React.lazy()` um Initial-Bundle nicht aufzublähen

### ✅ F3: Wie verhält sich der Editor bei `.txt` Dateien?

- `.txt` Dateien werden als Plain-Text behandelt
- Editor erkennt anhand der Dateiendung ob Markdown-Features aktiv sind
- Plain-Text: Nur Basis-Editing (kein Formatting)

### ✅ F4: Was passiert wenn zwei Browser-Tabs die gleiche Datei editieren?

- Kein Real-Time Collab in Phase 1 (Out of Scope)
- Einfacher "Last Write Wins" Ansatz
- Optional in späteren Phasen: Conflict Detection via `modifiedAt` Timestamp

### ✅ F5: Wie wird der Editor-State beim Navigieren zu einer anderen Datei behandelt?

- Unsaved Changes Warning via `beforeunload`-ähnlichem Pattern
- Dialog: "Änderungen speichern?" (Speichern / Verwerfen / Abbrechen)

---

## 📱 Konkrete Beispiele

```
🖥️ User öffnet ein Dokument → Sieht gerenderte Markdown-Ansicht (wie bisher)
✏️ User klickt "Edit" Button → Editor erscheint mit Toolbar + editierbarem Content
📝 User tippt Text, macht Überschriften, fett/kursiv
💾 User klickt "Save" oder drückt Ctrl+S → Dokument wird gespeichert
👁️ User klickt "View" → Wechselt zurück zur gerenderten Ansicht
✅ Änderungen sind persistent gespeichert!
```

---

## ⚡ Performance-Optimierung

- **Lazy Loading**: TipTap-Bundle wird per `React.lazy()` + `Suspense` geladen → Kein Impact auf Initial-Bundle
- **Debounced Save**: Content-Änderungen werden nicht bei jedem Keystroke gespeichert
- **Memoization**: `useMemo` für Editor-Extensions-Array, `useCallback` für Event-Handler
- **CSS-Variablen**: Theme nutzt bestehende CSS-Variablen aus dem Tailwind-System

---

## 🔄 Code-Wiederverwendung

| Bestehend                        | Wiederverwendung                     |
| -------------------------------- | ------------------------------------ |
| `use-docs.ts` → `updateDoc()`    | ✅ Direkt nutzen für Save            |
| `use-docs.ts` → `currentDoc`     | ✅ Content für Editor initialisieren |
| `Markdown` Component             | ✅ Weiterhin für View-Modus nutzen   |
| `docs-viewer.tsx` Header/Actions | ✅ Erweitern statt neu bauen         |
| `ScrollArea` Component           | ✅ Für Editor-Container              |
| `Button`, `Tooltip` Components   | ✅ Für Toolbar                       |
| `cn()` Utility                   | ✅ Für Styling                       |

---

## 🧩 Komponenten & Tasks

### Task 1.1: TipTap Pakete installieren

**Beschreibung**: Alle benötigten TipTap npm-Pakete installieren
**Wo**: `apps/ui/package.json`
**Was**:

- `@tiptap/react` - React-Integration
- `@tiptap/starter-kit` - Basis-Extensions (Bold, Italic, Heading, Lists, Code, etc.)
- `@tiptap/pm` - ProseMirror Kern
- `@tiptap/extension-placeholder` - Placeholder-Text
- `@tiptap/extension-underline` - Underline-Extension
- Build-Test: `npm run build` muss durchlaufen

**Geschätzte Zeilen**: 0 (nur package.json)

---

### Task 1.2: `DocsEditor` Basis-Komponente erstellen

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-editor.tsx`
**Zweck**: Hauptkomponente für den TipTap-Editor
**Was die Komponente tun soll**:

- TipTap `useEditor` Hook initialisieren mit StarterKit Extensions
- Content aus `currentDoc.content` laden
- Editierbares Textfeld rendern via `EditorContent`
- Placeholder anzeigen bei leerem Dokument
- Basic Styling passend zum bestehenden Theme (CSS-Variablen)
- `onUpdate` Callback für Content-Änderungen
- `isDirty` State (ob ungespeicherte Änderungen existieren)
- Props: `content: string`, `onSave: (content: string) => void`, `isMarkdown: boolean`

**Geschätzte Zeilen**: ~400-500

---

### Task 1.3: `useEditorState` Hook erstellen

**Neue Datei**: `apps/ui/src/hooks/use-editor.ts`
**Zweck**: State-Management für den Editor
**Was der Hook tun soll**:

- `isDirty` Flag verwalten (ungespeicherte Änderungen)
- `isSaving` Flag für Save-Loading-State
- `save()` Funktion die `updateDoc()` aus `use-docs.ts` aufruft
- `hasUnsavedChanges()` Check-Funktion
- `resetDirty()` nach erfolgreichem Save
- Auto-Track von Content-Änderungen
- Debounce-Logic Vorbereitung (für Phase 7 Auto-Save)

**Geschätzte Zeilen**: ~150-200

---

### Task 1.4: `docs-viewer.tsx` erweitern - View/Edit Toggle

**Bestehende Datei**: `apps/ui/src/components/views/agent-view/components/docs-viewer.tsx`
**Zweck**: Den bestehenden Read-Only Viewer um einen Edit-Modus erweitern
**Was geändert werden soll**:

- Neuer State: `mode: 'view' | 'edit'`
- Edit-Button im Header (Pencil Icon) → Schaltet auf Edit-Modus
- Im Edit-Modus: `DocsEditor` Komponente statt `Markdown` Komponente rendern
- Save-Button im Edit-Modus (FloppyDisk Icon)
- "Unsaved Changes" Indikator (kleiner Punkt/Badge)
- Beim Wechsel von Edit → View: Save-Prompt wenn `isDirty`
- Beim Schließen des Docs (closeDoc): Save-Prompt wenn `isDirty`
- Keyboard Shortcut: `Ctrl+E` zum Umschalten View/Edit
- Lazy Loading: `DocsEditor` via `React.lazy()` importieren

**Geschätzte Zeilen**: ~150 zusätzliche Zeilen (bestehende 292 → ~440)

---

### Task 1.5: Unsaved Changes Dialog

**Bestehende Datei**: Erweitern von `docs-viewer.tsx` oder neue Subkomponente
**Zweck**: Warnung bei ungespeicherten Änderungen
**Was die Komponente tun soll**:

- AlertDialog (shadcn/ui) mit 3 Optionen:
  - "Speichern" → Save + dann Action ausführen
  - "Verwerfen" → Änderungen verwerfen + Action ausführen
  - "Abbrechen" → Dialog schließen, im Editor bleiben
- Wird getriggert bei:
  - Wechsel von Edit → View Modus
  - Schließen des Dokuments
  - Navigieren zu anderem Dokument
  - Browser-Tab schließen (optional)

**Geschätzte Zeilen**: ~100-150

---

## 📊 Zusammenfassung Phase 1

| Task       | Komponente                    | Typ                | ~Zeilen  |
| ---------- | ----------------------------- | ------------------ | -------- |
| 1.1        | Package Installation          | Config             | 0        |
| 1.2        | `DocsEditor`                  | Neue Komponente    | ~450     |
| 1.3        | `useEditorState`              | Neuer Hook         | ~175     |
| 1.4        | `docs-viewer.tsx` Erweiterung | Modifikation       | ~150     |
| 1.5        | Unsaved Changes Dialog        | Neue Subkomponente | ~125     |
| **Gesamt** |                               |                    | **~900** |

---

## ✅ Abnahmekriterien

1. [ ] TipTap Pakete installiert, Build läuft durch
2. [ ] User kann von View in Edit-Modus wechseln
3. [ ] User kann Text im Editor tippen und formatieren (Basis: Bold, Italic, Headings)
4. [ ] User kann speichern (Ctrl+S + Button)
5. [ ] Unsaved Changes Warning funktioniert
6. [ ] Gespeicherter Content wird im View-Modus korrekt gerendert
7. [ ] `.txt` Dateien zeigen nur Plain-Text Editor
8. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 2 benötigt:

- Funktionierende `DocsEditor` Komponente
- TipTap `editor` Instanz Zugriff
- `useEditorState` Hook
