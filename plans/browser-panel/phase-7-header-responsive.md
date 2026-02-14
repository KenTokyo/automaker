# Phase 7: Header Toggle & Responsive Design

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Einen Toggle-Button im AgentHeader einbauen, mit dem der Browser-Panel ein-/ausgeblendet werden kann. Responsive-Verhalten auf verschiedenen Bildschirmgrößen sicherstellen.

---

## Aktueller Stand

### AgentHeader (`agent-header.tsx`)

- Hat bereits: Projekt-Selektor, Session-Info, Connection-Status, Clear-Chat-Button
- Session-Manager Toggle existiert bereits als Referenz-Muster

### Responsive

- `< 1024px`: Mobile Layout (Session Manager als Overlay)
- `>= 1024px`: Desktop Layout (ResizablePanelGroup)

---

## Benötigte Änderungen

### 1. `agent-header.tsx` - Browser-Toggle Button

**Was tun**: Einen Button hinzufügen, der den Browser-Panel toggled.

**Button-Details**:

- Icon: `Globe` oder `Monitor` oder `PanelRight` (Lucide)
- Position: Rechts in der Header-Leiste, neben dem Clear-Chat-Button
- Tooltip: "Toggle Browser Preview" / "Open Browser Panel"
- Active-State: Hervorgehoben wenn `browserPanelOpen === true`
- Click: `toggleBrowserPanel()` aus Store

**Visuelle Unterscheidung**:

- Panel offen: Icon primärfarben, subtiler Hintergrund
- Panel geschlossen: Icon muted

### 2. `agent-view.tsx` - Toggle-Handler weiterreichen

**Was tun**: Den Toggle als Prop an AgentHeader weiterreichen.

**Props für AgentHeader erweitern**:

```
browserPanelOpen: boolean
onToggleBrowserPanel: () => void
```

Alternativ: AgentHeader liest direkt aus dem Store (einfacher, weniger Prop-Drilling).

**Empfehlung**: Direkt aus Store lesen (wie bei `docsOpen`).

### 3. Keyboard Shortcut

**Was tun**: Einen Shortcut für den Browser-Toggle einrichten.

**Vorschlag**: `Ctrl+Shift+B` / `Cmd+Shift+B`

- Passt zu "Browser"
- Kollidiert nicht mit gängigen Shortcuts

**Integration**: In `useAgentShortcuts` Hook oder direkt als globaler Event-Listener.

### 4. Responsive Verhalten

**Mobile (< 1024px)**:

- Browser-Panel NICHT anzeigen
- Toggle-Button zeigt ein Modal/Sheet statt eines Panels
- Oder: Toggle-Button ist auf Mobile versteckt

**Tablet (1024-1440px)**:

- Browser-Panel möglich, aber nur wenn Session-Manager geschlossen
- Auto-Close Session-Manager wenn Browser geöffnet wird

**Desktop (> 1440px)**:

- Alle drei Panels gleichzeitig möglich
- Volles 3-Panel-Layout

**Logik**:

```
Wenn viewport < 1024:
  → Kein Browser-Panel (nur in Modal)
Wenn viewport 1024-1440:
  → Browser-Panel ODER Session-Manager, nicht beides
  → Auto-Toggle: Browser öffnen → Sessions schließen
Wenn viewport > 1440:
  → Alle drei gleichzeitig möglich
```

### 5. Panel-Collapse Animation (Nice-to-have)

**Was tun**: Sanfte Animation beim Ein-/Ausblenden des Browser-Panels.

- ResizablePanel unterstützt `collapsible` + `collapsedSize` Props
- Alternativ: CSS transition auf dem Panel-Container
- `onCollapse` / `onExpand` Callbacks

---

## Implementierungs-Schritte

### Schritt 1: Toggle-Button in AgentHeader

- Import Store, Button rendern
- Active/Inactive Styling

### Schritt 2: Responsive Breakpoints

- Viewport-Listener erweitern (bereits in agent-view.tsx vorhanden)
- Logik für Auto-Toggle bei mittleren Viewports

### Schritt 3: Keyboard Shortcut

- In useAgentShortcuts Hook einfügen
- Oder globaler Listener

### Schritt 4: Testen

- Desktop: 3-Panel-Layout
- Tablet: 2-Panel-Layout (auto-switch)
- Mobile: Kein Panel / Modal

---

## Abhängigkeiten

- Phase 1 (Store): `browserPanelOpen` + `toggleBrowserPanel`
- Phase 4 (Integration): ResizablePanel muss funktionieren

---

## Risiken / Edge Cases

- Viewport-Resize während Panels offen: Muss graceful reagieren
- Persistierter State: User schließt Browser-Panel → öffnet App auf Mobile → Panel bleibt zu (korrekt)
- Shortcuts: Könnte mit Browser-eigenen Shortcuts kollidieren (Ctrl+Shift+B = Bookmarks in Chrome)
  - In Electron kein Problem (eigene Shortcuts)
  - In Web-Mode: Alternative nutzen
