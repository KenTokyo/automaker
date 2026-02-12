# 🎯 MASTER-ORCHESTRATOR: Project Switcher & Session Management

> **ULTRATHINK** - Dieses Dokument ist die zentrale Steuerungsdatei für alle Planungen.

---

## 📋 Projekt-Übersicht

**Feature-Name:** Enhanced Project Switcher mit Command-Box, Session-Zuordnung, Suche & Filterung

**Beschreibung:** Der User möchte:

1. Eine **Command-Box** (ähnlich VS Code `Ctrl+K`) zum schnellen Projekt-Wechsel
2. **Session-Projekt-Zuordnung**: In der Chat-Liste soll sichtbar sein, zu welchem Projekt ein Chat gehört
3. **Filterung nach Projekt**: Chats sollen nach Projekt filterbar sein
4. **Suche**: Eine Suche über Sessions/Chats einbauen

**Betroffene Bereiche:**

- Frontend: UI-Komponenten, Stores, Hooks
- Backend: Session-API (Filter/Suche erweitern)
- Types: Shared Types erweitern

---

## 📊 Status-Übersicht aller Planungen

| #   | Planung                             | Datei                                      | Status           | Impl-Chat |
| --- | ----------------------------------- | ------------------------------------------ | ---------------- | --------- |
| 1   | Command-Box Project Switcher        | `tasks/01-command-box-project-switcher.md` | 🏁 Implementiert | CHAT 2    |
| 2   | Session-Projekt-Zuordnung & Anzeige | `tasks/02-session-project-association.md`  | 🏁 Implementiert | CHAT 3    |
| 3   | Session-Suche & Filterung           | `tasks/03-session-search-filtering.md`     | 🏁 Implementiert | CHAT 4    |
| 4   | Integration & UI-Refinement         | `tasks/04-integration-ui-refinement.md`    | 🏁 Implementiert | CHAT 4    |

**Legende:** ⬜ Offen | 🟡 Geplant | 🔵 In Arbeit | ✅ Planung fertig | 🏁 Implementiert | ❌ Blockiert

---

## 🗂️ Referenzierte Dateien

### Planungen

- `docs/project-switcher/tasks/01-command-box-project-switcher.md` ✅
- `docs/project-switcher/tasks/02-session-project-association.md` ✅
- `docs/project-switcher/tasks/03-session-search-filtering.md` ✅
- `docs/project-switcher/tasks/04-integration-ui-refinement.md` ✅

### Bestehende Codebase (Schlüsseldateien)

- `apps/ui/src/components/layout/project-switcher/project-switcher.tsx` (524 Zeilen)
- `apps/ui/src/components/session-manager.tsx` (590 Zeilen)
- `apps/ui/src/components/views/agent-view/components/agent-header.tsx` (79 Zeilen)
- `apps/ui/src/components/views/agent-view.tsx` (253 Zeilen)
- `apps/ui/src/components/ui/command.tsx` (167 Zeilen) - **cmdk bereits vorhanden!**
- `apps/ui/src/store/app-store.ts` (4242 Zeilen)
- `apps/ui/src/routes/__root.tsx` (916 Zeilen)
- `apps/server/src/routes/sessions/` (Session-API)
- `apps/server/src/services/agent-service.ts` (Session-Service)
- `libs/types/src/settings.ts` (Types)
- `libs/types/src/session.ts` (Session-Types)

### Kontext-Dateien (falls temp.md mitgegeben)

- _(bisher keine temp.md)_

---

## 🔄 Chat-Verlauf & Fortschritt

### CHAT 1 (Planungsphase - ABGESCHLOSSEN ✅)

- **Ziel:** Alle 4 Planungen erstellen
- **Status:** ✅ Abgeschlossen
- **Ergebnis:** Globale Taskdatei (MASTER-ORCHESTRATOR.md) + 4 Feature-Planungen erstellt
- **Erstellt am:** 2026-02-11

### CHAT 2 (Implementierung Planung 1 - ABGESCHLOSSEN ✅)

- **Ziel:** Command-Box Project Switcher implementieren
- **Status:** ✅ Abgeschlossen
- **Phasen:**
  - Phase 1.1: ProjectCommandBox Komponente ✅ (4 Dateien erstellt)
  - Phase 1.2: Integration in Root-Layout ✅ (\_\_root.tsx angepasst)
  - Phase 1.3: Keyboard Shortcut Integration ✅ (projectPicker Shortcut → Command-Box)
- **Fix:** `useMemo` Import in `__root.tsx` ergänzt
- **TypeScript:** 0 neue Fehler in den geänderten/neuen Dateien

