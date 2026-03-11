# UniAI Chat Standalone v2 - Globale Taskliste (Master Plan)

ULTRATHINK

## Projektziel

Den bestehenden Standalone-Chat (`apps/chat/`) zu einer klaren Chat-Plattform ausbauen.
Vorbild ist die UniAI Chat VS Code Extension mit Thread-System, Markdown Explorer, Sound-System und stabilem Chat-Fluss.

## Was sich ändert (Überblick)

| Bereich | Vorher | Nachher |
| --- | --- | --- |
| Login | API-Key Eingabe nötig | Auto-Login, kein Key-Dialog |
| Chat-Layout | Einfacher AgentView | 3-Spalten-Layout mit Seitenleisten |
| Sessions | Eine Session | Multi-Session mit Tabs |
| Verlauf | Kaum Übersicht | Linke Sidebar mit Suche/Filter |
| Markdown Explorer | Nicht vorhanden | Rechte Sidebar mit Baum + Suche |
| Sounds | Keine Hinweise | Töne bei Task/Phase/Fehler |
| Tool-Anzeige | Roh dargestellt | Aufklappbare Gruppen |
| Thinking | Wenig sichtbar | Timer + klare Blöcke |
| Orchestrator | Basis | Run/Iteration/Phase sichtbar |
| Parallele Agenten | Eingeschränkt | Mehrere Sessions gleichzeitig |

## Architektur-Leitplanken

1. Shared Imports aus `apps/ui/src/` über Vite-Alias `@/` beibehalten.
2. Chat-spezifische UI in `apps/chat/src/components/` bündeln.
3. Session-Verwaltung über eigenen Zustand-Store führen.
4. Server um Explorer-API und Sound-Unterstützung ergänzen.
5. Keine Code-Forks ohne Not; klare, wartbare Komponenten.

## Referenzdateien für jeden Chat

- `plans/standalone-chat-v2/00-global-tasklist.md` (Master Plan)
- `plans/standalone-chat-v2/temp.md` (falls vorhanden)
- `CLAUDE.md`
- `AGENTS.md`
- `shared-docs/ai-architecture/toolcall-architecture/05-uniai-chat-vscode-extension-toolcall-system-und-sidebar.md`
- `apps/chat/HOW-TO-RUN.md`

---

## Phasenübersicht nach Chats

### CHAT 1 (~80.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 1 | `01-auto-login.md` | Auto-Login (API-Key Pflicht entfernen) | ✅ ERLEDIGT |
| 2 | `02-chat-layout-redesign.md` | Chat-Layout Neustruktur (3-Spalten) | ✅ ERLEDIGT |
| 3 | `03-session-store.md` | Session/Thread Zustand Store | ✅ ERLEDIGT |

### CHAT 2 (~90.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 4 | `04-session-tabs.md` | Session Tab-Leiste | ✅ ERLEDIGT |
| 5 | `05-chat-message-area.md` | Chat-Nachrichtenbereich Überarbeitung | ✅ ERLEDIGT |
| 6 | `06-input-improvements.md` | Eingabebereich Verbesserungen | ✅ ERLEDIGT |

### CHAT 3 (~80.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 7 | `07-history-panel.md` | Verlauf-Panel (linke Sidebar) | ✅ ERLEDIGT |
| 8 | `08-conversation-persistence.md` | Konversations-Speicherung | ✅ ERLEDIGT |

### CHAT 4 (~90.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 9 | `09-markdown-explorer.md` | Markdown Explorer (rechte Sidebar) | ✅ ERLEDIGT |
| 10 | `10-markdown-explorer-backend.md` | Markdown Explorer Backend-API | ✅ ERLEDIGT |

### CHAT 5 (~60.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 11 | `11-sound-system.md` | Sound- und Benachrichtigungssystem | ✅ ERLEDIGT |
| 12 | `12-sound-settings.md` | Sound-Einstellungen im UI | ✅ ERLEDIGT |

### CHAT 6 (~70.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 13 | `13-tool-call-display.md` | Tool-Call Anzeige im Chat | ✅ ERLEDIGT |
| 14 | `14-thinking-blocks.md` | Thinking-Blöcke | ✅ ERLEDIGT |

