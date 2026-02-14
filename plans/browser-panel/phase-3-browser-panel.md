# Phase 3: BrowserPanel Komponente

ULTRATHINK

## Status: ⬜ Offen

## Ziel

Die Hauptkomponente `BrowserPanel` erstellen, die eine URL-Bar + iframe-Content zeigt. Dies ist das Herzstück des Features.

---

## Aktueller Stand

- Kein BrowserPanel existiert aktuell
- Ähnliche Panel-Komponenten: `DocsPanel`, `DocsViewer` als Referenz
- ResizablePanel-Pattern ist etabliert

---

## Benötigte Komponenten

### 1. `BrowserPanel` (Hauptkomponente)

**Datei**: `apps/ui/src/components/views/agent-view/components/browser-panel.tsx`

**Layout**:

```
┌──────────────────────────────────┐
│ [◀] [▶] [🔄] [ URL Bar    ] [⚙] │  ← Toolbar
├──────────────────────────────────┤
│                                  │
│       iframe / webview           │  ← Content
│       (volle Höhe)               │
│                                  │
├──────────────────────────────────┤
│ Status: Connected | Port: 3000   │  ← Optional Status Bar
└──────────────────────────────────┘
```

**Props**:

```
BrowserPanelProps {
  projectPath: string
}
```

**Was sie tun soll**:

- URL-Bar mit Eingabefeld (editierbar)
- Navigation-Buttons: Back, Forward, Refresh
- iframe das die URL lädt
- Loading-State: Spinner solange iframe lädt
- Error-State: Wenn localhost nicht erreichbar ist
- Verbindung zu Store: Liest/schreibt Browser-Tabs aus app-store

### 2. `BrowserToolbar` (Sub-Komponente)

**Teil von**: `browser-panel.tsx` (oder eigene Datei)

**Elemente**:

- Back-Button (◀): `window.history.back()` im iframe simulieren
- Forward-Button (▶): `window.history.forward()` im iframe simulieren
- Refresh-Button (🔄): iframe neu laden
- URL-Input: Text-Input mit der aktuellen URL
  - Enter drückt → URL navigieren
  - Auto-Completions für `localhost:` Ports
- Settings-Button (⚙): Port konfigurieren / Einstellungen

**Styling**:

- Höhe: `h-10` (kompakt wie ein Browser-Tab)
- Hintergrund: `bg-card border-b`
- Icons: Lucide Icons (ArrowLeft, ArrowRight, RefreshCw, Globe, Settings)

### 3. `BrowserContent` (iframe-Wrapper)

**Teil von**: `browser-panel.tsx`

**Was sie tun soll**:

- iframe rendern mit `src={url}`
- `sandbox` Attribut setzen für Sicherheit:
  - `allow-scripts allow-same-origin allow-forms allow-popups`
- `onLoad` Handler: Loading-State beenden
- `onError` Handler: Error-State zeigen
- iframe-Ref speichern für Navigation/Refresh

**Loading State**:

- Spinner-Overlay über dem iframe
- Text: "Connecting to localhost:PORT..."

**Error State**:

- Fehlermeldung: "Could not connect to PORT"
- Retry-Button

**Leerer State (kein Tab/URL)**:

- Zentrierte Anzeige: "Enter a URL or port to preview"
- Quick-Port-Input: Eingabefeld für Portnummer
- Beliebte Ports als Quick-Buttons: 3000, 3001, 5173, 8080

---

## iframe Besonderheiten

### Kommunikation

- iframe auf `localhost:PORT` hat Same-Origin mit dem Dev-Server
- Kein `postMessage` nötig für einfachen Preview
- Navigation innerhalb des iframe ist frei

### Sandbox-Attribute

```
sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
```

- `allow-scripts`: JavaScript im iframe erlauben
- `allow-same-origin`: Cookies/Storage des Dev-Servers erlauben
- `allow-forms`: Formular-Submissions erlauben
- `allow-popups`: Neue Fenster (z.B. OAuth-Flows)

### URL-Konstruktion

- Eingabe: `3000` → `http://localhost:3000`
- Eingabe: `localhost:3000` → `http://localhost:3000`
- Eingabe: `http://localhost:3000/page` → direkt verwenden
- Eingabe: `https://...` → direkt verwenden (extern)

---

## Implementierungs-Schritte

### Schritt 1: Datei erstellen

- `apps/ui/src/components/views/agent-view/components/browser-panel.tsx`

### Schritt 2: BrowserToolbar bauen

- URL-Input + Navigation-Buttons
- Event-Handler für URL-Änderung

### Schritt 3: iframe-Wrapper mit States

- Loading, Error, Empty States
- iframe mit sandbox + ref

### Schritt 4: Store-Anbindung

- Aktiven Tab aus Store lesen
- URL-Änderungen in Store schreiben

### Schritt 5: Export in components/index.ts

---

## Abhängigkeiten

- Phase 1 (Store Types): Braucht `BrowserTab` Type + Store-Actions
- Phase 2 (webview): Optional, betrifft nur die Rendering-Methode

---

## Risiken / Edge Cases

- iframe-Blockierung: Manche Dev-Server setzen X-Frame-Options → Fehlermeldung zeigen
- CORS: localhost iframes auf gleichen Host sind kein Problem
- HMR/WebSocket: Vite HMR sollte im iframe funktionieren (same origin)
- Resize: iframe muss auf Panel-Resize reagieren (width: 100%, height: 100%)
- Performance: Nur den aktiven Tab laden, inaktive Tabs entladen (oder keepalive)
