# Phase 4: Agent View Integration

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 2
**Geschätzte Tokens:** ~60.000
**Abhängigkeiten:** Phase 1, Phase 2, Phase 3
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Die bestehende `AgentView` als Hauptansicht in der Chat-App integrieren. Dabei wird die AgentView so genutzt, wie sie ist, aber der umgebende Header wird durch den neuen `ChatHeader` (Phase 3) ersetzt.

---

## Ist-Zustand

Die `AgentView` in `apps/ui/src/components/views/agent-view.tsx` ist eine ~950-Zeilen-Komponente, die:

- `SessionManager` als linkes Panel rendert
- `ChatArea` (Messages) als zentralen Bereich rendert
- `BrowserPanel` als rechtes Panel rendert
- `AgentHeader` als oberen Balken rendert
- `AgentInputArea` als unteren Eingabebereich rendert
- Zahlreiche Hooks nutzt (agent, scroll, attachments, shortcuts, session, worktree)
- Dialogs für Worktree-Aktionen rendert

---

## Strategie: Wrapper statt Fork

**Entscheidung:** Die `AgentView` NICHT kopieren, sondern einen Wrapper erstellen.

**Begründung:**

- AgentView ist komplex (~950 Zeilen) und ändert sich häufig
- Ein Fork würde Maintenance-Hölle bedeuten
- Stattdessen: ChatLayout importiert AgentView und ersetzt nur den Header

**Umsetzung:**

1. `AgentView` direkt aus `@ui/components/views/agent-view` importieren
2. Den `AgentHeader` im ChatLayout durch `ChatHeader` ersetzen
3. Worktree-Dialogs können drin bleiben (schaden nicht, werden nur gerendert wenn nötig)

---

## Tasks

### Task 4.1: AgentView Import & Integration

- In `apps/chat/src/chat-layout.tsx`:
  - Importiere `AgentView` aus `@ui/components/views/agent-view`
  - Rendere `<AgentView />` als Hauptinhalt
  - Kein eigener SessionManager/ChatArea nötig - AgentView bringt alles mit

### Task 4.2: Header-Ersetzung

- **Problem:** `AgentView` rendert intern `AgentHeader`, wir wollen aber `ChatHeader`
- **Lösungsansatz A: Prop-basiert**
  - `AgentView` um optionale Prop `renderHeader` erweitern
  - Default: `AgentHeader` (Automaker-Verhalten unverändert)
  - Chat-App übergibt eigene `ChatHeader`-Komponente
  - Vorteil: Kein Fork, sauber erweiterbar
  - Nachteil: Änderung an `apps/ui/src/components/views/agent-view.tsx`
- **Lösungsansatz B: Komposition**
  - Chat-Layout rendert `ChatHeader` + `AgentView` ohne Header
  - `AgentView` um Prop `hideHeader?: boolean` erweitern
  - Chat-App setzt `hideHeader={true}` und rendert eigenen Header darüber
  - Vorteil: Minimale Änderung an AgentView
  - **→ BEVORZUGT**

### Task 4.3: AgentView Anpassung (minimal)

- In `apps/ui/src/components/views/agent-view.tsx`:
  - Neue optionale Props:
    - `hideHeader?: boolean` → Header nicht rendern
    - `headerSlot?: React.ReactNode` → Eigenen Header injizieren
  - Worktree-Actions Props nach oben durchreichen wenn headerSlot
  - Conditional: `{!hideHeader && <AgentHeader ... />}` bzw. `{headerSlot || <AgentHeader ... />}`

### Task 4.4: Benötigte Stores & Hooks verifizieren

- AgentView nutzt:
  - `useAppStore` → Projekt, Model, Browser-Panel, Docs
  - `useAgentPromptsStore` → Agent Prompts
  - `useTimeLimiterStore` → Zeit-Limiter
  - `useOrchestratorStore` → Orchestrator
  - `useElectronAgent` → WebSocket-basierter Agent
  - `useSessions` → Session-Abfrage
  - Custom Hooks: `useAgentScroll`, `useFileAttachments`, `useAgentShortcuts`, `useAgentSession`, `useAgentWorktreeActions`
- **Alle diese müssen in Chat-App funktionieren:**
  - Stores: Werden über gleichen Zustand importiert ✓
  - Hooks: Werden über `@ui/` Alias importiert ✓
  - ElectronAgent: Nutzt WebSocket → funktioniert in Web-Mode ✓
  - Sessions API: Nutzt `getElectronAPI()` → muss in Web-Mode funktionieren

### Task 4.5: Web-Mode API Kompatibilität

- `getElectronAPI()` in `@ui/lib/electron.ts` prüfen:
  - Im Web-Mode gibt es kein `window.electronAPI`
  - Es gibt einen Fallback-HTTP-Client
  - Sicherstellen, dass Session-Operationen (create, delete, rename, archive) über HTTP funktionieren
  - Agent-Kommunikation läuft über WebSocket (nicht Electron IPC)
- Falls nötig: `getElectronAPI()` erweitern um robusteren Web-Fallback

### Task 4.6: Worktree-Actions (Optional)

- In Automaker: AgentHeader zeigt Worktree-Actions für das aktuelle Projekt
- In Chat-App: **Optional** - kann weggelassen werden
- Wenn `hideHeader={true}`: Worktree-Actions sind nicht sichtbar
- Für Chat-App ist das OK, da kein Kanban-Board vorhanden
- **Entscheidung:** Worktree-Actions zunächst weglassen, können in Phase 3 ChatHeader optional hinzugefügt werden

---

## Layout-Struktur (Resultat)

```
ChatLayout
├── ChatHeader (Phase 3)
│   └── [Project-Picker, Settings, Toggles, etc.]
├── AgentView (hideHeader={true})
│   ├── SessionManager (resizable left panel)
│   ├── ChatArea
│   │   ├── MessageList
│   │   └── AgentInputArea
│   └── BrowserPanel (resizable right panel, toggleable)
└── SettingsPanel (Phase 5, Sheet overlay)
```

---

## Verifikation

- [ ] AgentView rendert korrekt in Chat-App
- [ ] Kein doppelter Header (AgentHeader ausgeblendet)
- [ ] ChatHeader statt AgentHeader sichtbar
- [ ] SessionManager funktioniert (Create, Switch, Delete, Archive)
- [ ] Chat-Nachrichten senden & empfangen funktioniert
- [ ] File-Attachments funktionieren
- [ ] BrowserPanel Toggle funktioniert
- [ ] Orchestrator-Modus funktioniert
- [ ] Time-Limiter funktioniert
- [ ] Keyboard-Shortcuts funktionieren

---

## Risiken

1. **Zirkuläre Dependencies:** `apps/chat/` importiert aus `apps/ui/src/`, welches `@automaker/*` importiert. Vite sollte das auflösen, aber muss getestet werden.
2. **CSS-Scope:** Tailwind-Klassen aus `apps/ui/` müssen auch in `apps/chat/` verfügbar sein → Task 1.5 (Tailwind Content-Paths)
3. **Store-Kollision:** Falls Automaker und Chat-App gleichzeitig laufen und gleichen LocalStorage nutzen → Prefix für Chat-App Storage-Key?
4. **WebSocket-Connection:** In Automaker läuft WS über Electron IPC oder direkt → in Chat-App immer direkt über HTTP/WS → Muss getestet werden
