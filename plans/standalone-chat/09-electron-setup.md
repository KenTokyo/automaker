# Phase 9: Electron Main Process & Preload (Chat App)

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 5
**Geschaetzte Tokens:** ~70.000
**Abhaengigkeiten:** Phase 1-6 (apps/chat/ Grundgeruest muss stehen)
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Eigene Electron-Konfiguration fuer die Standalone Chat-App erstellen. Die Chat-App soll sowohl im Web-Modus (mit HMR/Live-Update via `npm run dev:chat`) als auch im Electron-Modus (ohne Live-Update, Desktop-Fenster via `npm run dev:electron:chat`) laufen koennen.

**Kernprinzip:** Vereinfachte Version des Automaker-UI Electron-Setups. Kein Kanban, kein Terminal, kein Worktree-Management - nur Chat-relevante Features.

---

## Architektur-Uebersicht

```
apps/chat/
  src/
    electron/
      index.ts              # Re-Exports (analog zu apps/ui/src/electron/index.ts)
      constants.ts           # Window-Groessen, Ports, Dateinamen
      state.ts               # Shared State Container
      main-entry.ts          # Electron Main Process Entry Point
      ipc/
        index.ts             # registerAllHandlers()
        channels.ts          # IPC_CHANNELS (nur Chat-relevante)
        dialog-handlers.ts   # Datei-Dialoge (Bild-Upload)
        shell-handlers.ts    # Externe Links oeffnen
        app-handlers.ts      # App-Info (Version, Paths, Quit)
        auth-handlers.ts     # API-Key Management
        server-handlers.ts   # Server-URL
      windows/
        main-window.ts       # BrowserWindow erstellen (vereinfacht)
        window-bounds.ts     # Fenster-Position speichern/laden
      server/
        backend-server.ts    # Express-Server starten (AUTOMAKER_MODE=chat)
        static-server.ts     # Statische Dateien in Production
      security/
        api-key-manager.ts   # API-Key generieren/laden
      utils/
        port-manager.ts      # Freie Ports finden
        icon-manager.ts      # App-Icon laden
    preload.ts               # Preload Script (vereinfacht, nur Chat-APIs)
```

---

## Tasks

### Task 9.1: Constants & State

**Datei:** `apps/chat/src/electron/constants.ts`

Vereinfachte Konstanten fuer die Chat-App:

- `MIN_WIDTH` = 500 (schmaler als Automaker, kein Kanban)
- `MIN_HEIGHT` = 400
- `DEFAULT_WIDTH` = 1100 (Chat + BrowserPanel braucht weniger Platz)
- `DEFAULT_HEIGHT` = 800
- `DEFAULT_SERVER_PORT` = 3008 (shared mit Automaker)
- `DEFAULT_STATIC_PORT` = 3009 (Chat-eigener Port)
- `API_KEY_FILENAME` = '.chat-api-key' (separater Key, damit Automaker und Chat parallel laufen koennen)
- `WINDOW_BOUNDS_FILENAME` = 'chat-window-bounds.json'

**Datei:** `apps/chat/src/electron/state.ts`

State Container (analog zu UI, aber ohne `staticServer` optional):

- `mainWindow: BrowserWindow | null`
- `serverProcess: ChildProcess | null`
- `staticServer: Server | null`
- `serverPort: number`
- `staticPort: number`
- `apiKey: string | null`

---

### Task 9.2: Port Manager & Icon Manager

**Datei:** `apps/chat/src/electron/utils/port-manager.ts`

- `isPortAvailable(port)` - Prueft ob Port frei
- `findAvailablePort(startPort)` - Findet naechsten freien Port
- Kann 1:1 von `apps/ui/src/electron/utils/port-manager.ts` kopiert werden

**Datei:** `apps/chat/src/electron/utils/icon-manager.ts`

- `getIconPath()` - Gibt Pfad zum App-Icon zurueck
- Nutzt eigenes Icon (z.B. `apps/chat/public/icon.png` oder shared icon)
- Plattform-spezifisch: `.ico` fuer Windows, `.png` fuer Linux/macOS

---

### Task 9.3: API-Key Manager (Security)

**Datei:** `apps/chat/src/electron/security/api-key-manager.ts`

- `ensureApiKey()` - Generiert oder laedt API-Key
- `getApiKey()` - Gibt aktuellen Key zurueck
- Speichert in `userData/.chat-api-key` (separater Dateiname!)
- Analog zu `apps/ui/src/electron/security/api-key-manager.ts`

**Wichtig:** Separater API-Key-Dateiname, damit Automaker-Electron und Chat-Electron parallel laufen koennen ohne Konflikte.

