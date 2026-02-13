ULTRATHINK

# 🎨 Phase 5: Theme System & Typography Settings

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ✅ FERTIG
> **CHAT**: CHAT 5 (~80.000 Tokens)
> **Voraussetzung**: Phase 1-4 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.800

---

## 🎯 Strategie & Ziele

### Was soll Phase 5 leisten?

Ein umfassendes Theme/Typography-System für den Docs Editor implementieren. Der User soll Font-Size, Heading-Farben, Gradients, Tabellen-Styles und allgemeine Editor-Optik anpassen können. Diese Einstellungen werden persistent gespeichert und sowohl im Editor- als auch im View-Modus angewendet.

### Verbindungen

- **Phase 1-4**: Alle Editor-Komponenten (Content, Toolbar, Tables) werden durch das Theme beeinflusst
- **Bestehend**: `app-store.ts` (Zustand) für State-Persistierung
- **Bestehend**: CSS-Variablen-System von Tailwind CSS 4
- **Bestehend**: App-Theme (Dark/Light Mode) muss kompatibel bleiben

### Abhängigkeiten

- Phase 1-4 müssen abgeschlossen sein (Editor + Toolbar + Tables)
- Zugriff auf `app-store.ts` für Settings-Persistierung
- Bestehende CSS-Variablen-Architektur verstehen

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Wo werden die Theme-Settings angezeigt?

- Ein **Settings-Popover/Drawer** im DocsViewer-Header (Gear-Icon)
- Alternativ: Eigener Tab "Appearance" im Settings-Bereich
- Das Panel ist nur sichtbar wenn ein Dokument geöffnet ist (im Editor oder View Modus)

### ✅ F2: Wie werden die Settings persistent gespeichert?

- In Zustand Store (`app-store.ts`) mit `persist` Middleware (localStorage)
- Settings sind **global** (gelten für alle Dokumente)
- Schema: `docsEditorTheme: EditorThemeSettings` im Store

### ✅ F3: Wie funktionieren Gradients für Headings?

- Jedes Heading-Level (H1-H4) kann eine eigene Farbe oder einen Gradient haben
- Gradient-Optionen: 2-Farben Linear-Gradient, Richtung wählbar
- Implementierung via `background-clip: text` + `color: transparent`
- Fallback bei deaktiviertem Gradient: Einfache Textfarbe
- Presets: Vordefinierte Gradient-Kombinationen zur schnellen Auswahl

### ✅ F4: Wie beeinflusst die Font-Size die Darstellung?

- Global-Scale: Ein Regler (z.B. 80%-150%) der die Basis-Font-Size skaliert
- Individuelle Level: H1 bis H4 jeweils eigene Font-Size einstellbar
- Body-Text: Eigene Font-Size
- Code-Blöcke: Eigene Font-Size (monospace)
- Implementierung via CSS Custom Properties auf dem Editor-Container

### ✅ F5: Was passiert mit dem bestehenden Dark/Light Mode?

- Die Theme-Settings arbeiten **zusätzlich** zum Dark/Light Mode
- Farben/Gradients passen sich automatisch an (User stellt "Heading 1 Farbe" ein, die gilt in beiden Modi)
- Optional: Separate Farbkonfiguration für Light und Dark Mode

### ✅ F6: Wie werden die Settings zwischen Editor und View synchronisiert?

- Beide Modi lesen aus dem gleichen Zustand Store
- CSS Custom Properties werden auf den gemeinsamen Parent-Container gesetzt
- Sowohl `DocsEditor` als auch `Markdown` Component erben die Styles

---

## 📱 Konkrete Beispiele

```
🖥️ User öffnet ein Dokument → Sieht die Standard-Darstellung
⚙️ User klickt Gear-Icon → Settings-Panel öffnet sich
🔤 User zieht "Font Size" Slider von 100% auf 120% → Text wird größer
🎨 User klickt "H1 Color" → Farbwähler öffnet sich → Wählt #3B82F6
🌈 User aktiviert "Gradient" für H1 → Wählt Von-/Bis-Farbe → H1 hat jetzt Gradient
📊 User ändert "Table Header Color" → Tabellen-Header wird eingefärbt
💾 Alles wird automatisch gespeichert (Zustand persist)
🔄 User öffnet anderes Dokument → Gleiche Theme-Settings gelten
```

---

## ⚡ Performance-Optimierung

- **CSS Custom Properties**: Settings → CSS Variablen → Kein Re-Render nötig für Stil-Änderungen
- **Debounced Store Updates**: Slider-Werte werden debounced gespeichert (nicht bei jedem Pixel-Move)
- **Settings-Panel**: Lazy-loaded (nicht im Initial-Bundle)
- **Farbwähler**: Leichtgewichtige Lösung (kein schweres Package wie react-color)

