# 📋 Planung 4: Integration & UI-Refinement

> **ULTRATHINK** - Detaillierte Planung für die finale Integration aller Komponenten und UI-Feinschliff

**Status:** 🟡 Geplant
**Referenz:** `docs/project-switcher/MASTER-ORCHESTRATOR.md`
**Implementierung:** CHAT 4 (zusammen mit Planung 3)

---

## 🎯 Ziel & Strategie

Nachdem Planungen 1-3 implementiert sind, müssen alle Teile zu einem **kohärenten Ganzen** zusammengeführt werden:

1. **Cross-Component Communication:** Command-Box ↔ Session-Filter ↔ Sidebar synchronisieren
2. **UI-Konsistenz:** Einheitliches Design-Language über alle neuen Komponenten
3. **Responsive Verhalten:** Alle neuen Komponenten müssen auf Compact-Screens funktionieren
4. **Keyboard-Flow:** Durchgängige Keyboard-Navigation über alle neuen Features
5. **Cleanup & Performance:** Dead-Code entfernen, finale Optimierungen

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ Was passiert, wenn der User über die Command-Box ein Projekt wechselt - wird der Session-Filter aktualisiert?

→ Ja. Beim Projekt-Wechsel über die Command-Box wird der Session-Projekt-Filter auf "Alle Projekte" zurückgesetzt (Standard-Verhalten). Der User sieht sofort die Sessions des neuen Projekts.

### ✅ Was passiert bei gleichzeitigem Öffnen von Command-Box und anderen Modals?

→ Die Command-Box ist ein Dialog (Portal-Rendering, z-index 60+). Andere offene Modals (Edit Project, etc.) werden durch den Backdrop der Command-Box visuell überlagert. Bei Öffnen der Command-Box werden keine anderen Modals geschlossen - aber Escape schließt immer nur das oberste Modal.

### ✅ Wie verhält sich die Command-Box auf Compact-Screens (<1240px)?

→ Die Command-Box funktioniert identisch auf allen Screen-Größen. Da sie als zentrierter Dialog gerendert wird (nicht in Sidebar/ProjectSwitcher eingebettet), gibt es keine responsive Probleme. Breite: `min(90vw, 640px)`.

### ✅ Was passiert, wenn der User schnell hintereinander Projekte wechselt?

→ Der Projekt-Wechsel über `setCurrentProject()` ist synchron (Zustand Store). Die Session-Liste reagiert sofort über den Store-Subscription. Kein Debouncing nötig beim Wechsel selbst, nur bei der Suche.

### ✅ Werden Keyboard Shortcuts beim Tippen in der Suche ausgelöst?

→ Nein. Wenn der Fokus auf einem Input liegt (Search, Command-Box Input), werden globale Keyboard Shortcuts unterdrückt. Das ist Standard-Verhalten der bestehenden Shortcut-Logik.

---

## ⚡ Performance-Optimierung

- **Bundle-Split:** Command-Box als lazy-loaded Chunk (`React.lazy`) - wird erst beim ersten Öffnen geladen
- **Zustand Selector:** Nur die benötigten Slices aus dem Store subscriben (`useAppStore(state => state.projects)`)
- **Avoid Re-Renders:** Session-Filter und Command-Box haben isolierte States - Änderungen am einen triggern kein Re-Render am anderen
- **Event Cleanup:** Alle globalen Keyboard-Listener werden in `useEffect` Cleanups entfernt

---

## 🔄 Code-Wiederverwendung

### Aus Planung 1:

- `useProjectCommandBox` Hook → Open/Close State für Command-Box
- `ProjectCommandBox` → Dialog-Rendering

### Aus Planung 2:

- `useProjectLookup` Hook → Projekt-Name-Auflösung (wird in Session-Filter und Badge geteilt)
- `ProjectBadge` → Projekt-Anzeige in Session-Cards

### Aus Planung 3:

- `useSessionSearch` Hook → Such-State
- `useSessionFilter` Hook → Filter-Logik
- `SessionSearchInput` + `ProjectFilterDropdown` → Filter-UI

### Bestehende Komponenten:

- `apps/ui/src/routes/__root.tsx` → Root-Layout für Command-Box Platzierung
- `apps/ui/src/components/session-manager.tsx` → Session-Liste (wurde bereits in Planung 2+3 angepasst)
- `apps/ui/src/store/app-store.ts` → Zustand Store

---

## 🧩 Komponenten & Implementierung

### Phase 4.1: Cross-Component Synchronisation

