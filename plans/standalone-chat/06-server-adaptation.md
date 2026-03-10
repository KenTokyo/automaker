# Phase 6: Server Adaptation

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 3
**Geschätzte Tokens:** ~30.000
**Abhängigkeiten:** Phase 1
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Den bestehenden Server (`apps/server/`) so anpassen, dass er optional im "Chat-Only"-Modus starten kann, wobei unnötige Services nicht geladen werden. Die vollständige Automaker-Funktionalität bleibt erhalten.

---

## Ist-Zustand

Der Server lädt ALLE Services und Routes beim Start:

- 35+ Route-Module
- 20+ Services
- Terminal-Emulation (node-pty)
- Pipeline-System
- Git-Worktree-Management
- Feature-Management (Kanban)
- Etc.

---

## Strategie: Lazy Loading + Feature Gate

**Entscheidung:** KEIN separater Server, sondern Feature-Gate im bestehenden Server.

**Begründung:**

- Gleicher Server für Automaker und Chat-App
- Weniger Maintenance
- Sessions, Settings, Auth sind für beide Apps gleich
- Chat-App verbindet sich zum gleichen Server auf Port 3008

---

## Tasks

### Task 6.1: Env-Variable `AUTOMAKER_MODE`

- Neue Env-Variable: `AUTOMAKER_MODE`
  - `full` (default) → Alles laden (Automaker-Verhalten)
  - `chat` → Nur Chat-relevante Routes/Services laden
- Dokumentation in `.env.example` und CLAUDE.md

### Task 6.2: Route-Kategorisierung

- **Immer geladen (Core):**
  - `auth/` - Authentifizierung
  - `health/` - Health-Check
  - `settings/` - Settings CRUD
  - `sessions/` - Chat-Sessions
  - `projects/` - Projekt-Management
  - `models/` - Model-Konfiguration
  - `agent/` - Agent-Ausführung
  - `running-agents/` - Agent-Status
  - `chat-images/` - Bild-Handling
  - `docs/` - Dokument-Speicherung
  - `claude/` - Claude API
  - `agent-prompts/` - Agent Prompts
  - `mcp/` - MCP Server
  - `fs/` - File-System (für Projekt-Pfad-Validierung)
  - `codex/`, `workspace/` - Provider-Endpoints

- **Nur in `full` Mode:**
  - `features/` - Feature CRUD (Kanban)
  - `auto-mode/` - Auto-Mode
  - `worktree/` - Git Worktree
  - `pipeline/` - Pipeline
  - `terminal/` - Terminal-Sessions
  - `enhance-prompt/` - Prompt Enhancement
  - `app-spec/` - App Spec
  - `backlog-plan/` - Planning
  - `context/` - Context Management
  - `event-history/` - Event History
  - `git/` - Git Operations (direkt)
  - `github/` - GitHub Integration
  - `ideation/` - Ideation
  - `notifications/` - Notifications
  - `setup/` - Setup Wizard
  - `templates/` - Templates

### Task 6.3: Service-Lazy-Loading

- Services die node-pty nutzen (`TerminalService`) nur in `full` Mode instanziieren
- `PipelineService`, `AutoModeService` nur in `full` Mode
- `FeatureLoaderService` nur in `full` Mode
- **Chat-relevante Services immer laden:**
  - `AgentService`
  - `AgentPromptsService`
  - `SettingsService`
  - `MCPTestService`

### Task 6.4: Health-Check Erweiterung

- `/api/health` Response erweitern:
  ```json
  {
    "status": "ok",
    "mode": "chat",
    "version": "0.13.0"
  }
  ```
- Chat-App kann Mode prüfen und ggf. Warnung anzeigen wenn `mode !== 'chat'`

### Task 6.5: Startup-Performance messen

- Vorher: Alle Routes/Services laden → Startup-Zeit messen
- Nachher: Chat-Mode → Startup-Zeit messen
- Erwartete Verbesserung: ~30-50% schnellerer Start (weniger Module, kein node-pty)
- **KEIN Build** - nur manuell messen

---

## Verifikation

- [ ] Server startet in `AUTOMAKER_MODE=chat` korrekt
- [ ] Chat-relevante Endpoints funktionieren
- [ ] Board/Terminal/Pipeline Endpoints geben 404 in Chat-Mode
- [ ] Server startet schneller in Chat-Mode
- [ ] `AUTOMAKER_MODE=full` (default) ändert nichts am bestehenden Verhalten

---

## Risiken

1. **Fehlende Route:** Chat-App braucht einen Endpoint der in Chat-Mode deaktiviert ist → Route-Liste oben muss korrekt sein
2. **Service-Dependencies:** Manche Core-Services könnten indirekt Full-Mode-Services brauchen → Dependency-Graph prüfen
3. **Memory-Footprint:** Hauptvorteil ist weniger Memory durch nicht-geladene Services → Messen

---

## Alternative (falls zu aufwändig)

Falls Feature-Gate zu komplex:

- Server IMMER komplett laden (Ist-Zustand)
- Nur Client ist leichtgewichtig
- Memory-Overhead des Servers ist akzeptabel
- **→ Phase 6 kann als "Nice-to-have" behandelt werden**