---

## 🔄 Code-Wiederverwendung

| Bestehend                          | Wiederverwendung                  |
| ---------------------------------- | --------------------------------- |
| `app-store.ts` (Zustand + persist) | ✅ Neuer Slice für Theme-Settings |
| `Slider` (shadcn/ui)               | ✅ Für Font-Size Regler           |
| `Popover` (shadcn/ui)              | ✅ Für Color-Picker               |
| `Select` (shadcn/ui)               | ✅ Für Dropdown-Optionen          |
| `Switch` (shadcn/ui)               | ✅ Für Toggle-Optionen            |
| `Label` (shadcn/ui)                | ✅ Für Settings-Labels            |
| `Separator` (shadcn/ui)            | ✅ Für Settings-Gruppen           |
| CSS Custom Properties (Tailwind 4) | ✅ Basis für Theme-Variablen      |
| `cn()` Utility                     | ✅ Für bedingte Klassen           |

---

## 🧩 Komponenten & Tasks

### Task 5.1: `EditorThemeSettings` Type definieren

**Bestehende Datei**: `libs/types/src/docs.ts`
**Zweck**: TypeScript-Typen für alle Theme-Einstellungen
**Was definiert werden soll**:

- `EditorThemeSettings` Interface:
  - `fontScale`: number (80-150, Default: 100)
  - `bodyFontSize`: number (14-20, Default: 16)
  - `codeFontSize`: number (12-18, Default: 14)
  - `lineHeight`: number (1.4-2.0, Default: 1.7)
  - `headingStyles`: Record<'h1'|'h2'|'h3'|'h4', HeadingStyle>
  - `tableStyles`: TableThemeStyles
  - `editorWidth`: 'narrow' | 'medium' | 'wide' | 'full'
  - `showLineNumbers`: boolean (für Source-Mode)
  - `fontFamily`: 'system' | 'serif' | 'mono' | 'inter' | 'custom'
- `HeadingStyle` Interface:
  - `color`: string (hex)
  - `gradientEnabled`: boolean
  - `gradientFrom`: string (hex)
  - `gradientTo`: string (hex)
  - `gradientDirection`: 'to-right' | 'to-bottom-right' | 'to-bottom'
  - `fontSize`: number
  - `fontWeight`: number (400-900)
- `TableThemeStyles` Interface:
  - `headerBackground`: string (hex)
  - `stripedRows`: boolean
  - `stripedColor`: string (hex)
  - `borderColor`: string (hex)
  - `cellPadding`: 'compact' | 'normal' | 'spacious'
- Default-Werte als Konstante exportieren

**Geschätzte Zeilen**: ~100

---

### Task 5.2: Theme-Settings im Store hinzufügen

**Bestehende Datei**: `apps/ui/src/store/app-store.ts`
**Zweck**: Theme-Settings als persisted State im Zustand Store
**Was angepasst werden soll**:

- Neuer State: `editorTheme: EditorThemeSettings` mit Default-Werten
- Actions:
  - `setEditorTheme(partial: Partial<EditorThemeSettings>)` → Merge-Update
  - `setHeadingStyle(level: 'h1'|'h2'|'h3'|'h4', style: Partial<HeadingStyle>)` → Pro-Heading Update
  - `setTableStyles(styles: Partial<TableThemeStyles>)` → Table-Styles Update
  - `resetEditorTheme()` → Auf Defaults zurücksetzen
- Im `persist` Block: `editorTheme` zur Whitelist hinzufügen

**Geschätzte Zeilen**: ~80 (Modifikation)

---

### Task 5.3: `useEditorTheme` Hook erstellen

**Neue Datei**: `apps/ui/src/hooks/use-editor-theme.ts`
**Zweck**: Hook der CSS Custom Properties basierend auf Theme-Settings generiert
**Was der Hook tun soll**:

- Liest `editorTheme` aus dem Store
- Generiert ein `CSSProperties`-Objekt mit Custom Properties:
  - `--docs-font-scale`
  - `--docs-body-font-size`
  - `--docs-code-font-size`
  - `--docs-line-height`
  - `--docs-h1-color`, `--docs-h1-gradient`, `--docs-h1-size`, `--docs-h1-weight`
  - ... (für H2, H3, H4 analog)
  - `--docs-table-header-bg`, `--docs-table-stripe-color`, `--docs-table-border`
  - `--docs-editor-max-width`
- Return: `{ themeStyles: CSSProperties, themeClasses: string }`
- `themeClasses` enthält bedingte Klassen (z.B. `docs-serif` wenn `fontFamily: 'serif'`)
- Memoized: Nur bei Theme-Änderungen neu berechnet

**Geschätzte Zeilen**: ~200

---