### CHAT 3 (Implementierung Planung 2 - ABGESCHLOSSEN ✅)

- **Ziel:** Session-Projekt-Zuordnung implementieren
- **Status:** ✅ Abgeschlossen
- **Phasen:**
  - Phase 2.3: Types prüfen ✅ (SessionListItem hat bereits `projectPath`, keine Änderung nötig)
  - Phase 2.2: `useProjectLookup` Hook erstellt ✅ (`apps/ui/src/hooks/use-project-lookup.ts`)
  - Phase 2.1: `ProjectBadge` Komponente erstellt ✅ (`apps/ui/src/components/project-badge.tsx`)
  - Integration in SessionManager ✅ (Badge in Session-Card Metadaten-Zeile)
- **TypeScript:** 0 neue Fehler in den geänderten/neuen Dateien

### CHAT 4 (Implementierung Planung 3 + 4 - ABGESCHLOSSEN ✅)

- **Ziel:** Suche, Filterung & Integration implementieren
- **Status:** ✅ Abgeschlossen
- **Phasen:**
  - Phase 3.1: `useSessionSearch` Hook + `SessionSearchInput` Komponente ✅ (2 neue Dateien)
  - Phase 3.2: `useSessionFilter` Hook + `ProjectFilterDropdown` Komponente ✅ (2 neue Dateien)
  - Phase 3.3: Integration in SessionManager ✅ (Toolbar, filtered counts, empty state)
  - Phase 4.1: Cross-Component Sync ✅ (Filter reset bei Projekt-Wechsel via `useEffect`)
  - Phase 4.2: UI-Konsistenz ✅ (Alle neuen Komponenten nutzen CSS-Variablen, kein Hardcoded)
  - Phase 4.3: Responsive & A11y ✅ (ARIA Labels, roles, keyboard navigation vorhanden)
  - Phase 4.4: Cleanup & TS-Validierung ✅ (0 neue TS-Fehler, keine ungenutzten Imports)
- **TypeScript:** 0 neue Fehler in den geänderten/neuen Dateien

---

## 🏗️ Architektur-Entscheidungen

### ✅ Bestätigt

1. **cmdk** Library ist bereits installiert und hat UI-Primitives (`apps/ui/src/components/ui/command.tsx`)
2. Sessions haben bereits `projectPath` Feld - Zuordnung existiert im Backend
3. Zustand Store hat bereits `projects[]`, `currentProject`, `projectHistory`
4. Keyboard Shortcuts existieren bereits: `openProject: 'O'`, `projectPicker: 'P'`
5. **Portal-Rendering** für Command-Box Dialog (z-index 60+, über allen anderen UI-Elementen)
6. **Client-Side Filtering** für Session-Suche und Projekt-Filter (keine Backend-Änderung nötig)

### ⚠️ Architektur-Hinweis

Der bestehende `ProjectSwitcher` (Sidebar links, 64px breit) bleibt bestehen. Die Command-Box ist ein **zusätzlicher** Zugangsweg, kein Ersatz. Beide können parallel genutzt werden.

### 🔑 Schlüssel-Pattern

- **State:** Zustand (app-store.ts)
- **Server-Daten:** React Query (TanStack Query)
- **UI-Primitives:** ShadcnUI + cmdk
- **Routing:** TanStack Router
- **Styling:** Tailwind CSS 4
- **API:** Dual-Mode (Electron IPC / HTTP)

### 📐 Z-Index Stack (Referenz)

| Element                      | Z-Index   |
| ---------------------------- | --------- |
| Mobile backdrop              | z-10      |
| Sidebar mobile overlay       | z-20      |
| Main sidebar                 | z-30      |
| Electron titlebar            | z-40      |
| ProjectSwitcher              | z-50      |
| **Command-Box Dialog (NEU)** | **z-60+** |

---

## 📈 Gesamtumfang

| Metrik                       | Wert             |
| ---------------------------- | ---------------- |
| **Neue Dateien**             | ~10              |
| **Geänderte Dateien**        | ~8-15            |
| **Neue Codezeilen**          | ~1.140-1.600     |
| **Geänderte Codezeilen**     | ~200-400         |
| **Implementierungs-Chats**   | 3 (CHAT 2, 3, 4) |
| **Geschätzte Tokens gesamt** | ~240.000-310.000 |

---

## 📝 Letzte Aktualisierung

- **Datum:** 2026-02-11
- **Phase:** 🏁 ALLE PLANUNGEN IMPLEMENTIERT
- **Alle 4 Planungen erfolgreich implementiert in CHAT 2, 3 und 4**
- **Ergebnis:** Command-Box, Session-Projekt-Zuordnung, Suche, Filterung & Integration komplett
