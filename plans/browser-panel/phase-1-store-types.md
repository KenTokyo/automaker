# Phase 1: Store & TypeScript Types

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Die Zustand-Store-Felder und TypeScript-Types definieren, die für den Browser-Panel benötigt werden. Alles pro Projekt persistent.

---

## Aktueller Stand

### app-store.ts Muster für Per-Projekt-Daten

- `worktreePanelVisibleByProject: Record<string, boolean>` (Zeile ~844)
- `lastSelectedSessionByProject: Record<string, string>` (Zeile ~610)
- `docsOpen: boolean` + `currentDocPath: string | null` (Zeile ~875)

### Bestehende Persistenz

- Zustand Store mit `persist` Middleware
- Per-Projekt-Daten als `Record<projectPath, value>`
- Einfache Getter/Setter-Pattern

---

## Benötigte Typen & Felder

### 1. Neues Interface: `BrowserTab`

**Wo**: `apps/ui/src/store/app-store.ts` (oder eigene Datei)

```
BrowserTab {
  id: string             // Eindeutige Tab-ID (uuid)
  url: string            // Aktuelle URL (z.B. "http://localhost:3000")
  title: string          // Tab-Titel (kann aus <title> kommen oder manuell)
  port: number | null    // Konfigurierter Port (z.B. 3000)
}
```

### 2. Neue Store-Felder in AppState

```
browserPanelOpen: boolean
  - Ob der Browser-Panel sichtbar ist (global toggle)
  - Default: false

browserTabsByProject: Record<string, BrowserTab[]>
  - Pro Projekt eine Liste von Browser-Tabs
  - Key: projectPath
  - Leeres Array als Default

activeBrowserTabByProject: Record<string, string>
  - Pro Projekt die aktive Tab-ID
  - Key: projectPath, Value: tab.id

browserPanelSize: number
  - Gespeicherte Panel-Breite in Prozent
  - Default: 35
  - Wird durch ResizablePanel autoSaveId teilweise abgedeckt,
    aber ein expliziter Wert ist nützlich für den Toggle
```

### 3. Neue Store-Actions

```
setBrowserPanelOpen(open: boolean): void
  - Setzt browserPanelOpen

toggleBrowserPanel(): void
  - Toggled browserPanelOpen

addBrowserTab(projectPath: string, tab: BrowserTab): void
  - Fügt einen Tab hinzu
  - Setzt diesen als aktiv

removeBrowserTab(projectPath: string, tabId: string): void
  - Entfernt einen Tab
  - Wenn es der aktive war: nächsten Tab aktivieren

setActiveBrowserTab(projectPath: string, tabId: string): void
  - Setzt den aktiven Tab

updateBrowserTab(projectPath: string, tabId: string, updates: Partial<BrowserTab>): void
  - Aktualisiert URL/Title/Port eines Tabs

getBrowserTabs(projectPath: string): BrowserTab[]
  - Getter für die Tabs eines Projekts

getActiveBrowserTab(projectPath: string): BrowserTab | null
  - Getter für den aktiven Tab
```

---

## Implementierungs-Schritte

### Schritt 1: BrowserTab Interface definieren

- In `app-store.ts` oberhalb des AppState Interfaces
- Alternativ in eigener Datei, aber Store ist einfacher

### Schritt 2: AppState erweitern

- 4 neue Felder hinzufügen
- Defaults im `create()` Initializer setzen

### Schritt 3: Actions implementieren

- Setter/Getter nach bestehendem Muster
- `immer` (falls verwendet) oder Spread-Pattern

### Schritt 4: Persist-Konfiguration prüfen

- Sicherstellen, dass die neuen Felder vom Zustand-Persist-Layer erfasst werden
- Falls `partialize` verwendet wird: Felder hinzufügen

---

## Abhängigkeiten

- Keine Abhängigkeiten zu anderen Phasen
- Muss VOR allen anderen Phasen abgeschlossen sein

---

## Risiken / Edge Cases

- Zustand persist migration: Falls ein Version-Key existiert, muss er inkrementiert werden
- Leere Tabs-Array: Graceful handling wenn kein Tab existiert
- Projekt wechseln: Aktiver Tab muss zum neuen Projekt passen
