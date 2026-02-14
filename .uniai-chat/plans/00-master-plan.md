# MASTER PLAN: Project Styling & Customization System

**ULTRATHINK**

> Globale Taskdatei - Wird zu jedem Chat mitgegeben.
> Letzte Aktualisierung: 2026-02-14
> Status: PLANUNG ABGESCHLOSSEN - BEREIT ZUR IMPLEMENTIERUNG

---

## Übersicht

Automaker verwaltet 20+ Projekte in einer Agent-Sidebar. Der User möchte **pro Projekt individuelle Styling-Optionen**, damit Projekte visuell unterscheidbar sind. Es existiert bereits ein `EditProjectDialog` mit Basis-Funktionen (Icon, Farben). Dieses Feature-Set soll **erweitert und vervollständigt** werden, sodass das Styling konsistent durch die gesamte UI durchgezogen wird.

---

## Ist-Zustand (Was bereits existiert)

### Bereits implementiert:

- `EditProjectDialog` mit 2 Tabs (General + Appearance)
- `Project` Interface hat: `icon`, `customIconPath`, `badgeColor`, `backgroundColor`, `textColor`, `iconColor`
- Zustand Store-Aktionen für alle Farben (`setProjectBadgeColor`, etc.)
- `AgentHeader` nutzt Projekt-Farben (Header-Hintergrund, Border, Text, Icon)
- `ProjectSwitcherItem` nutzt Projekt-Farben (Sidebar-Icons)
- `ProjectBadge` nutzt `badgeColor` für Border
- Custom Icon Upload mit Server-Upload

### Was FEHLT (Gaps):

1. **Message-List/ChatArea** bekommt keine projektspezifische Hintergrundfarbe
2. **Session-Manager Sidebar** zeigt keine Projekt-Farben pro Session
3. **Project-Dropdown** im Header zeigt keine Farben pro Projekt-Item
4. **Input-Area** hat keine Projekt-Akzentfarbe
5. **Edit-Dialog** fehlt: Chat-Hintergrundfarbe als separates Feld (aktuell nur "Background Color" für Sidebar)
6. **ProjectBadge** nutzt nicht `backgroundColor`, `textColor`, `iconColor`

---

## Feature-Planungen (Referenzen)

| #   | Feature                               | Planungs-Datei                                                                 | Status | Chat   |
| --- | ------------------------------------- | ------------------------------------------------------------------------------ | ------ | ------ |
| 1   | Edit-Dialog erweitern (Chat-BG Farbe) | [01-edit-dialog-enhancements.md](./01-edit-dialog-enhancements.md)             | OFFEN  | CHAT 1 |
| 2   | Message-List Projekt-Hintergrund      | [02-message-list-project-bg.md](./02-message-list-project-bg.md)               | OFFEN  | CHAT 1 |
| 3   | Project-Dropdown Styling              | [03-project-dropdown-styling.md](./03-project-dropdown-styling.md)             | OFFEN  | CHAT 2 |
| 4   | Session-Manager Projekt-Farben        | [04-session-manager-project-colors.md](./04-session-manager-project-colors.md) | OFFEN  | CHAT 2 |
| 5   | Input-Area Akzentfarbe                | [05-input-area-accent.md](./05-input-area-accent.md)                           | OFFEN  | CHAT 3 |
| 6   | ProjectBadge vollständiges Styling    | [06-project-badge-full-styling.md](./06-project-badge-full-styling.md)         | OFFEN  | CHAT 3 |

---

## Chat-Aufteilung (Token-Budget)

### CHAT 1 (~40.000 Tokens)

**Features 1 + 2: Edit-Dialog Erweiterung + Message-List Hintergrund**

- Phase 1: `chatBackgroundColor` zum `Project` Interface hinzufügen
- Phase 2: Store-Aktion `setProjectChatBackgroundColor` + Persistenz
- Phase 3: `EditProjectDialog` um "Chat Background" Farbwähler erweitern
- Phase 4: `MessageList` / `ChatArea` Hintergrundfarbe durchreichen
- Phase 5: `AgentView` das `currentProject.chatBackgroundColor` an ChatArea weiterleiten

**Referenzdateien lesen:**

- `00-master-plan.md` (diese Datei)
- `01-edit-dialog-enhancements.md`
- `02-message-list-project-bg.md`

---

### CHAT 2 (~35.000 Tokens)

**Features 3 + 4: Project-Dropdown + Session-Manager Styling**

- Phase 6: Projekt-Dropdown Items im Header mit Farben (Icon, BG, Border)
- Phase 7: Session-Manager Sidebar - ProjectBadge mit vollem Styling
- Phase 8: Session-Items in der Sidebar optional eingefärbt je nach Projekt

**Referenzdateien lesen:**

- `00-master-plan.md` (diese Datei)
- `03-project-dropdown-styling.md`
- `04-session-manager-project-colors.md`

---

### CHAT 3 (~25.000 Tokens)

**Features 5 + 6: Input-Area Akzent + ProjectBadge Styling**

- Phase 9: Input-Area Border/Fokus-Ring in Projekt-Akzentfarbe
- Phase 10: ProjectBadge erweitern um `backgroundColor`, `textColor`, `iconColor`
- Phase 11: Feinschliff & Konsistenz-Check

**Referenzdateien lesen:**

- `00-master-plan.md` (diese Datei)
- `05-input-area-accent.md`
- `06-project-badge-full-styling.md`

---

## Architektur-Entscheidungen

### Datenfluss

```
Project Interface (electron.ts)
  → Zustand Store (app-store.ts)
    → Komponenten via Props/Store-Selektoren
      → AgentHeader, ChatArea, MessageList, InputArea, SessionManager, ProjectBadge
```

### Neues Feld im Project Interface

```
chatBackgroundColor?: string  // Separate Hintergrundfarbe für den Chat-Bereich
```

### Persistenz

- Alle Projekt-Styling-Felder werden über `syncSettingsToServer()` persistiert
- Gleicher Mechanismus wie bestehende Farben

### Zustand-Regeln (KRITISCH)

- **NIEMALS** neue Objekt-/Array-Referenzen in Selektoren zurückgeben
- `useShallow` für Multi-Value-Selektoren verwenden
- Farben als primitive Strings durchreichen (kein Objekt-Wrapping)

---

## temp.md Referenz

- Falls eine `temp.md` existiert, enthält sie den Kontext des vorherigen Chats
- Aktuell: Keine temp.md vorhanden

---

## Fortschritts-Tracking

- [ ] CHAT 1: Features 1+2 (Edit-Dialog + Message-List BG)
- [ ] CHAT 2: Features 3+4 (Dropdown + Session-Manager)
- [ ] CHAT 3: Features 5+6 (Input-Area + Badge)

**NEXT_PHASE_READY**
