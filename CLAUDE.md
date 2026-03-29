# ════════════════════════════════════════════════════════════════

# TEIL 1: CLAUDE-KONTEXT = ARCHITEKTUR (keine Coding-Regeln)

# ════════════════════════════════════════════════════════════════

## 📌 Zweck dieser Datei

Diese Datei enthält **nur Architektur- und System-Kontext** für Automaker.

- **`AGENTS.md`**: Arbeitsweise, Coding-Regeln, Kommunikationsstil
- **`CLAUDE.md`**: Architektur, Datenfluss, Plattformen, wichtige Dateien

Wenn du Regeln zum Arbeiten suchst, lies `AGENTS.md`.
Wenn du technische Zusammenhänge suchst, lies `CLAUDE.md`.

## 📖 Immer zuerst lesen

- `AGENTS.md`
- `shared-docs/CODING-RULES.md`

# ════════════════════════════════════════════════════════════════

# TEIL 2: APP-KONTEXT & PRODUKTBILD

# ════════════════════════════════════════════════════════════════

## 🎯 Produktkontext

Automaker ist ein autonomes KI-Entwicklungsstudio als npm-Workspace-Monorepo.
Kernidee: Features laufen in isolierten Git-Worktrees, gesteuert über Agenten-Workflows.

Wichtige Laufmodi:

- Web-App (`apps/ui`)
- Electron Desktop-Modus (`apps/ui` + preload/main)
- Server (`apps/server`)
- Kanban-Standalone (`apps/kanban-web`)

## 🧭 Monorepo-Struktur

```
automaker/
├── apps/
│   ├── ui/           # React/Vite/Electron UI
│   ├── server/       # Express/WebSocket Backend
│   ├── kanban-web/   # Standalone Kanban SPA
│   └── markdown-explorer-extension/
├── libs/             # Shared Packages (@automaker/*)
├── docs/
├── shared-docs/
├── .automaker/       # Projektbezogene Daten im Zielprojekt
└── data/             # Globale App-Daten
```

## 📦 Shared-Package-Kette

Abhängigkeitsreihenfolge (von unten nach oben):

1. `@automaker/types`
2. `@automaker/utils`, `@automaker/prompts`, `@automaker/platform`, `@automaker/model-resolver`, `@automaker/dependency-resolver`, `@automaker/spec-parser`
3. `@automaker/git-utils`
4. `apps/server` und `apps/ui`

# ════════════════════════════════════════════════════════════════

# TEIL 3: LAUFZEIT-ARCHITEKTUR (UI ↔ SERVER ↔ AGENT)

# ════════════════════════════════════════════════════════════════

## 🔁 High-Level-Datenfluss

1. UI löst Aktion aus (Task, Agent-Run, Chat, Pipeline)
2. Server verarbeitet Request in Route/Service
3. Provider führt LLM/CLI-Schritt aus
4. Events werden über WebSocket zurück in die UI gestreamt
5. Ergebnisse werden pro Projekt in `.automaker/` gespeichert

## 🌐 UI-Architektur (`apps/ui/src`)

Zentrale Bereiche:

- `routes/` (TanStack Router)
- `components/views/` (Board, Agent, Terminal, Settings, Overview, etc.)
- `store/` (Zustand Stores)
- `hooks/`
- `lib/` (API-Client, Supabase-Helpers, Serializer, Utilities)

## 🖥️ Server-Architektur (`apps/server/src`)

Zentrale Bereiche:

- `routes/` (Feature-basierte API-Endpunkte)
- `services/` (Business-Logik)
- `providers/` (AI-Provider-Abstraktion)
- `middleware/`
- `lib/`, `types/`

Wichtige Route-Gruppen:

- `routes/agent/`
- `routes/worktree/`
- `routes/features/`
- `routes/auto-mode/`
- `routes/tasks/`
- `routes/pipeline/`
- `routes/settings/`
- `routes/overview/`

Wichtige Services:

- `services/agent-service.ts`
- `services/auto-mode-service.ts`
- `services/feature-loader.ts`
- `services/pipeline-service.ts`
- `services/terminal-service.ts`
- `services/event-history-service.ts`
- `services/overview-service.ts`

## 📡 Event-Streaming

Automaker arbeitet Event-getrieben:

- Server erzeugt strukturierte Events
- UI konsumiert Events live via WebSocket
- Dadurch sind Agent-Fortschritt, Logs und Statusänderungen sofort sichtbar

# ════════════════════════════════════════════════════════════════

# TEIL 4: PROVIDER-ARCHITEKTUR

# ════════════════════════════════════════════════════════════════

## 🤖 Provider-System (`apps/server/src/providers`)

Mehrere Provider werden zentral abstrahiert:

- Claude
- Codex
- Gemini
- OpenCode
- Cursor
- Copilot
- CLI-Basisprovider

Wichtige Dateien:

- `providers/provider-factory.ts`
- `providers/base-provider.ts`
- `providers/types.ts`
- `providers/tool-normalization.ts`
- `providers/claude-provider.ts`
- `providers/codex-provider.ts`
- `providers/gemini-provider.ts`
- `providers/opencode-provider.ts`
- `providers/cursor-provider.ts`
- `providers/copilot-provider.ts`