---

### Task 9.4: Window Management

**Datei:** `apps/chat/src/electron/windows/window-bounds.ts`

- `loadWindowBounds()` - Laedt gespeicherte Fenster-Position
- `saveWindowBounds(bounds)` - Speichert Fenster-Position
- `validateBounds(bounds)` - Validiert gegen aktuelle Bildschirm-Groesse
- `scheduleSaveWindowBounds()` - Debounced Save (analog zu UI)
- Speichert in `userData/chat-window-bounds.json`

**Datei:** `apps/chat/src/electron/windows/main-window.ts`

- `createWindow()` - Erstellt BrowserWindow
- Verwendet `MIN_WIDTH`, `DEFAULT_WIDTH` etc. aus constants
- Preload: `path.join(__dirname, 'preload.js')`
- Laedt Vite Dev Server URL oder Static Server URL
- **Kein** `titleBarStyle: 'hiddenInset'` auf macOS (einfacher Look)
- `backgroundColor: '#0a0a0a'` (dark default)

---

### Task 9.5: Backend Server Management

**Datei:** `apps/chat/src/electron/server/backend-server.ts`

- `startServer()` - Startet Express-Server mit `AUTOMAKER_MODE=chat`
- `waitForServer(maxAttempts)` - Wartet auf Health-Check
- `stopServer()` - Beendet Server-Prozess
- **Wichtiger Unterschied zu UI:** Setzt `AUTOMAKER_MODE=chat` als Env-Variable
- Pfad zu Server: `path.join(__dirname, '../../server/src/index.ts')` (dev)
- tsx watch fuer Development, direkt node fuer Production
- Verwendet `@automaker/platform` fuer `findNodeExecutable`, `buildEnhancedPath`

**Datei:** `apps/chat/src/electron/server/static-server.ts`

- `startStaticServer()` - Serviert `apps/chat/dist/` in Production
- `stopStaticServer()` - Beendet Static Server
- Nur in Production (wenn `app.isPackaged`)

---

### Task 9.6: IPC Channels & Handlers

**Datei:** `apps/chat/src/electron/ipc/channels.ts`

Vereinfachte IPC-Channels (nur Chat-relevante):

```
IPC_CHANNELS = {
  PING: 'ping',
  AUTH: {
    GET_API_KEY: 'auth:get-api-key',
  },
  SERVER: {
    GET_URL: 'server:get-url',
  },
  DIALOG: {
    OPEN_FILE: 'dialog:open-file',       // Bild-Attachment
    OPEN_DIRECTORY: 'dialog:open-directory', // Projekt-Auswahl
  },
  SHELL: {
    OPEN_EXTERNAL: 'shell:open-external', // Links oeffnen
  },
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PATH: 'app:get-path',
    IS_PACKAGED: 'app:is-packaged',
    QUIT: 'app:quit',
  },
}
```

**NICHT enthalten** (gegenueber UI):

- `WINDOW.UPDATE_MIN_WIDTH` (keine Sidebar)
- `DIALOG.SAVE_FILE` (nicht noetig fuer Chat)
- `SHELL.OPEN_PATH` (nicht noetig)
- `SHELL.OPEN_IN_EDITOR` (nicht noetig)

**Handler-Dateien:**

- `dialog-handlers.ts` - `OPEN_FILE` (fuer Bild-Uploads), `OPEN_DIRECTORY` (Projekt-Pfad)
- `shell-handlers.ts` - `OPEN_EXTERNAL` (externe Links im Browser oeffnen)
- `app-handlers.ts` - Version, Paths, Packaged-Status, Quit
- `auth-handlers.ts` - API-Key abfragen
- `server-handlers.ts` - Server-URL zurueckgeben

**Datei:** `apps/chat/src/electron/ipc/index.ts`

- `registerAllHandlers()` - Registriert alle Handler auf einmal

---

### Task 9.7: Preload Script

**Datei:** `apps/chat/src/preload.ts`