### CHAT 7 (~60.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 15 | `15-orchestrator-enhancements.md` | Orchestrator-Modus Verbesserungen | ✅ ERLEDIGT |
| 16 | `16-parallel-agents.md` | Parallele Agenten (Multi-Session) | ✅ ERLEDIGT |

### CHAT 8 (~50.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 17 | `17-keyboard-shortcuts-ux.md` | Tastenkürzel und UX-Feinschliff | ✅ ERLEDIGT |
| 18 | `18-final-integration.md` | Abschluss und Gesamtintegration | ✅ ERLEDIGT |

---

## Dashboard / Übersicht Feature

### Feature-Beschreibung

Ein neues Dashboard-Panel in der linken Sidebar (neben dem Verlauf-Tab). Der User sieht auf einen Blick, was im Projekt passiert ist.

Kernidee:
- Tab-Umschalter in der linken Sidebar: Verlauf ↔ Übersicht
- Zeitraum-Tabs: 12h, 24h, 4 Tage, 1 Woche
- KI generiert eine Zusammenfassung aus Markdown-Dateien und Git-Änderungen
- Card-Darstellung mit Statistiken, Sektionen, Verbesserungen und Sicherheitshinweisen
- Persistierung als JSON auf dem Server
- Optionen: Neu generieren, Vereinfachen, Mehr Details, Modell-Wahl

### Abhängigkeiten zwischen Plänen

```
Plan 19 (Zeitfilter) --+
                       +--> Plan 21 (Generation Backend) nutzt Zeitfilter-Logik
Plan 20 (UI Shell) ----+
                       +--> Plan 22 (Rendering) baut auf UI Shell auf
Plan 21 (Generation) --+
                       +--> Plan 23 (Aktionen) erweitert Generation + Rendering
Plan 22 (Rendering) ---+
```

Kritischer Pfad: Plan 19 -> Plan 20 -> Plan 21 -> Plan 22 -> Plan 23

### CHAT 9 (~80.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 19 | `19-markdown-explorer-zeitfilter.md` | Markdown Explorer: Zeitbasierte Filterung | ✅ Abgeschlossen |
| 20 | `20-dashboard-ui-shell.md` | Dashboard UI Shell & Navigation | ✅ Abgeschlossen |

### CHAT 10 (~90.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 21 | `21-dashboard-generation-backend.md` | Dashboard: KI-Analyse Backend | ✅ Abgeschlossen |

### CHAT 11 (~90.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 22 | `22-dashboard-rendering-persistence.md` | Dashboard: Rendering & Persistierung | ✅ Abgeschlossen |

### CHAT 12 (~80.000 Tokens)

| Phase | Datei | Titel | Status |
| --- | --- | --- | --- |
| 23 | `23-dashboard-actions-refinement.md` | Dashboard: Aktionen, Verfeinerung & Modell-Wahl | ✅ Abgeschlossen |

### Status-Legende
- ⏳ Noch nicht erstellt (Planung ausstehend)
- 📝 Geplant (Planungsdatei erstellt, noch nicht implementiert)
- 🔄 In Arbeit (Implementierung läuft)
- ✅ Abgeschlossen

---

## Aktueller Stand

- Planungsdateien vorhanden: **23/23**.
- Umsetzungsfortschritt: **23/23 Phasen erledigt**.
- Letzter Umsetzungsschritt: **Plan 23 abgeschlossen (Dashboard Aktionen, Verfeinerung & Modell-Wahl)**.
- Nächster Schritt: **Übergabe und optionaler Feinschliff nach Feedback**.

## Chat-Übergabe-Protokoll

Jeder Chat bekommt:
1. Diese globale Taskliste.
2. Die relevanten Phasen-Dateien.
3. `temp.md` mit Kurzkontext (falls vorhanden).
4. `CLAUDE.md` und `AGENTS.md`.

Jeder Chat liefert zurück:
1. Aktualisierte globale Taskliste mit Status.
2. Aktualisierte Phasen-Dateien (`Status` pro Phase).
3. Aktualisierte `temp.md` für den nächsten Chat.
