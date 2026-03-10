# Phase 7: Build & Dev Scripts

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 4
**Geschätzte Tokens:** ~30.000
**Abhängigkeiten:** Phase 1, Phase 6
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Entwicklungs- und Build-Skripte für die standalone Chat-App erstellen, sodass sie mit einem einzigen Befehl gestartet werden kann.

---

## Tasks

### Task 7.1: Chat-App package.json Scripts

- In `apps/chat/package.json`:
  ```
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  }
  ```

### Task 7.2: Root-Level Dev-Script

- In Root `package.json` neue Scripts:
  ```
  "dev:chat": "npm run build:packages && concurrently -n server,chat -c blue,magenta \"AUTOMAKER_MODE=chat npm run _dev:server\" \"npm run dev --workspace=apps/chat\"",
  "_dev:chat": "npm run dev --workspace=apps/chat"
  ```
- `dev:chat` startet:
  1. Build shared packages (einmalig)
  2. Server im Chat-Mode (Port 3008)
  3. Chat-UI (Port 3009)
- Concurrently für parallelen Start

### Task 7.3: Root-Level Build-Script

- In Root `package.json`:
  ```
  "build:chat": "npm run build:packages && npm run build --workspace=apps/chat"
  ```
- Baut nur shared packages + Chat-UI
- KEIN Server-Build nötig (Server wird live gestartet)

### Task 7.4: start-automaker.mjs Erweitern

- Das interaktive Launcher-Script (`start-automaker.mjs`) um Option erweitern:
  - `[1] Web Browser Mode` (existiert)
  - `[2] Desktop App` (existiert)
  - `[3] Chat Web Mode` (NEU)
- Option 3: Startet `dev:chat`
- Oder: Separates `start-chat.mjs` Script

### Task 7.5: Environment Configuration

- `.env.chat` Template erstellen:
  ```
  AUTOMAKER_MODE=chat
  PORT=3008
  VITE_HOSTNAME=localhost
  VITE_SERVER_PORT=3008
  ```
- `apps/chat/` liest `VITE_HOSTNAME` und `VITE_SERVER_PORT` für API-URLs

### Task 7.6: Production-Mode

- `npm run start:chat` für Production:
  - Server im Chat-Mode starten
  - Chat-UI aus `apps/chat/dist/` als statische Dateien servieren
  - Oder: Eigener statischer Server (z.B. `serve` oder Express static)

---

## Port-Zuordnung

| App          | Dev Port | Beschreibung     |
| ------------ | -------- | ---------------- |
| Server       | 3008     | Backend (shared) |
| Automaker UI | 3007     | Vollständige App |
| Chat UI      | 3009     | Standalone Chat  |

---

## Verifikation

- [ ] `npm run dev:chat` startet Server + Chat-UI
- [ ] Chat-UI erreichbar auf http://localhost:3009
- [ ] API-Proxy funktioniert (3009 → 3008)
- [ ] WebSocket-Proxy funktioniert
- [ ] `npm run build:chat` baut ohne Fehler
- [ ] TypeCheck (`npm run typecheck --workspace=apps/chat`) ohne Fehler

---

## Windows-Kompatibilität

- `AUTOMAKER_MODE=chat` als Env-Variable → Auf Windows: `cross-env` nutzen oder in Script inline setzen
- Concurrently funktioniert auf allen Plattformen
- Pfad-Separatoren in Vite-Config: Forward-Slashes verwenden