#### 4.1.1 Anpassung `__root.tsx` - Finale Integration (`apps/ui/src/routes/__root.tsx`) **~20-30 Zeilen Änderung**

- **Zweck:** Sicherstellen, dass die Command-Box korrekt im Root-Layout sitzt
- **Änderungen:**
  - Prüfen dass `ProjectCommandBox` nach allen anderen Layout-Elementen gerendert wird
  - Z-Index Validierung: Command-Box Dialog muss über allem liegen (z-60+)
  - Sicherstellen dass Keyboard-Shortcut (`projectPicker`) die Command-Box triggert

#### 4.1.2 Synchronisation: Projekt-Wechsel → Session-Filter Reset **~15-25 Zeilen Änderung**

- **Datei:** `apps/ui/src/components/session-manager.tsx` oder relevanter Hook
- **Zweck:** Wenn das aktive Projekt wechselt (egal ob über Command-Box, Sidebar oder Shortcut), den Session-Projekt-Filter zurücksetzen
- **Logik:**
  - `useEffect` das auf `currentProject` (aus app-store) reagiert
  - Bei Änderung: `setFilterProjectPath(null)` → zeigt "Alle Projekte"
  - Suche bleibt bestehen (nur Filter wird zurückgesetzt)

#### 4.1.3 Synchronisation: Command-Box ↔ ProjectSwitcher Highlight **~10-15 Zeilen Änderung**

- **Datei:** `apps/ui/src/components/layout/project-switcher/project-switcher.tsx`
- **Zweck:** Wenn über die Command-Box ein Projekt gewechselt wird, muss der ProjectSwitcher in der Sidebar das korrekte Projekt hervorheben
- **Prüfung:** Da beide `currentProject` aus dem Store nutzen, sollte dies automatisch funktionieren
- **Falls nötig:** Keine Änderung, da Zustand Store reaktiv ist

**Phase 4.1 Gesamt: ~45-70 Zeilen Änderung | 2-3 Dateien**

---

### Phase 4.2: UI-Konsistenz & Design-Refinement

#### 4.2.1 Visuelles Audit aller neuen Komponenten **~30-50 Zeilen Änderung (verteilt)**

- **Zweck:** Sicherstellen dass alle neuen UI-Elemente dem bestehenden Design-Language folgen
- **Prüfpunkte:**
  - Glass-Morphism konsistent: `backdrop-blur`, `bg-white/5`, `border-white/10`
  - Focus-States: Alle interaktiven Elemente haben sichtbare Focus-Indikatoren
  - Transition-Timing: Konsistente Animationen (`duration-200`, `ease-out`)
  - Spacing: Einheitliche Padding/Margin (`p-3`, `gap-2`, etc.)
  - Text-Styles: `text-sm`, `text-muted-foreground` konsistent
- **Betroffene Dateien:**
  - `project-command-box.tsx`
  - `project-command-item.tsx`
  - `project-badge.tsx`
  - `session-search-input.tsx`
  - `project-filter-dropdown.tsx`

#### 4.2.2 Dark/Light Mode Kompatibilität **~10-20 Zeilen Änderung (falls nötig)**

- **Zweck:** Sicherstellen dass alle neuen Komponenten in beiden Modi korrekt aussehen
- **Prüfung:** Die bestehende App nutzt CSS-Variablen aus ShadcnUI-Theming
- **Falls nötig:** Tailwind-Klassen anpassen die hardcoded Farben statt CSS-Variablen nutzen
- **Beispiel:** `text-white` → `text-foreground`, `bg-gray-800` → `bg-card`

**Phase 4.2 Gesamt: ~40-70 Zeilen Änderung | 5-7 Dateien**

---

### Phase 4.3: Responsive & Accessibility Finalisierung

#### 4.3.1 Compact-Screen Validierung **~15-25 Zeilen Änderung**

- **Zweck:** Alle neuen Komponenten auf <1240px Breakpoint testen und anpassen
- **Prüfpunkte:**
  - Command-Box: Zentrierter Dialog, Breite `min(90vw, 640px)` - sollte automatisch funktionieren
  - Session Search: Volle Breite im Session-Panel
  - Filter Dropdown: Volle Breite oder angepasste Breite auf kleinen Screens
  - Project Badge: Bei sehr schmalen Cards ausblenden (`hidden sm:block`)
- **Betroffene Dateien:** Session-Manager Komponenten

#### 4.3.2 Accessibility (a11y) Audit **~15-25 Zeilen Änderung**

