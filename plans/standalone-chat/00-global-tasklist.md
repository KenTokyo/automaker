> **ARCHIV** — Diese Pläne sind nicht mehr aktiv.
> Der Standalone-Chat (`apps/chat`) wird nicht mehr als eigener Produktweg weiterentwickelt.
> Aktuelle Planung: `plans/automaker-chat-unification/`

# UniAI Chat Web - Standalone Agent Runner

ULTRATHINK

## Projektübersicht

**Ziel:** Den Agent Runner (Chat UI) aus Automaker als eigenständige, leichtgewichtige Web-App extrahieren.

**Name:** UniAI Chat Web (intern: `apps/chat/`)

**Kernidee:**

- Standalone-App NUR für Agent Chat + Sessions + Settings
- Keine Sidebar, kein Kanban-Board, kein Terminal, kein Spec-Editor
- Settings inline als Panel/Dialog statt eigene Route
- Projekt-Auswahl direkt im Header (existiert teilweise schon)
- Gleicher Backend-Server (`apps/server/`), nur schlankerer Client
- Innerhalb des Automaker-Monorepos als eigenes Workspace (`apps/chat/`)
- Geteilte Libs (`@automaker/*`) werden weiterhin genutzt
- UI-Komponenten werden direkt aus `apps/ui/src/` importiert (shared components)

## Architektur-Entscheidung

```
automaker/
├── apps/
│   ├── ui/           # Vollständige Automaker-App (unverändert)
│   ├── chat/         # NEU: Standalone UniAI Chat Web
│   │   ├── src/
│   │   │   ├── main.tsx           # Entry point
│   │   │   ├── app.tsx            # Root component (kein Router nötig)
│   │   │   ├── chat-layout.tsx    # Layout: Header + Agent + Settings Panel
│   │   │   └── components/
│   │   │       ├── chat-header.tsx      # Kompakter Header mit Projekt-Picker
│   │   │       ├── settings-panel.tsx   # Inline Settings (Sheet/Drawer)
│   │   │       └── project-setup.tsx    # Ersteinrichtung falls kein Projekt
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── server/       # Backend (unverändert, shared)
└── libs/             # Shared packages (unverändert)
```

**Shared Component Strategie:**

- `apps/chat/` importiert direkt aus `@automaker/ui` (via workspace) oder über Vite-Aliases auf `apps/ui/src/`
- Keine Duplikation - Änderungen an UI-Komponenten gelten für beide Apps
- Nur neue Wrapper/Layout-Komponenten werden in `apps/chat/` erstellt

## Referenzen

| Phase                                             | Datei                                                          | Status | Chat   |
| ------------------------------------------------- | -------------------------------------------------------------- | ------ | ------ |
| Phase 1 - Project Scaffolding                     | [01-scaffolding.md](./01-scaffolding.md)                       | FERTIG | CHAT 1 |
| Phase 2 - Core Layout                             | [02-core-layout.md](./02-core-layout.md)                       | FERTIG | CHAT 1 |
| Phase 3 - Inline Project Management               | [03-inline-project-mgmt.md](./03-inline-project-mgmt.md)       | FERTIG | CHAT 2 |
| Phase 4 - Agent View Integration                  | [04-agent-view-integration.md](./04-agent-view-integration.md) | FERTIG | CHAT 2 |
| Phase 5 - Inline Settings Panel                   | [05-inline-settings.md](./05-inline-settings.md)               | FERTIG | CHAT 3 |
| Phase 6 - Server Adaptation                       | [06-server-adaptation.md](./06-server-adaptation.md)           | FERTIG | CHAT 3 |
| Phase 7 - Build & Dev Scripts                     | [07-build-scripts.md](./07-build-scripts.md)                   | FERTIG | CHAT 4 |
| Phase 8 - Testing & Performance                   | [08-testing-performance.md](./08-testing-performance.md)       | FERTIG | CHAT 4 |
| Phase 9 - Electron Main Process & Preload         | [09-electron-setup.md](./09-electron-setup.md)                 | FERTIG | CHAT 5 |
| Phase 10 - Vite Config & Build Scripts (Electron) | [10-electron-build-scripts.md](./10-electron-build-scripts.md) | FERTIG | CHAT 5 |

## Chat-Zuordnung & Token-Schätzung

### CHAT 1: Grundgerüst (~80.000 Tokens)

- **Phase 1** - Project Scaffolding (~30.000 Tokens)
  - Vite-Konfiguration, package.json, tsconfig, index.html
  - Path-Aliases für shared UI-Komponenten
  - Tailwind CSS 4 Setup (shared config)
