# Phase 5: Inline Settings Panel

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 3
**Geschätzte Tokens:** ~60.000
**Abhängigkeiten:** Phase 1, Phase 2, Phase 3
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Settings als Slide-In Panel (Sheet/Drawer) statt eigener Route implementieren. Nur für Chat-App relevante Settings anzeigen. Das Panel öffnet über den Settings-Button im ChatHeader.

---

## Ist-Zustand (Automaker SettingsView)

Die `SettingsView` in `apps/ui/src/components/views/settings-view.tsx` hat folgende Sektionen:

| Sektion                                            | Relevant für Chat-App? | Begründung                 |
| -------------------------------------------------- | ---------------------- | -------------------------- |
| API Keys                                           | ✅ JA                  | Anthropic/Provider Keys    |
| Model Defaults                                     | ✅ JA                  | Welches Modell für Agent   |
| Providers (Claude, Cursor, Codex, Gemini, Copilot) | ✅ JA                  | Provider-Konfiguration     |
| MCP Servers                                        | ✅ JA                  | MCP für Agent              |
| Prompts                                            | ✅ JA                  | Prompt-Customization       |
| Appearance                                         | ✅ JA                  | Theme, Fonts               |
| Audio                                              | ✅ JA                  | Sound-Benachrichtigungen   |
| Keyboard                                           | ⚠️ OPTIONAL            | Shortcuts sind nützlich    |
| Account                                            | ✅ JA                  | Login/Logout               |
| Security                                           | ⚠️ OPTIONAL            | Sandbox-Warning            |
| Developer                                          | ⚠️ OPTIONAL            | Debug-Tools                |
| Terminal                                           | ❌ NEIN                | Kein Terminal in Chat-App  |
| Feature Defaults                                   | ❌ NEIN                | Kanban-spezifisch          |
| Worktrees                                          | ❌ NEIN                | Kanban-spezifisch          |
| Event Hooks                                        | ❌ NEIN                | Kanban/Pipeline-spezifisch |

Zusätzlich benötigt:
| Sektion | Quelle |
|---------|--------|
| Project Identity | `project-settings-view/project-identity-section.tsx` |
| Project Theme | `project-settings-view/project-theme-section.tsx` |
| Project Models | `project-settings-view/project-models-section.tsx` |

---

## Tasks

### Task 5.1: Settings Panel Container

- Erstelle `apps/chat/src/components/settings-panel.tsx`
- Nutzt `Sheet` aus `@ui/components/ui/sheet` (Radix-basiert)
- Öffnet von rechts als Overlay-Drawer
- Breite: ~450px auf Desktop, Vollbild auf Mobile
- Schließt mit Escape, Klick außerhalb, oder X-Button
- Enthält eigene Navigation (Tabs oder Accordion) für Sektionen

### Task 5.2: Settings Navigation

- Vertikale Tab-Liste links im Panel (wie SettingsView, aber kompakter)
- Sections:
  1. **Projekt** (Project Identity + Theme + Models)
  2. **API Keys**
  3. **Modelle** (Model Defaults)
  4. **Provider** (Claude, Cursor, Codex, Opencode, Gemini, Copilot)
  5. **MCP Server**
  6. **Prompts**
  7. **Darstellung** (Appearance)
  8. **Audio**
  9. **Account**
- Auf Mobile: Navigation als Dropdown oder Accordion

### Task 5.3: Projekt-Settings Section

- Reuse Components:
  - `ProjectIdentitySection` aus `@ui/components/views/project-settings-view/project-identity-section`
  - `ProjectThemeSection` aus `@ui/components/views/project-settings-view/project-theme-section`
  - `ProjectModelsSection` aus `@ui/components/views/project-settings-view/project-models-section`
- Zusammengeführt in einem Tab "Projekt"
- Nur wenn `currentProject` vorhanden

### Task 5.4: Reuse bestehende Settings-Sections

- Für jede relevante Section: Direkt importieren und rendern
- Import-Pfade:
  ```
  @ui/components/views/settings-view/api-keys/api-keys-section
  @ui/components/views/settings-view/model-defaults
  @ui/components/views/settings-view/providers/* (Claude, Cursor, etc.)
  @ui/components/views/settings-view/mcp-servers
  @ui/components/views/settings-view/prompts
  @ui/components/views/settings-view/appearance/appearance-section
  @ui/components/views/settings-view/audio/audio-section
  @ui/components/views/settings-view/account
  ```
- Die Sections brauchen Props aus `useAppStore` → gleiche Props wie in `SettingsView`

### Task 5.5: Settings-Button im ChatHeader

- Zahnrad-Icon (`Settings2` aus Lucide)
- Klick → `setSettingsPanelOpen(true)`
- State in Chat-Layout oder eigener Mini-Store
- Keyboard-Shortcut: `Ctrl/Cmd+,` (Standard für Settings)

### Task 5.6: Auto-Open bei fehlendem Setup

- Wenn `setupComplete === false` (kein API Key konfiguriert):
  - Settings-Panel automatisch öffnen
  - API-Keys Section aktiv
  - Hinweis-Banner: "Bitte API-Key konfigurieren"
- Wenn kein Projekt: Projekt-Section zeigen mit Erstellen-Option

---

## Layout im Panel

```
┌─────────────────────────────────────┐
│ ✕  UniAI Chat Settings              │
├──────────┬──────────────────────────┤
│ Projekt  │ [Project Identity]       │
│ API Keys │ [Project Theme]          │
│ Modelle  │ [Project Models]         │
│ Provider │                          │
│ MCP      │                          │
│ Prompts  │                          │
│ Design   │                          │
│ Audio    │                          │
│ Account  │                          │
├──────────┴──────────────────────────┤
│ [Import/Export Settings]            │
└─────────────────────────────────────┘
```

---

## Verifikation

- [ ] Settings-Panel öffnet/schließt korrekt
- [ ] Alle relevanten Settings-Sections werden angezeigt
- [ ] API-Key-Konfiguration funktioniert
- [ ] Model-Defaults können geändert werden
- [ ] Provider-Settings funktionieren
- [ ] Appearance (Theme) wechselt korrekt
- [ ] Projekt-Settings (Identity, Theme) funktionieren
- [ ] Settings werden zum Server synchronisiert
- [ ] Panel ist responsive (Mobile + Desktop)
- [ ] Ctrl+, Shortcut öffnet Panel

---

## Edge Cases

1. **Kein Projekt ausgewählt:** Projekt-Section zeigt "Kein Projekt" + Erstellen-Button
2. **Settings-Sync Konflikt:** Wenn Automaker und Chat-App gleichzeitig Settings ändern → Server ist Source of Truth, letzter Write gewinnt
3. **Panel zu schmal für Sections:** Einige Settings-Sections (z.B. Provider) haben breite Layouts → max-width oder responsive Anpassung nötig
4. **Import/Export:** `ImportExportDialog` aus SettingsView reuse → öffnet als eigener Dialog über dem Panel