- **Zweck:** ARIA Labels, Keyboard Navigation, Screen Reader Kompatibilität
- **Prüfpunkte:**
  - Command-Box: `aria-label="Projekt wechseln"`, `role="dialog"`
  - Search Input: `aria-label="Chats durchsuchen"`, Clear-Button mit Label
  - Filter Dropdown: `aria-expanded`, `aria-haspopup="listbox"`
  - Project Badge: `aria-label` mit Projektname
  - Keyboard Flow: Tab-Reihenfolge logisch (Search → Filter → Session-Liste)
- **cmdk Integration:** cmdk hat bereits gute a11y Defaults - nur Anpassung der Labels

**Phase 4.3 Gesamt: ~30-50 Zeilen Änderung | 3-5 Dateien**

---

### Phase 4.4: Cleanup & Finale Validierung

#### 4.4.1 Dead-Code Removal **~0-20 Zeilen Entfernung**

- **Zweck:** Ungenutzten Code aus der Implementierung entfernen
- **Prüfpunkte:**
  - Keine ungenutzten Imports in geänderten Dateien
  - Keine auskommentierten Code-Blöcke
  - Keine TODO-Kommentare die noch offen sind

#### 4.4.2 TypeScript-Validierung **~0-10 Zeilen Fix**

- **Zweck:** `npx tsc --noEmit` muss 0 Fehler haben
- **Aktion:** Finale TS-Prüfung über gesamten Workspace

#### 4.4.3 Import-Konventionen prüfen **~0-10 Zeilen Fix**

- **Zweck:** Alle neuen Imports folgen der CLAUDE.md Konvention
- **Prüfung:** Imports aus `@automaker/*` Packages statt relativen Pfaden

**Phase 4.4 Gesamt: ~0-40 Zeilen | 0-5 Dateien**

---

## 📊 Zusammenfassung

| Phase      | Beschreibung                      | Geänderte Dateien | Zeilen (ca.) |
| ---------- | --------------------------------- | ----------------- | ------------ |
| 4.1        | Cross-Component Synchronisation   | 2-3               | ~45-70       |
| 4.2        | UI-Konsistenz & Design-Refinement | 5-7               | ~40-70       |
| 4.3        | Responsive & Accessibility        | 3-5               | ~30-50       |
| 4.4        | Cleanup & Finale Validierung      | 0-5               | ~0-40        |
| **Gesamt** |                                   | **10-20**         | **~115-230** |

---

## 🗓️ Chat-Zuordnung

### CHAT 4: Implementierung Planung 3 + 4

**Phasen aus Planung 4 in diesem Chat:**

- Phase 4.1: Cross-Component Synchronisation (~45-70 Zeilen)
- Phase 4.2: UI-Konsistenz & Design-Refinement (~40-70 Zeilen)
- Phase 4.3: Responsive & Accessibility (~30-50 Zeilen)
- Phase 4.4: Cleanup & Finale Validierung (~0-40 Zeilen)

**Geschätzte Tokens (Planung 4 Anteil):** ~25.000-35.000

- Lesen & Prüfen der implementierten Komponenten: ~8.000
- Refinement & Fixes (4 Phasen): ~12.000-18.000
- Finale Validierung: ~5.000-9.000

**Mitzugeben:**

- `docs/project-switcher/MASTER-ORCHESTRATOR.md`
- `docs/project-switcher/tasks/03-session-search-filtering.md`
- `docs/project-switcher/tasks/04-integration-ui-refinement.md` (diese Datei)

---

## ✅ Abnahme-Kriterien

- [ ] Projekt-Wechsel über Command-Box aktualisiert ProjectSwitcher Highlight
- [ ] Session-Projekt-Filter wird bei Projekt-Wechsel zurückgesetzt
- [ ] Suche bleibt bei Projekt-Wechsel bestehen
- [ ] Keyboard Shortcuts funktionieren nicht während Input-Fokus
- [ ] Alle neuen Komponenten haben konsistentes Glass-Morphism Design
- [ ] Dark/Light Mode funktioniert für alle neuen Komponenten
- [ ] Command-Box funktioniert auf Compact-Screens (<1240px)
- [ ] Alle ARIA Labels sind korrekt gesetzt
- [ ] Tab-Navigation ist logisch und vollständig
- [ ] Kein ungenutzter Code oder offene TODOs
- [ ] TypeScript: `npx tsc --noEmit` → 0 Fehler
- [ ] Imports folgen CLAUDE.md Konventionen
