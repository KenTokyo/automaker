# Phase 10: Vite Config, Build Scripts & Electron Integration

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 5
**Geschaetzte Tokens:** ~50.000
**Abhaengigkeiten:** Phase 9 (Electron Main Process muss stehen)
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Die Vite-Konfiguration der Chat-App um Electron-Support erweitern, Build-Scripts erstellen, und alles in die Root-Level Scripts integrieren. Am Ende soll `npm run dev:electron:chat` die Chat-App als Desktop-Fenster starten.

---

## Tasks

### Task 10.1: Electron Dependencies in package.json

**Datei:** `apps/chat/package.json`

Neue Dependencies hinzufuegen:

```json
{
  "main": "dist-electron/main.js",
  "dependencies": {
    "@automaker/platform": "1.0.0"
    // ... bestehende deps
  },
  "devDependencies": {
    "electron": "39.2.7",
    "electron-builder": "26.0.12",
    "vite-plugin-electron": "0.29.0",
    "vite-plugin-electron-renderer": "0.14.6",
    "cross-env": "10.1.0",
    "dotenv": "17.2.3"
    // ... bestehende devDeps
  }
}
```

**Hinweis:** Versionen muessen mit `apps/ui/package.json` uebereinstimmen fuer Kompatibilitaet.

---

### Task 10.2: Vite Config Electron-Support

**Datei:** `apps/chat/vite.config.ts`

Erweitern um `vite-plugin-electron`:

Grundstruktur:

- Import `electron` from `vite-plugin-electron/simple`
- Env-Check: `VITE_SKIP_ELECTRON` fuer reinen Web-Modus
- Wenn Electron aktiv:
  - `main.entry`: `'src/electron/main-entry.ts'`
  - `main.vite.build.outDir`: `'dist-electron'`
  - `main.vite.build.rollupOptions.external`: `['electron']`
  - `preload.input`: `'src/preload.ts'`
  - `preload.vite.build.outDir`: `'dist-electron'`
  - `preload.vite.build.rollupOptions.external`: `['electron']`

Die bestehende Config bleibt erhalten (aliases, server proxy, etc.).

**Wichtig:** Der `server.port` bleibt 3009 (CHAT_PORT). Der Electron-Modus nutzt denselben Vite Dev Server, aber zeigt ihn in einem BrowserWindow statt im Browser an.

**Zwei Modi:**

1. `VITE_SKIP_ELECTRON=true` -> Reiner Web-Modus (kein Electron Plugin geladen)
2. Default -> Electron-Modus (Plugin aktiv, Electron startet automatisch)

---

### Task 10.3: Chat-App package.json Scripts

**Datei:** `apps/chat/package.json` - Scripts-Sektion erweitern:

