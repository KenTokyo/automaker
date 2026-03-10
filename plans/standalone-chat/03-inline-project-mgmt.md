# Phase 3: Inline Project Management

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 2
**Geschätzte Tokens:** ~40.000
**Abhängigkeiten:** Phase 1, Phase 2
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Projekt-Auswahl und -Verwaltung direkt im Chat-Header einbauen, ohne Sidebar oder ProjectSwitcher. Der Nutzer soll Projekte erstellen, wechseln und konfigurieren können - alles aus dem Header heraus.

---

## Ist-Zustand (Automaker)

- **Sidebar:** Zeigt Navigation + Projekt-Liste + Footer
- **ProjectSwitcher:** Discord-ähnliche Icon-Leiste für Projekte
- **AgentHeader:** Hat BEREITS einen Projekt-Dropdown mit Suche + Switch-Funktion
- **ProjectSettingsView:** Eigene Route für Projekt-Identity, Theme, Models, etc.

---

## Tasks

### Task 3.1: Chat-Header Komponente

- Erstelle `apps/chat/src/components/chat-header.tsx`
- **Enthält:**
  - Projekt-Icon + Name (klickbar → Dropdown)
  - Projekt-Pfad mit Copy-Button
  - Projekt-Dropdown (reuse Logik aus `AgentHeader`, Zeile 271-433)
  - Settings-Button (öffnet Settings-Panel)
  - Browser-Panel Toggle
  - Session-Manager Toggle
  - Chat-Font-Size Control
  - Copy Chat / Save Doc Buttons
  - Clear Chat Button
- **Nicht enthalten:**
  - Worktree-Actions-Dropdown (Board-spezifisch)
  - Current-Tool-Indicator (optional, kann later hinzugefügt werden)

### Task 3.2: Projekt-Erstellung (Inline)

- Button im Projekt-Dropdown: "Neues Projekt erstellen"
- Dialog/Inline-Form:
  - Projektname (required)
  - Projektpfad (required, mit File-Picker falls Electron, sonst Input)
  - Icon (optional, Lucide-Icon-Picker reuse)
  - Badge-Color (optional)
- Reuse: `initializeProject()` aus `@ui/lib/project-init`
- Reuse: `upsertAndSetCurrentProject()` aus `useAppStore`

### Task 3.3: Projekt bearbeiten (Inline)

- Reuse: `EditProjectDialog` aus `@ui/components/layout/project-switcher/components/edit-project-dialog`
- Aufruf: Klick auf Projekt-Icon im Header (wie in AgentHeader, Zeile 246-269)
- Felder: Name, Icon, Colors, Custom Icon Upload

### Task 3.4: Kein-Projekt-Zustand

- Wenn `currentProject === null`:
  - Zeige Willkommens-Screen mit:
    - "Projekt öffnen" Button
    - "Neues Projekt erstellen" Button
    - Liste der letzten Projekte (falls vorhanden)
  - Reuse Teile von `NoProjectState` aus `@ui/components/views/agent-view/components`
  - Reuse `selectAutoOpenProject()` Logik für Auto-Open

### Task 3.5: Projekt-Auto-Open bei Start

- Beim App-Start: Automatisch das zuletzt geöffnete Projekt laden
- Reuse: `selectAutoOpenProject()` Logik aus `__root.tsx`
- Reuse: `initializeProject()` für Projekt-Validierung
- Falls Projekt nicht mehr existiert: Zeige Kein-Projekt-Zustand

---

## Komponenten-Struktur

```
ChatHeader
├── ProjectIcon (klickbar → EditProjectDialog)
├── ProjectDropdown
│   ├── SearchInput
│   ├── ProjectList (filterable)
│   │   └── ProjectItem (Icon, Name, Pfad, Active-Indicator)
│   ├── Separator
│   └── "Neues Projekt" Button
├── PathDisplay + CopyButton
├── SettingsButton (→ öffnet Settings-Panel)
├── FontSizeControl
├── CopyChatButton
├── SaveDocButton
├── ClearChatButton
├── BrowserPanelToggle
└── SessionManagerToggle
```

---

## Verifikation

- [ ] Projekt-Dropdown zeigt alle Projekte mit Suche
- [ ] Projekt-Wechsel funktioniert (Sessions laden für neues Projekt)
- [ ] Neues Projekt erstellen funktioniert
- [ ] Projekt-Icon/Name bearbeiten funktioniert
- [ ] Auto-Open bei App-Start funktioniert
- [ ] Kein-Projekt-Zustand zeigt Willkommens-Screen

---

## Edge Cases

1. **Kein Projekt vorhanden:** Willkommens-Screen mit Erstellen-Option
2. **Projekt-Pfad nicht mehr gültig:** Fehler anzeigen, Option zum Entfernen
3. **Viele Projekte (>20):** Suche im Dropdown, kein Performance-Problem da nur gefilterte Liste gerendert wird
4. **Gleichzeitige Nutzung Automaker + Chat:** Projekte werden über gleichen Server synchronisiert, Settings-Sync sorgt für Konsistenz