## 🧩 Modell-Auflösung

Modell-Aliase laufen über Shared Package:

- `libs/model-resolver/`

Prinzip:

- `haiku` → konkretes Modell
- `sonnet` → konkretes Modell
- `opus` → konkretes Modell

# ════════════════════════════════════════════════════════════════

# TEIL 5: GIT-WORKTREE & TASK-ISOLATION

# ════════════════════════════════════════════════════════════════

## 🌿 Worktree-Prinzip

Jedes Feature kann in einem separaten Git-Worktree laufen.
Das schützt den Haupt-Branch und reduziert Seiteneffekte zwischen Tasks.

Wichtige Stellen:

- `libs/git-utils/`
- `apps/server/src/routes/worktree/`
- `apps/server/src/services/feature-loader.ts`

## 🧠 Kontextdateien für Agenten

Projektkontext wird aus `.automaker/context/` geladen und in Prompts eingebunden.
So bleiben Projektregeln pro Projekt konsistent.

# ════════════════════════════════════════════════════════════════

# TEIL 6: DATENHALTUNG (PROJEKT vs GLOBAL)

# ════════════════════════════════════════════════════════════════

## 📁 Projektbezogene Daten (`.automaker/`)

Im jeweiligen Zielprojekt:

```
.automaker/
├── features/
│   └── {featureId}/
│       ├── feature.json
│       ├── agent-output.md
│       └── images/
├── context/
├── settings.json
├── spec.md
└── analysis.json
```

## 💾 Globale Daten (`data/` bzw. `DATA_DIR`)

Automaker-übergreifende Daten:

```
data/
├── settings.json
├── credentials.json
├── sessions-metadata.json
└── agent-sessions/
```

## 🔐 Wichtige Trennung

- `.automaker/` = pro Projekt
- `data/` = global für die App

Diese Trennung darf bei Architekturänderungen nicht vermischt werden.

# ════════════════════════════════════════════════════════════════

# TEIL 7: KANBAN-WEB & CHAT-KONSOLIDIERUNG

# ════════════════════════════════════════════════════════════════

## 🧱 Kanban-Web (Standalone)

Für Arbeiten an `apps/kanban-web/`:

- zuerst `apps/kanban-web/ARCHITEKTUR.md` lesen

Hinweis:

- Standalone SPA
- spricht direkt mit Supabase
- Shared UI/Logik aus `apps/ui` kann Auswirkungen auf beide Apps haben

## 💬 Chat-Konsolidierung

- `apps/ui` ist Haupt-Chat
- `apps/chat` ist nicht der Zielpfad für neue Features
- Neue Chat-Funktionen in `apps/ui` umsetzen
- Referenz: `plans/automaker-chat-unification/`

# ════════════════════════════════════════════════════════════════

# TEIL 8: WICHTIGE DATEI-LANDKARTE

# ════════════════════════════════════════════════════════════════

## Server-Einstieg

- `apps/server/src/index.ts`

## UI-Einstieg

- `apps/ui/src/main.ts`
- `apps/ui/src/app.tsx`
- `apps/ui/src/renderer.tsx`

## Electron

- `apps/ui/src/preload.ts`
- `apps/ui/src/electron/`

## Shared-Libs

- `libs/types/`
- `libs/utils/`
- `libs/prompts/`
- `libs/platform/`
- `libs/model-resolver/`
- `libs/dependency-resolver/`
- `libs/spec-parser/`
- `libs/git-utils/`

## API & Store (UI)

- `apps/ui/src/lib/http-api-client.ts`
- `apps/ui/src/store/`
- `apps/ui/src/hooks/`

# ════════════════════════════════════════════════════════════════

# TEIL 9: UMGEBUNGSVARIABLEN (ARCHITEKTURRELEVANT)

# ════════════════════════════════════════════════════════════════

Wichtige Variablen:

- `ANTHROPIC_API_KEY`
- `HOST`
- `HOSTNAME`
- `PORT`
- `DATA_DIR`
- `ALLOWED_ROOT_DIRECTORY`
- `AUTOMAKER_MOCK_AGENT`
- `AUTOMAKER_AUTO_LOGIN`
- `VITE_HOSTNAME`

# ════════════════════════════════════════════════════════════════

# TEIL 10: ENTSCHEIDUNGSLEITLINIEN

# ════════════════════════════════════════════════════════════════

## 🧭 Architektur-Checks vor Merge

1. Betrifft die Änderung UI, Server, Provider oder mehrere Ebenen?
2. Ist die Trennung `.automaker/` (Projekt) vs `data/` (global) sauber?
3. Sind Worktree-/Git-Nebenwirkungen berücksichtigt?
4. Sind Event-Streams und Frontend-Reaktion weiterhin konsistent?
5. Wenn `apps/ui` Shared-Code ändert: wurde `apps/kanban-web` mitgedacht?

## ✅ Kurzfazit

`AGENTS.md` steuert das **Wie wir arbeiten**.
`CLAUDE.md` beschreibt das **Wie Automaker gebaut ist**.
