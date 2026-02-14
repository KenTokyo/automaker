# Phase 6: Navigation, Refresh & DevTools

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Navigation-Buttons (Back/Forward/Refresh) funktional machen und optional einen "Open in DevTools" / "Open in Browser" Button hinzufügen.

---

## Aktueller Stand

- Phase 3 erstellt die Toolbar mit Buttons, aber noch ohne Funktionalität
- iframe hat kein `window.history` Zugriff von außen (Same-Origin)
- Electron Preload hat `openExternalLink(url)` API

---

## Benötigte Funktionalitäten

### 1. Refresh-Button

**Was tun**: iframe neu laden.

**Implementierung**:

- iframe-Ref: `iframeRef.current.src = iframeRef.current.src` (einfacher Reload)
- Oder: `iframeRef.current.contentWindow?.location.reload()` (Same-Origin)
- Shortcut: `Ctrl+R` / `Cmd+R` wenn BrowserPanel fokussiert

### 2. Back / Forward Buttons

**Was tun**: Im iframe vor/zurück navigieren.

**Herausforderung**: Cross-Origin iframe erlaubt keinen Zugriff auf `contentWindow.history`.

**Lösung für localhost (Same-Origin)**:

```
iframeRef.current.contentWindow?.history.back()
iframeRef.current.contentWindow?.history.forward()
```

**Fallback (Cross-Origin)**:

- Buttons deaktivieren (grau)
- Tooltip: "Navigation not available for external sites"

### 3. URL-Tracking

**Was tun**: Die aktuelle URL des iframe tracken, wenn der User innerhalb des iframe navigiert.

**Same-Origin Lösung**:

```
iframeRef.current.contentWindow?.location.href
```

- Auf `load` Event des iframe die URL auslesen
- URL-Bar aktualisieren

**Cross-Origin**:

- URL-Tracking nicht möglich
- URL-Bar zeigt die zuletzt manuell eingegebene URL

### 4. "Open in Browser" Button

**Was tun**: Aktuelle URL im System-Browser (Chrome, Firefox) öffnen.

**Implementierung**:

- Electron: `window.electronAPI?.openExternalLink(url)`
- Web: `window.open(url, '_blank')`
- Icon: `ExternalLink` (Lucide)
- Position: Rechts in der Toolbar

### 5. "Open DevTools" (Nur Electron + webview)

**Was tun**: Wenn webview verwendet wird, dessen DevTools öffnen.

**Nur bei webview-Implementierung relevant**:

```
webviewRef.current.openDevTools()
```

**Bei iframe**: Nicht möglich → Button nicht zeigen

- Stattdessen "Open in Browser" als Alternative (User kann dort DevTools nutzen)

---

## Implementierungs-Schritte

### Schritt 1: iframe-Ref einrichten

- `useRef<HTMLIFrameElement>(null)` im BrowserPanel

### Schritt 2: Refresh implementieren

- Button-Click → iframe reload
- Loading-State während des Reloads

### Schritt 3: Back/Forward implementieren

- Same-Origin Check
- history.back() / history.forward()
- Graceful Fallback

### Schritt 4: URL-Tracking

- iframe `onLoad` Event
- URL auslesen + Store aktualisieren
- URL-Bar synchron halten

### Schritt 5: Open in Browser

- Preload API nutzen
- Fallback für Web-Mode

---

## Abhängigkeiten

- Phase 3 (BrowserPanel): Toolbar + iframe existieren
- Phase 1 (Store): Tab-URL Updates

---

## Risiken / Edge Cases

- Same-Origin Policy: Funktioniert nur für localhost
  - Dev-Server auf 127.0.0.1 vs. localhost → könnten als different origins gelten
  - Lösung: URL immer zu `localhost` normalisieren
- iframe security: Manche Frameworks (Next.js) setzen X-Frame-Options
  - Fehlermeldung: "This site cannot be displayed in a frame. Use 'Open in Browser'."
- Infinite Reload: Refresh-Button Debounce (min 500ms zwischen Reloads)
- URL Leaks: URL-Bar sollte keine sensiblen Query-Params anzeigen (oder doch, User's choice)
