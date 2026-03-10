# Phase 1: Project Scaffolding

ULTRATHINK

**Status:** OFFEN
**Chat:** CHAT 1
**Geschätzte Tokens:** ~30.000
**Abhängigkeiten:** Keine
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Neues Workspace-Paket `apps/chat/` im Monorepo erstellen, das als eigenständige Vite-App läuft und Komponenten aus `apps/ui/src/` importieren kann.

---

## Tasks

### Task 1.1: Package.json erstellen

- Erstelle `apps/chat/package.json`
- Name: `@automaker/chat`
- Dependencies: Minimale Subset von `apps/ui/package.json`
  - React 19, React-DOM
  - Zustand 5
  - TanStack Query 5 (für Server-State)
  - Tailwind CSS 4
  - Lucide-React (Icons)
  - Sonner (Toasts)
  - Radix UI Primitives (nur was Settings/Chat braucht)
  - `@automaker/types`, `@automaker/utils`, `@automaker/model-resolver`
- KEIN TanStack Router (Single-Page, kein Routing nötig)
- KEIN Electron (nur Web)
- KEIN xterm.js (kein Terminal)
- KEIN Tiptap/CodeMirror (kein Rich-Editor)
- KEIN dnd-kit (kein Drag&Drop)

### Task 1.2: Vite-Konfiguration

- Erstelle `apps/chat/vite.config.ts`
- Port: 3009 (unterschiedlich von UI:3007)
- Path-Aliases:
  - `@/` → `apps/chat/src/`
  - `@ui/` → `apps/ui/src/` (für shared component imports)
- Tailwind CSS 4 Plugin (gleiche Config wie UI)
- Proxy: `/api` → `http://localhost:3008` (Server)
- Proxy: `/ws` → `ws://localhost:3008` (WebSocket)
- Env-Variables: `VITE_HOSTNAME`, `VITE_SERVER_PORT`

### Task 1.3: TypeScript-Konfiguration

- Erstelle `apps/chat/tsconfig.json`
- Extends von root tsconfig oder `apps/ui/tsconfig.json`
- Path-Mappings für `@/` und `@ui/`
- Include: `src/**/*` + `../ui/src/**/*` (damit TS-Checker auch shared imports versteht)

### Task 1.4: index.html

- Erstelle `apps/chat/index.html`
- Minimale HTML-Struktur
- Entry: `src/main.tsx`
- Title: "UniAI Chat"

### Task 1.5: Tailwind CSS Setup

- Sicherstellen, dass Tailwind CSS 4 die gleichen Design-Tokens/Theme-Variables nutzt
- Content-Paths müssen sowohl `apps/chat/src/` als auch `apps/ui/src/` scannen
- CSS-Datei: `apps/chat/src/index.css` (importiert ggf. `apps/ui/src/index.css` oder shared base)

### Task 1.6: Monorepo-Integration

- `apps/chat/` zum `workspaces`-Array in Root `package.json` hinzufügen (passiert automatisch via `apps/*`)
- Verifizieren, dass `npm install` korrekt resolved
- Sicherstellen, dass `@automaker/*` Pakete von `apps/chat/` aus erreichbar sind

---

## Verifikation

- [ ] `apps/chat/` Verzeichnis existiert mit allen Konfigdateien
- [ ] TypeScript findet keine Fehler in leerer `main.tsx`
- [ ] Vite Dev-Server startet auf Port 3009
- [ ] Import von `@automaker/types` funktioniert
- [ ] Import von `@ui/components/ui/button` funktioniert

---

## Wichtige Entscheidungen

### Shared UI Imports

**Entscheidung:** Direkte Imports via Vite-Alias `@ui/` → `apps/ui/src/`

**Begründung:**

- Kein Build-Step für shared Components nötig
- Änderungen in UI-Komponenten sind sofort in Chat-App sichtbar
- Vite tree-shakes automatisch nicht-genutzte Exports

**Alternative (verworfen):** Shared Component Library als eigenes Paket

- Zu viel Overhead für den initialen Aufbau
- Kann später refactored werden wenn nötig

### Kein TanStack Router

**Entscheidung:** Kein Router, da es nur eine "Seite" gibt

**Begründung:**

- Agent Chat ist die einzige View
- Settings werden als Panel/Overlay dargestellt, nicht als Route
- Login kann als einfacher Zustand gehandhabt werden (conditional rendering)
- Spart erheblich an Bundle-Size