### Task 5.4: `DocsThemeSettings` Panel-Komponente erstellen

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-theme-settings.tsx`
**Zweck**: Das Settings-UI-Panel für alle Theme-Optionen
**Was die Komponente tun soll**:

- **Popover** (vom Gear-Icon im DocsViewer-Header) oder **Drawer** (von rechts)
- Sektionen mit `Separator`:
  - **Typography**:
    - "Font Scale" → Slider (80%-150%) mit Live-Preview
    - "Body Font Size" → Slider (14-20px)
    - "Code Font Size" → Slider (12-18px)
    - "Line Height" → Slider (1.4-2.0)
    - "Font Family" → Select (System, Serif, Mono, Inter)
    - "Editor Width" → Select (Narrow/Medium/Wide/Full)
  - **Headings** (für jedes Level H1-H4):
    - "Color" → Farbwähler (kleines Quadrat mit aktiver Farbe)
    - "Gradient" → Toggle Switch
    - Wenn Gradient aktiv: Von-Farbe, Bis-Farbe, Richtungs-Select
    - "Font Size" → Slider
    - "Font Weight" → Select (Normal, Medium, Semibold, Bold, Black)
    - Preset-Buttons: "Modern", "Classic", "Neon", "Minimal"
  - **Tables**:
    - "Header Background" → Farbwähler
    - "Striped Rows" → Toggle
    - "Stripe Color" → Farbwähler (wenn Striped aktiv)
    - "Cell Padding" → Select (Compact/Normal/Spacious)
  - **Actions**:
    - "Reset to Defaults" Button
    - "Export Theme" / "Import Theme" (als JSON kopieren/einfügen)
- Live-Preview: Alle Änderungen sind sofort im Editor/View sichtbar
- ScrollArea für das Panel (bei vielen Optionen)

**Geschätzte Zeilen**: ~700-800

---

### Task 5.5: CSS-Integration und Theme-Application

**Bestehende Dateien**: `docs-editor.tsx`, `docs-viewer.tsx`, `markdown.tsx`
**Zweck**: Die CSS Custom Properties im Editor und View anwenden
**Was angepasst werden soll**:

- `docs-viewer.tsx`:
  - `useEditorTheme` Hook aufrufen
  - `themeStyles` als `style` auf den Content-Container setzen
  - `themeClasses` als Klassen hinzufügen
- `docs-editor.tsx`:
  - Gleiche Theme-Integration
  - Editor-Content erbt CSS Custom Properties
- `markdown.tsx` oder View-Container:
  - Heading-Styles via CSS Custom Properties:
    ```css
    h1 {
      color: var(--docs-h1-color);
      font-size: var(--docs-h1-size);
    }
    ```
  - Gradient-Handling:
    ```css
    h1.gradient {
      background: linear-gradient(...);
      -webkit-background-clip: text;
    }
    ```
  - Table-Styles analog
- Neue CSS-Datei oder Tailwind-Plugin für Theme-Variablen
- Dark/Light Mode Kompatibilität sicherstellen

**Geschätzte Zeilen**: ~300 (Modifikation + neue CSS)

---

## 📊 Zusammenfassung Phase 5

| Task       | Komponente                  | Typ             | ~Zeilen    |
| ---------- | --------------------------- | --------------- | ---------- |
| 5.1        | `EditorThemeSettings` Types | Types           | ~100       |
| 5.2        | Store Integration           | Modifikation    | ~80        |
| 5.3        | `useEditorTheme` Hook       | Neuer Hook      | ~200       |
| 5.4        | `DocsThemeSettings` Panel   | Neue Komponente | ~750       |
| 5.5        | CSS-Integration             | Modifikation    | ~300       |
| **Gesamt** |                             |                 | **~1.430** |

---

## ✅ Abnahmekriterien

1. [ ] Settings-Panel öffnet sich über Gear-Icon im Viewer-Header
2. [ ] Font-Size lässt sich per Slider anpassen (Live-Preview)
3. [ ] Heading-Farben lassen sich individuell einstellen (H1-H4)
4. [ ] Gradients funktionieren für Headings (Linear-Gradient mit 2 Farben)
5. [ ] Font-Family kann gewechselt werden (System, Serif, Mono, Inter)
6. [ ] Tabellen-Styles (Header-Farbe, Stripes) sind anpassbar
7. [ ] Settings werden persistent gespeichert (localStorage via Zustand)
8. [ ] Settings gelten global für alle Dokumente
9. [ ] Dark/Light Mode bleibt kompatibel
10. [ ] "Reset to Defaults" setzt alles zurück
11. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 6 benötigt:

- Funktionierende Editor-Instanz mit Theme
- Zugriff auf den Theme-Store für AI-Features
- CSS Custom Properties Infrastruktur
