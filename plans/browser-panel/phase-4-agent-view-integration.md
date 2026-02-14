# Phase 4: AgentView ResizablePanel Integration

ULTRATHINK

## Status: ⬜ Offen

## Ziel

Den BrowserPanel als drittes ResizablePanel in die AgentView integrieren. Das Layout wird: Sessions | Chat | Browser.

---

## Aktueller Stand

### agent-view.tsx Layout (Desktop)

```
ResizablePanelGroup (horizontal, autoSaveId="agent-view-sidebar")
├── ResizablePanel (25%, min 15, max 40) → SessionManager
├── ResizableHandle (withHandle)
└── ResizablePanel (75%) → Chat Area (Header + Messages + Input)
```

### Relevante Zeilen

- Zeile 307-399: Desktop ResizablePanelGroup
- Zeile 306: `isDesktop` Check
- Zeile 282-465: Gesamtes Return-JSX

---

## Benötigte Änderungen

### 1. `agent-view.tsx` - Drittes Panel hinzufügen

**Was tun**: Nach dem Chat-Area-Panel ein weiteres ResizablePanel + Handle einfügen.

**Neues Layout**:

```
ResizablePanelGroup (horizontal, autoSaveId="agent-view-layout")
├── ResizablePanel (20%, min 15, max 35) → SessionManager    [wenn showSessionManager]
├── ResizableHandle
├── ResizablePanel (auto)               → Chat Area
├── ResizableHandle                                           [wenn browserPanelOpen]
└── ResizablePanel (35%, min 20, max 50) → BrowserPanel       [wenn browserPanelOpen]
```

**autoSaveId**: Muss geändert werden von `"agent-view-sidebar"` zu `"agent-view-layout"`, da sich die Panel-Konfiguration ändert. Oder: bedingt verschiedene IDs verwenden.

### 2. `agent-view.tsx` - State aus Store lesen

**Was tun**: Neue Store-Felder für Browser-Panel einbinden.

```
const browserPanelOpen = useAppStore(s => s.browserPanelOpen)
```

Nicht viel mehr nötig in agent-view.tsx, da BrowserPanel selbst seinen State aus dem Store liest.

### 3. `agent-view.tsx` - Import BrowserPanel

**Was tun**: BrowserPanel importieren und in den components/index.ts exportieren.

### 4. Panel-Größen anpassen

**Was tun**: Die `defaultSize` Werte müssen dynamisch sein, abhängig davon welche Panels sichtbar sind.

**Szenarien**:

```
Sessions + Chat + Browser:  20 | 45 | 35
Sessions + Chat:            25 | 75
Chat + Browser:             60 | 40
Chat only:                  100
```

**Umsetzung**: `defaultSize` Berechnung als Funktion:

```
getChatPanelDefaultSize(showSessions, showBrowser):
  wenn beides: 45
  wenn nur sessions: 75
  wenn nur browser: 60
  sonst: 100
```

### 5. Mobile Layout

**Was tun**: Auf Mobile (< 1024px) den BrowserPanel NICHT anzeigen.

- Browser-Panel nur auf Desktop
- Oder: Als Overlay/Modal auf Mobile (spätere Phase)

---

## Implementierungs-Schritte

### Schritt 1: BrowserPanel importieren

- In agent-view.tsx importieren
- In components/index.ts exportieren (falls nötig)

### Schritt 2: Store-State einbinden

- `browserPanelOpen` aus Store lesen
- `currentProject?.path` an BrowserPanel weitergeben

### Schritt 3: ResizablePanelGroup erweitern

- Drittes Panel + Handle nach Chat-Area einfügen
- Bedingtes Rendering basierend auf `browserPanelOpen`

### Schritt 4: Panel-Größen berechnen

- Helper-Funktion für dynamische defaultSize
- Testen: alle 4 Kombinationen

### Schritt 5: autoSaveId anpassen

- Neuen autoSaveId für die 3-Panel-Konfiguration
- Alte Werte im localStorage bleiben bestehen (kein Conflict)

---

## Abhängigkeiten

- Phase 1 (Store): `browserPanelOpen` muss existieren
- Phase 3 (BrowserPanel): Komponente muss existieren

---

## Risiken / Edge Cases

- ResizablePanel mit bedingtem Rendering: Kann Layout-Jumps verursachen
  - Lösung: Transition-Animation beim Ein-/Ausblenden
- autoSaveId: Wenn sich die Anzahl der Panels ändert, werden gespeicherte Größen ungültig
  - Lösung: Verschiedene autoSaveId pro Konfiguration ODER nur ein stabiles Layout
- Panel-Minimum: Wenn alle 3 Panels offen sind, muss genug Platz sein
  - Minimum Viewport: 15 + 30 + 20 = 65% → 35% Rest → sollte passen