- **Phase 2** - Core Layout (~50.000 Tokens)
  - Vereinfachte Root-Komponente (kein TanStack Router)
  - Auth-Flow (Login/Session-Verification, reuse from UI)
  - Theme-System (reuse existing theme logic)
  - Font-System (reuse existing font logic)
  - QueryClientProvider + Zustand Store Initialization

### CHAT 2: Agent UI + Projekt-Management (~100.000 Tokens)

- **Phase 3** - Inline Project Management (~40.000 Tokens)
  - Kompakter Projekt-Picker im Header
  - Projekt erstellen/bearbeiten inline
  - Project Identity Section eingebettet
  - Kein Sidebar/ProjectSwitcher - alles im Header
- **Phase 4** - Agent View Integration (~60.000 Tokens)
  - AgentView als Hauptansicht (Vollbild)
  - SessionManager als linkes Panel
  - ChatArea als zentraler Bereich
  - BrowserPanel als rechtes Panel
  - Alle Agent-Hooks (use-electron-agent, orchestrator, time-limiter)
  - AgentInputArea mit allen Features

### CHAT 3: Settings & Server (~90.000 Tokens)

- **Phase 5** - Inline Settings Panel (~60.000 Tokens)
  - Sheet/Drawer-basiertes Settings-Panel
  - Nur relevante Sections: API Keys, Model Defaults, Providers, Appearance
  - Entfernte Sections: Worktrees, Feature Defaults, Terminal, Event Hooks
  - Project-spezifische Settings (Identity, Theme, Models)
- **Phase 6** - Server Adaptation (~30.000 Tokens)
  - Env-Variable für Chat-Only-Mode
  - Optionaler Feature-Gate für Board/Terminal-Routes
  - Health-Check für standalone Mode

### CHAT 4: Build & Test (~60.000 Tokens)

- **Phase 7** - Build & Dev Scripts (~30.000 Tokens)
  - `npm run dev:chat` Kommando
  - `npm run build:chat` Kommando
  - Separater Port (3009)
  - Concurrently: Server + Chat-UI
- **Phase 8** - Testing & Performance (~30.000 Tokens)
  - TypeScript-Fehler beheben
  - Bundle-Size-Vergleich (chat vs. ui)
  - Multi-Instanz-Test
  - Smoke-Test: Login, Projekt-Auswahl, Chat-Session

### CHAT 5: Electron-Setup fuer Chat-App (~120.000 Tokens)

- **Phase 9** - Electron Main Process & Preload (~70.000 Tokens)
  - Eigene `apps/chat/src/electron/` Verzeichnisstruktur
  - Vereinfachter Main Process (main-entry.ts) - kein Docker, kein Kanban
  - Vereinfachtes Preload Script - nur Chat-relevante APIs
  - IPC Handlers: Dialoge, Shell, Auth, Server, App-Info
  - Backend Server Management mit AUTOMAKER_MODE=chat
  - Window Management (kleineres Fenster, eigene Bounds)
  - API-Key Manager (separater Key-File fuer Parallelitaet)
  - Port Manager, Icon Manager, Static Server
- **Phase 10** - Vite Config & Build Scripts (Electron) (~50.000 Tokens)
  - `vite-plugin-electron` in Chat Vite-Config integrieren
  - Electron Dependencies (electron, electron-builder, vite-plugin-electron)
  - `electron-builder` Konfiguration (eigene App-Identity: "UniAI Chat")
  - Chat package.json Scripts (dev:electron, build:electron)
  - Root-Level Scripts (dev:electron:chat, build:electron:chat)
  - tsconfig.json Anpassungen fuer Electron
  - TypeScript-Fehler pruefen

## Kontext fuer jeden Chat

Jeder Chat erhaelt:

1. Diese globale Tasklist (`00-global-tasklist.md`)
2. Die relevanten Phase-Dateien
3. Optional: `temp.md` (falls Kontext aus vorherigem Chat noetig)
4. CLAUDE.md und AGENTS.md

## Aktueller Stand

- **Letzter abgeschlossener Chat:** CHAT 5 (Phase 9 + Phase 10)
- **Naechster Chat:** Keine weiteren Phasen - Projekt abgeschlossen!
- **Offene Blocker:** Keine

## Startmodi-Uebersicht (nach Abschluss aller Phasen)

| Befehl                        | App          | Modus                | Port |
| ----------------------------- | ------------ | -------------------- | ---- |
| `npm run dev:web`             | Automaker UI | Web + HMR            | 3007 |
| `npm run dev:electron`        | Automaker UI | Electron Desktop     | 3007 |
| `npm run dev:chat`            | Chat App     | Web + HMR + Server   | 3009 |
| `npm run dev:electron:chat`   | Chat App     | Electron Desktop     | 3009 |
| `npm run build:electron`      | Automaker UI | Production Installer | -    |
| `npm run build:electron:chat` | Chat App     | Production Installer | -    |
