# Phase 2: Core Layout

ULTRATHINK

**Status:** OFFEN
**Chat:** CHAT 1
**Geschätzte Tokens:** ~50.000
**Abhängigkeiten:** Phase 1 (Scaffolding)
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Vereinfachte Root-Komponente erstellen, die ohne Sidebar/Router auskommt. Auth-Flow, Theme-System und Store-Initialization aus der bestehenden UI übernehmen.

---

## Tasks

### Task 2.1: main.tsx - Entry Point

- Erstelle `apps/chat/src/main.tsx`
- React 19 `createRoot` Setup
- Import von `index.css`
- Rendert `<App />`

### Task 2.2: App-Komponente (Root)

- Erstelle `apps/chat/src/app.tsx`
- **Übernommene Logik aus `__root.tsx`:**
  - `QueryClientProvider` (reuse `queryClient` aus `@ui/lib/query-client`)
  - `GraphicsDialogProvider` (falls benötigt)
  - Theme-Anwendung (CSS-Klassen auf `<html>`)
  - Font-CSS-Variables
  - `Toaster` (sonner)
- **NICHT übernommen:**
  - TanStack Router (`Outlet`, `useLocation`, etc.)
  - `Sidebar` + `ProjectSwitcher` Komponenten
  - Streamer-Panel
  - `ProjectCommandBox`
  - `ReactQueryDevtools` (optional, nur dev)
  - `FileBrowserProvider` (nicht benötigt)

### Task 2.3: Auth-Flow (vereinfacht)

- **Zustände:**
  1. `loading` → Zeige Ladeindikator
  2. `unauthenticated` → Zeige Login-Form
  3. `authenticated` → Zeige Chat-Layout
- **Reuse:**
  - `useAuthStore` aus `@ui/store/auth-store`
  - `initApiKey()`, `verifySession()`, `getServerUrlSync()` aus `@ui/lib/http-api-client`
  - `waitForServerReady()` Logik aus `__root.tsx` (extrahieren oder kopieren)
  - `hydrateStoreFromSettings()`, `signalMigrationComplete()` aus `@ui/hooks/use-settings-migration`
- **Komponenten:**
  - Login-View: Reuse `@ui/components/views/login-view` oder minimale eigene Login-Form
  - `LoadingState` aus `@ui/components/ui/loading-state`

### Task 2.4: Theme-System

- Reuse `getStoredTheme()`, `getEffectiveTheme()` aus `@ui/store/app-store`
- `applyStoredTheme()` Logik übernehmen (synchrone Anwendung vor React-Render)
- Theme-Toggle in Settings-Panel (Phase 5) integriert
- CSS-Variable `--font-sans` und `--font-mono` setzen

### Task 2.5: Store-Initialization

- `useAppStore` initialisieren (Zustand, mit Persistence)
  - **Benötigte Slices:**
    - `projects`, `currentProject`, `projectHistory` (Projekt-Management)
    - `theme`, `fontFamilySans`, `fontFamilyMono` (Appearance)
    - `selectedAgentModel` (Model-Selection)
    - `browserPanelOpen` (Browser-Panel Toggle)
    - `maxSessionsPerProject` (Session-Limit)
    - `docsOpen`, `currentDocPath` (Docs)
    - `expandedOrchestratorRuns` (Orchestrator)
    - `sessionFontSize` (Session-Liste)
  - **NICHT benötigte Slices** (werden trotzdem geladen, da gleicher Store - aber UI nutzt sie nicht):
    - Features, Analysis, Pipeline, Terminal-State, Kanban-Settings

### Task 2.6: Settings Sync

- `useSettingsSync` Hook aktivieren (synchronisiert Zustand-State mit Server)
- `useProjectSettingsLoader` für projekt-spezifische Settings
- Sicherstellen, dass Settings-Änderungen in Chat-App auch in Automaker-App sichtbar sind (gleicher Server-Speicher)

### Task 2.7: Conditional Rendering Layout

- Erstelle `apps/chat/src/chat-layout.tsx`
- Layout-Struktur:
  ```
  ┌─────────────────────────────────────────────┐
  │ ChatHeader (Projekt-Picker, Settings-Btn)   │
  ├──────────┬────────────────────┬─────────────┤
  │ Session  │                    │ Browser     │
  │ Manager  │    Chat Area       │ Panel       │
  │ (toggle) │                    │ (toggle)    │
  ├──────────┴────────────────────┴─────────────┤
  │ Input Area (Model-Selector, File-Attach)    │
  └─────────────────────────────────────────────┘
  ```
- Kein `<Outlet />` - direkt `<AgentView />` rendern (oder angepasste Version)
- Settings-Panel als `<Sheet>` (Radix/shadcn) Overlay

---

## Verifikation

- [ ] App startet und zeigt Login-Screen wenn nicht authentifiziert
- [ ] Nach Login wird Chat-Layout angezeigt
- [ ] Theme wechselt korrekt (Dark/Light/Custom)
- [ ] Fonts werden korrekt angewendet
- [ ] Store ist hydrated mit Server-Settings
- [ ] Kein Sidebar sichtbar, kein Router aktiv

---

## Komponenten-Abhängigkeitsbaum

```
App (apps/chat/src/app.tsx)
├── QueryClientProvider
├── GraphicsDialogProvider (optional)
├── AuthGate (conditional rendering)
│   ├── LoadingState (wenn loading)
│   ├── LoginView (wenn unauthenticated) [reuse @ui]
│   └── ChatLayout (wenn authenticated)
│       ├── ChatHeader [NEU - Phase 3]
│       ├── AgentView [reuse @ui, angepasst - Phase 4]
│       └── SettingsPanel [NEU - Phase 5]
└── Toaster
```

---

## Wichtige Entscheidungen

### Reuse vs. Copy für Auth-Flow

**Entscheidung:** Reuse via Imports wo möglich, minimale Kopie für `waitForServerReady`

**Begründung:**

- Die Auth-Logik in `__root.tsx` ist tief mit Router-Navigation verflochten
- Die reinen Utility-Funktionen (`initApiKey`, `verifySession`, etc.) sind sauber importierbar
- Die Routing-Logik (redirects zu `/login`, `/setup`, etc.) wird durch Conditional Rendering ersetzt

### Setup-Wizard

**Entscheidung:** Kein eigener Setup-Wizard in Chat-App

**Begründung:**

- Setup prüft Anthropic API Key → kann auch über Settings-Panel gemacht werden
- Projekt-Erstellung ist inline im Header (Phase 3)
- Falls `setupComplete === false`: Zeige Settings-Panel automatisch mit API-Key-Section