Vereinfachtes Preload-Script, das nur Chat-relevante APIs exponiert:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Connection
  ping: () => ipcRenderer.invoke('ping'),

  // Server URL
  getServerUrl: () => ipcRenderer.invoke('server:get-url'),

  // API Key
  getApiKey: () => ipcRenderer.invoke('auth:get-api-key'),

  // Dialogs
  openFile: (options?) => ipcRenderer.invoke('dialog:open-file', options),
  openDirectory: () => ipcRenderer.invoke('dialog:open-directory'),

  // Shell
  openExternalLink: (url) => ipcRenderer.invoke('shell:open-external', url),

  // App
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPath: (name) => ipcRenderer.invoke('app:get-path', name),
  isPackaged: () => ipcRenderer.invoke('app:is-packaged'),
  quit: () => ipcRenderer.invoke('app:quit'),
});
```

**NICHT exponiert** (gegenueber UI preload):

- `openPath`, `openInEditor` (nicht noetig)
- `saveFile` (nicht noetig)
- `updateMinWidth` (keine Sidebar)

---

### Task 9.8: Main Entry Point

**Datei:** `apps/chat/src/electron/main-entry.ts`

Haupteinstiegspunkt fuer den Electron Main Process (analog zu `apps/ui/src/main.ts` aber vereinfacht):

- `app.whenReady()` Handler:
  1. `setElectronUserDataPath()` (aus `@automaker/platform`)
  2. `setElectronAppPaths()` (aus `@automaker/platform`)
  3. `initAllowedPaths()` (aus `@automaker/platform`)
  4. `ensureApiKey()` (CSRF-Schutz)
  5. `findAvailablePort(3008)` fuer Server
  6. `findAvailablePort(3009)` fuer Static
  7. `startStaticServer()` (nur Production)
  8. `startServer()` (mit AUTOMAKER_MODE=chat)
  9. `createWindow()`
- `window-all-closed` Handler: Server stoppen + `app.quit()`
- `before-quit` Handler: Server stoppen

**Unterschiede zu UI main.ts:**

- Kein `SKIP_EMBEDDED_SERVER` / Docker-Modus
- Kein macOS Dock-Icon Handling
- `AUTOMAKER_MODE=chat` immer gesetzt beim Server-Start
- Einfacherer Error-Dialog

---

### Task 9.9: Vite-Config Electron Entry

Die `apps/chat/vite.config.ts` muss den Entry-Point fuer `vite-plugin-electron` korrekt setzen:

- `main.entry` zeigt auf `src/electron/main-entry.ts` (NICHT `src/main.ts` wie bei UI!)
- Damit Vite weiss: "Das ist der Electron Main Process"

**Hinweis:** Die eigentliche Vite-Config-Aenderung kommt in Phase 10.

---

## Abhaengigkeiten zu bestehenden Packages

Diese `@automaker/*` Packages werden im Electron Main Process benoetigt:

- `@automaker/platform` - Path-Security, findNodeExecutable, buildEnhancedPath
- `@automaker/utils` - createLogger

Diese muessen in `apps/chat/package.json` als Dependencies stehen (ggf. ergaenzen).

---

## Reuse-Strategie

| Modul                | Strategie                   | Begruendung                              |
| -------------------- | --------------------------- | ---------------------------------------- |
| `port-manager.ts`    | Kopieren                    | Identische Logik, keine Anpassung noetig |
| `icon-manager.ts`    | Kopieren + anpassen         | Anderer Icon-Pfad                        |
| `api-key-manager.ts` | Kopieren + anpassen         | Anderer Dateiname                        |
| `window-bounds.ts`   | Kopieren + anpassen         | Anderer Dateiname                        |
| `main-window.ts`     | Kopieren + vereinfachen     | Kleinere Defaults, kein macOS titleBar   |
| `backend-server.ts`  | Kopieren + anpassen         | AUTOMAKER_MODE=chat                      |
| `static-server.ts`   | Kopieren + anpassen         | Anderer dist-Pfad                        |
| `IPC handlers`       | Neu schreiben (vereinfacht) | Nur Subset der UI-Handler                |
| `preload.ts`         | Neu schreiben (vereinfacht) | Nur Chat-relevante APIs                  |
| `main-entry.ts`      | Neu schreiben (vereinfacht) | Kein Docker, kein Dock-Icon              |

---

## Verifikation

- [ ] `apps/chat/src/electron/` Verzeichnisstruktur erstellt
- [ ] Alle TypeScript-Dateien kompilieren ohne Fehler
- [ ] Electron Main Process kann gestartet werden
- [ ] Preload Script exponiert nur Chat-relevante APIs
- [ ] Server startet mit AUTOMAKER_MODE=chat
- [ ] Window erscheint mit korrekter Groesse
- [ ] IPC-Kommunikation funktioniert (ping, getServerUrl, getApiKey)
- [ ] Fenster-Bounds werden gespeichert/wiederhergestellt
- [ ] API-Key wird korrekt generiert/geladen (separater Key-File)

---

## Hinweise

- **Kein `npm run build` oder `npm run dev` ausfuehren!** Nur TypeScript-Fehler pruefen.
- Maximal 700 Zeilen pro Datei (AGENTS.md Regel)
- Imports: Immer `@automaker/*` Packages nutzen, nie relative Pfade zu `apps/ui/`
