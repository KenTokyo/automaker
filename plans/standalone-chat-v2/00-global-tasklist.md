# UniAI Chat Standalone v2 - Globale Taskliste (Master Plan)

ULTRATHINK

## Projektziel

Den bestehenden Standalone Chat (`apps/chat/`) komplett umbauen zu einer vollwertigen Chat-Plattform.
Vorbild ist die UniAI Chat VS Code Extension - mit Thread-System, Markdown Explorer, Sound-System und professionellem Chat-Erlebnis.

## Was sich ändert (Überblick)

| Bereich           | Vorher                | Nachher                                    |
| ----------------- | --------------------- | ------------------------------------------ |
| Login             | API-Key Eingabe nötig | Auto-Login, kein Key-Dialog                |
| Chat-Layout       | Einfacher AgentView   | Sidebar-basiert mit History + Explorer     |
| Sessions          | Eine Session          | Multi-Session mit Tabs                     |
| History           | Keine                 | Linke Sidebar mit Verlauf, Filter, Suche   |
| Markdown Explorer | Keiner                | Rechte Sidebar mit Dateibaum, Favoriten    |
| Sounds            | Keine                 | Benachrichtigungstöne bei Task-/Phase-Ende |
| Tool-Anzeige      | Einfach               | Aufklappbare Tool-Gruppen mit Ergebnissen  |
| Thinking          | Einfach               | Timer, aufklappbare Thinking-Blöcke        |
| Orchestrator      | Grundfunktion         | Phasen-Erkennung, Gruppierung im Verlauf   |
| Parallele Agenten | Nicht möglich         | Multi-Session parallel                     |

## Architektur-Entscheidungen

1. **Weiterhin shared imports** aus `apps/ui/src/` via Vite-Alias `@/`
2. **Neue Chat-spezifische Komponenten** in `apps/chat/src/components/`
3. **Zustand Stores** für Session-Management (neuer Store)
4. **Server-Erweiterungen** für Markdown Explorer API und Sound-Dateien
5. **Kein Fork** von AgentView - stattdessen eigener Chat-View bauen

## Referenz-Dateien (immer mitgeben)

- `plans/standalone-chat-v2/00-global-tasklist.md` (diese Datei)
- `CLAUDE.md` und `AGENTS.md` (Projektregeln)
- `shared-docs/ai-architecture/toolcall-architecture/05-uniai-chat-vscode-extension-toolcall-system-und-sidebar.md`
- `apps/chat/HOW-TO-RUN.md`

## Kontext-Datei

Falls ein Chat Zwischenergebnisse hat, wird eine `temp.md` im selben Ordner angelegt.
Diese wird dann beim nächsten Chat mitgegeben.

---

## Phasen-Übersicht

### CHAT 1 (~80.000 Tokens)

| Phase | Datei                        | Titel                                  | Status   |
| ----- | ---------------------------- | -------------------------------------- | -------- |
| 1     | `01-auto-login.md`           | Auto-Login (API-Key Pflicht entfernen) | ⬜ OFFEN |
| 2     | `02-chat-layout-redesign.md` | Chat-Layout Neustruktur (3-Spalten)    | ⬜ OFFEN |
| 3     | `03-session-store.md`        | Session/Thread Zustand Store           | ⬜ OFFEN |

### CHAT 2 (~90.000 Tokens)

| Phase | Datei                      | Titel                                 | Status   |
| ----- | -------------------------- | ------------------------------------- | -------- |
| 4     | `04-session-tabs.md`       | Session Tab-Leiste                    | ⬜ OFFEN |
| 5     | `05-chat-message-area.md`  | Chat-Nachrichtenbereich Überarbeitung | ⬜ OFFEN |
| 6     | `06-input-improvements.md` | Eingabebereich Verbesserungen         | ⬜ OFFEN |

### CHAT 3 (~80.000 Tokens)

| Phase | Datei                            | Titel                         | Status   |
| ----- | -------------------------------- | ----------------------------- | -------- |
| 7     | `07-history-panel.md`            | Verlauf-Panel (linke Sidebar) | ⬜ OFFEN |
| 8     | `08-conversation-persistence.md` | Konversations-Speicherung     | ⬜ OFFEN |

### CHAT 4 (~90.000 Tokens)

| Phase | Datei                             | Titel                              | Status   |
| ----- | --------------------------------- | ---------------------------------- | -------- |
| 9     | `09-markdown-explorer.md`         | Markdown Explorer (rechte Sidebar) | ⬜ OFFEN |
| 10    | `10-markdown-explorer-backend.md` | Markdown Explorer Backend-API      | ⬜ OFFEN |

### CHAT 5 (~60.000 Tokens)

| Phase | Datei                  | Titel                           | Status   |
| ----- | ---------------------- | ------------------------------- | -------- |
| 11    | `11-sound-system.md`   | Sound & Benachrichtigungssystem | ⬜ OFFEN |
| 12    | `12-sound-settings.md` | Sound-Einstellungen UI          | ⬜ OFFEN |

### CHAT 6 (~70.000 Tokens)

| Phase | Datei                     | Titel                      | Status   |
| ----- | ------------------------- | -------------------------- | -------- |
| 13    | `13-tool-call-display.md` | Tool-Call Anzeige im Chat  | ⬜ OFFEN |
| 14    | `14-thinking-blocks.md`   | Thinking-Block Darstellung | ⬜ OFFEN |

### CHAT 7 (~60.000 Tokens)

| Phase | Datei                             | Titel                             | Status   |
| ----- | --------------------------------- | --------------------------------- | -------- |
| 15    | `15-orchestrator-enhancements.md` | Orchestrator-Modus Verbesserungen | ⬜ OFFEN |
| 16    | `16-parallel-agents.md`           | Parallele Agenten (Multi-Session) | ⬜ OFFEN |

### CHAT 8 (~50.000 Tokens)

| Phase | Datei                         | Titel                         | Status   |
| ----- | ----------------------------- | ----------------------------- | -------- |
| 17    | `17-keyboard-shortcuts-ux.md` | Tastenkürzel & UX-Feinschliff | ⬜ OFFEN |
| 18    | `18-final-integration.md`     | Abschluss & Integration       | ⬜ OFFEN |

---

## Aktueller Stand

- **Letzter abgeschlossener Chat**: - (noch keiner)
- **Nächster Chat**: CHAT 1 (Phasen 1-3)
- **Gesamtfortschritt**: 0/18 Phasen erledigt

---

## Chat-Übergabe Protokoll

Jeder Chat bekommt:

1. Diese globale Taskliste
2. Die relevanten Phase-Dateien für den aktuellen Chat
3. Falls vorhanden: `temp.md` mit Zwischenergebnissen
4. `CLAUDE.md` + `AGENTS.md`

Jeder Chat gibt zurück:

1. Aktualisierte globale Taskliste (Status-Updates)
2. Aktualisierte Phase-Dateien (Status: FERTIG)
3. Falls nötig: `temp.md` mit Kontext für den nächsten Chat