```json
{
  "scripts": {
    "dev": "cross-env VITE_SKIP_ELECTRON=true vite",
    "dev:electron": "vite",
    "dev:electron:debug": "cross-env OPEN_DEVTOOLS=true vite",
    "build": "vite build",
    "build:electron": "vite build && electron-builder",
    "build:electron:dir": "vite build && electron-builder --dir",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

**Erklaerung:**

- `dev` = Web-Modus (VITE_SKIP_ELECTRON=true, kein Electron)
- `dev:electron` = Electron-Modus (Electron startet, laedt Vite Dev Server)
- `dev:electron:debug` = Electron + DevTools automatisch offen
- `build:electron` = Production Build + Electron-Builder Package

---

### Task 10.4: electron-builder Konfiguration

**Datei:** `apps/chat/package.json` - `build` Sektion:

```json
{
  "build": {
    "appId": "com.automaker.chat",
    "productName": "UniAI Chat",
    "artifactName": "${productName}-${version}-${arch}.${ext}",
    "npmRebuild": false,
    "publish": null,
    "directories": {
      "output": "release"
    },
    "files": ["dist/**/*", "dist-electron/**/*", "public/**/*", "!node_modules/**/*"],
    "extraResources": [
      {
        "from": "server-bundle/dist",
        "to": "server"
      },
      {
        "from": "server-bundle/node_modules",
        "to": "server/node_modules"
      },
      {
        "from": "server-bundle/libs",
        "to": "server/libs"
      },
      {
        "from": "server-bundle/package.json",
        "to": "server/package.json"
      }
    ],
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "public/icon.ico"
    },
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": [
        { "target": "dmg", "arch": ["x64", "arm64"] },
        { "target": "zip", "arch": ["x64", "arm64"] }
      ],
      "icon": "public/icon.png"
    },
    "linux": {
      "target": [{ "target": "AppImage", "arch": ["x64"] }],
      "category": "Development",
      "icon": "public/icon.png",
      "executableName": "uniai-chat"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

**Unterschiede zu Automaker UI electron-builder:**

- `appId`: `com.automaker.chat` (statt `com.automaker.app`)
- `productName`: `UniAI Chat` (statt `Automaker`)
- `executableName`: `uniai-chat` (statt `automaker`)
- Eigene Icons (muessen erstellt oder von Automaker kopiert werden)

---

### Task 10.5: Root-Level Scripts

**Datei:** Root `package.json` - Neue Scripts:

```json
{
  "_dev:electron:chat": "npm run dev:electron --workspace=apps/chat",
  "_dev:electron:chat:debug": "npm run dev:electron:debug --workspace=apps/chat",
  "dev:electron:chat": "npm run build:packages && npm run _dev:electron:chat",
  "dev:electron:chat:debug": "npm run build:packages && npm run _dev:electron:chat:debug",
  "build:electron:chat": "npm run build:packages && npm run build:electron --workspace=apps/chat",
  "build:electron:chat:dir": "npm run build:packages && npm run build:electron:dir --workspace=apps/chat"
}
```

**Ergebnis: 4 Startmodi fuer die Chat-App:**

| Befehl                            | Modus               | Live-Update | Desktop-Fenster |
| --------------------------------- | ------------------- | ----------- | --------------- |
| `npm run dev:chat`                | Web + Server        | Ja (HMR)    | Nein (Browser)  |
| `npm run dev:electron:chat`       | Electron + Server   | Nein\*      | Ja              |
| `npm run dev:electron:chat:debug` | Electron + DevTools | Nein\*      | Ja              |
| `npm run build:electron:chat`     | Production Build    | -           | Installer       |

\*Electron laedt den Vite Dev Server, also gibt es technisch HMR. Aber der Hauptzweck ist Desktop-Testing ohne Browser.

---

### Task 10.6: start-automaker.mjs Erweitern (Optional)

**Datei:** `start-automaker.mjs`

Neue Optionen im interaktiven Launcher:

```
Choose mode:
  [1] Web Browser Mode       (localhost:3007)
  [2] Desktop App             (Electron)
  [3] Chat Web Mode          (localhost:3009)
  [4] Chat Desktop App        (Electron Chat)    <-- NEU
```

Option 4 fuehrt `dev:electron:chat` aus.

**Alternativ:** Separates `start-chat.mjs` Script, das nur Chat-Modi anbietet:

```
Choose mode:
  [1] Web Browser Mode       (localhost:3009)
  [2] Desktop App             (Electron)
```

---

### Task 10.7: tsconfig.json Anpassen

**Datei:** `apps/chat/tsconfig.json`

Muss Electron-spezifische Einstellungen enthalten:

- `include`: Muss `src/electron/**/*` und `src/preload.ts` einschliessen
- `types`: Muss `electron` einschliessen (fuer Main Process)
- Ggf. separate `tsconfig.electron.json` fuer Main Process (Node-Umgebung) vs. `tsconfig.json` fuer Renderer (Browser-Umgebung)

**Problem:** Main Process braucht `"module": "commonjs"` (Node), Renderer braucht `"module": "ESNext"` (Browser). Vite-Plugin-Electron handled das normalerweise automatisch, aber tsconfig muss korrekt sein.

**Loesung:**

- `tsconfig.json` bleibt Browser-orientiert (fuer Renderer)
- `vite-plugin-electron` transpiliert Main Process separat mit eigenen Settings
- Electron-Typen ueber `/// <reference types="electron" />` in den Electron-Dateien

---

### Task 10.8: TypeScript-Fehler pruefen

Nach allen Aenderungen:

- `npm run typecheck --workspace=apps/chat` ausfuehren
- Alle Import-Pfade verifizieren
- Sicherstellen, dass `@automaker/platform` und `@automaker/utils` korrekt aufgeloest werden
- Electron-Typen in Main Process Dateien korrekt

---

## Wichtige Entscheidungen

### Server-Start im Electron-Modus

Im Electron-Modus startet der Main Process den Server selbst (embedded). Der Server laeuft mit `AUTOMAKER_MODE=chat`. Das bedeutet:

- **Web-Modus** (`npm run dev:chat`): Server wird separat gestartet via concurrently
- **Electron-Modus** (`npm run dev:electron:chat`): Server wird vom Electron Main Process gestartet (analog zu `apps/ui`)

### Port-Konflikte

Wenn sowohl Automaker-UI als auch Chat-App als Electron laufen:

- Automaker: Server auf 3008, UI auf 3007
- Chat: Server auf 3008 (Konflikt!), Chat auf 3009

**Loesung:** `findAvailablePort()` in beiden Apps. Wenn 3008 belegt ist, wird automatisch ein freier Port gewaehlt. Die Chat-App kann denselben Server nutzen wenn er bereits laeuft, ODER einen eigenen starten.

### Shared vs. Separate userData

- Automaker Electron: `userData` = `~/.config/Automaker` (prod) / `project/data` (dev)
- Chat Electron: `userData` = `~/.config/UniAI Chat` (prod) / `project/data` (dev)
- In Development teilen sie `project/data` -> gleiche Projekte, Settings, Sessions
- In Production separate Verzeichnisse -> unabhaengig

---

## Verifikation

- [ ] `vite-plugin-electron` in `apps/chat/vite.config.ts` korrekt konfiguriert
- [ ] `npm run dev:chat` startet weiterhin nur Web-Modus (kein Electron)
- [ ] `npm run dev:electron:chat` startet Electron-Fenster mit Chat-App
- [ ] Server startet im AUTOMAKER_MODE=chat
- [ ] `electron-builder` Config in `package.json` vorhanden
- [ ] Root-Level Scripts funktionieren
- [ ] TypeScript kompiliert ohne Fehler
- [ ] Electron-Fenster laedt korrekt (Vite Dev Server URL)
- [ ] IPC-Kommunikation funktioniert (API-Key, Server-URL)

---

## Hinweise

- **Kein `npm run build` oder `npm run dev` ausfuehren!** Nur TypeScript-Fehler pruefen.
- Maximal 700 Zeilen pro Datei (AGENTS.md Regel)
- Electron-Version muss mit `apps/ui` uebereinstimmen (39.2.7)
- `vite-plugin-electron` Version muss mit `apps/ui` uebereinstimmen (0.29.0)
