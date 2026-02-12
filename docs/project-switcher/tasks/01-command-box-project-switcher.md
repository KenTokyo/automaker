# 📋 Planung 1: Command-Box Project Switcher

> **ULTRATHINK** - Detaillierte Planung für den Command-Box Project Switcher

**Status:** 🏁 Implementiert
**Referenz:** `docs/project-switcher/MASTER-ORCHESTRATOR.md`
**Implementierung:** CHAT 2

---

## 🎯 Ziel & Strategie

Der User arbeitet an **10+ Projekten** gleichzeitig. Der bestehende ProjectSwitcher in der linken Sidebar (64px Icons) reicht für schnelles Switching nicht aus. Es soll eine **Command-Box** (ähnlich VS Code `Ctrl+P` / Spotlight) gebaut werden, die:

- Per Tastenkürzel (`Ctrl+K` oder konfigurierbarer Shortcut) geöffnet wird
- Alle Projekte durchsuchbar macht (Fuzzy-Search)
- Kürzlich genutzte Projekte oben zeigt (MRU-Sortierung)
- Favoriten hervorhebt
- Visuelles Feedback beim Switchen gibt
- Auch Ordner auf dem Desktop öffnen kann (neues Projekt hinzufügen)

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ Was passiert, wenn der User 50+ Projekte hat?

→ Virtualisierte Liste (cmdk hat Scroll-Limit von 300px max-height). Bei >20 Projekten wird gescrollt. Fuzzy-Search reduziert die Liste sofort auf relevante Einträge.

### ✅ Was passiert bei Duplikat-Projektnamen?

→ Der Pfad wird als Subtitle angezeigt (`~/Projects/myapp` vs `~/Work/myapp`). So erkennt der User sofort, welches Projekt gemeint ist.

### ✅ Was passiert, wenn ein Projekt-Ordner nicht mehr existiert?

→ Visuelles Warnsymbol (⚠️) + Grayed-out. Bei Auswahl: Dialog "Projekt-Ordner nicht gefunden. Entfernen?"

### ✅ Was wenn der Shortcut mit anderem Tool kollidiert?

→ Shortcut ist konfigurierbar über `keyboardShortcuts` in den Settings. Default: `Ctrl+K` (Web) / `Cmd+K` (Mac).

### ✅ Muss das auch im Electron-Modus funktionieren?

→ Ja. Die Command-Box nutzt den gleichen Zustand wie der bestehende ProjectSwitcher. Electron-IPC und Web-HTTP werden über die bestehende API-Abstraktion abgedeckt.

### ✅ Was passiert wenn die Command-Box offen ist und der User Escape drückt?

→ Box schließt sich. Fokus kehrt zum vorherigen Element zurück.

---

## ⚡ Performance-Optimierung

- **Fuzzy-Search:** cmdk hat eingebaute Fuzzy-Search - keine zusätzliche Library nötig
- **Memoization:** Projektliste wird mit `useMemo` gefiltert und sortiert
- **Lazy Loading:** Command-Box wird erst beim ersten Öffnen gerendert (React.lazy oder conditional render)
- **Keyboard-First:** Sofortiges Tippen filtert, Arrow Keys navigieren, Enter wählt aus

---

## 🔄 Code-Wiederverwendung

### Bestehende Komponenten die wiederverwendet werden:

- `apps/ui/src/components/ui/command.tsx` → **cmdk Primitives** (Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut)
- `apps/ui/src/store/app-store.ts` → `projects`, `currentProject`, `projectHistory`, `upsertAndSetCurrentProject()`, `setCurrentProject()`
- `apps/ui/src/components/layout/project-switcher/components/project-switcher-item.tsx` → Icon-Rendering-Logik (Lucide Icons + Custom Icons)

### Bestehende Logik die wiederverwendet wird:

- MRU-Sortierung über `projectHistory` Array
- Projekt-Theme-Resolution über `getEffectiveTheme()`
- Keyboard Shortcut System (bereits `projectPicker: 'P'` definiert)

---

## 🧩 Komponenten & Implementierung

### Phase 1.1: ProjectCommandBox Komponente

#### 1.1.1 `ProjectCommandBox` (`apps/ui/src/components/layout/project-command-box/project-command-box.tsx`) **~350-400 Zeilen**

- **Zweck:** Haupt-Command-Box Dialog zum Projekt-Switching
- **Nutzt:** `CommandDialog`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty`
- **Sektionen in der Liste:**
  - 🔖 **Favoriten** (Projekte mit `isFavorite: true`)
  - 🕐 **Kürzlich verwendet** (Top 5 aus `projectHistory`)
  - 📁 **Alle Projekte** (alphabetisch sortiert)
  - ➕ **Neues Projekt öffnen** (am Ende, öffnet Ordner-Dialog)
- **State:** `open: boolean` (gesteuert über globalen Shortcut)
- **Props:** Keine (nutzt Zustand Store direkt)
- **Callbacks:** `onSelectProject(project)` → ruft `setCurrentProject()` auf und schließt Dialog

#### 1.1.2 `ProjectCommandItem` (`apps/ui/src/components/layout/project-command-box/project-command-item.tsx`) **~80-120 Zeilen**

- **Zweck:** Einzelnes Projekt in der Command-Liste
- **Anzeige:** Icon (Lucide oder Custom) + Projektname + Pfad (als Subtitle) + Shortcut-Badge (1-9)
- **Visuelles:** Aktives Projekt bekommt Checkmark, Favoriten bekommen Star-Icon

#### 1.1.3 `use-project-command-box.ts` (`apps/ui/src/hooks/use-project-command-box.ts`) **~60-80 Zeilen**

- **Zweck:** Hook für Command-Box Open/Close State + Keyboard Shortcut Registration
- **Logik:**
  - Globaler Keyboard-Listener für konfigurierbaren Shortcut
  - `isOpen` / `setIsOpen` State
  - `toggleOpen()` Funktion
- **Wiederverwendung:** Nutzt `keyboardShortcuts` aus app-store

#### 1.1.4 `index.ts` (`apps/ui/src/components/layout/project-command-box/index.ts`) **~3 Zeilen**

- Re-Export der Hauptkomponente

**Phase 1.1 Gesamt: ~500-600 Zeilen | 3-4 Komponenten/Dateien**

---

### Phase 1.2: Integration in Root-Layout

#### 1.2.1 Anpassung `__root.tsx` (`apps/ui/src/routes/__root.tsx`) **~15-25 Zeilen Änderung**

- **Zweck:** ProjectCommandBox im Root-Layout einbinden (damit es überall verfügbar ist)
- **Änderung:** Import + Rendering der `ProjectCommandBox` Komponente innerhalb des authentifizierten Layouts
- **Position:** Nach dem bestehenden Layout, vor `</body>` - als Portal/Dialog verfügbar auf allen Seiten

#### 1.2.2 Anpassung `app-store.ts` (`apps/ui/src/store/app-store.ts`) **~10-15 Zeilen Änderung**

- **Zweck:** `projectCommandBoxOpen: boolean` State hinzufügen (optional, kann auch lokal im Hook sein)
- **Alternativ:** Wenn der Hook lokalen State nutzt, ist keine Store-Änderung nötig
- **Empfehlung:** Lokaler State im Hook reicht aus (kein Store-Overhead)

**Phase 1.2 Gesamt: ~25-40 Zeilen Änderung | 2 Dateien**

---

### Phase 1.3: Keyboard Shortcut Integration

#### 1.3.1 Anpassung `KeyboardShortcuts` Type (`libs/types/src/settings.ts`) **~3-5 Zeilen Änderung**

- **Zweck:** Sicherstellen dass `projectPicker` Shortcut existiert (ist bereits vorhanden!)
- **Prüfung:** `projectPicker: string` existiert bereits in `KeyboardShortcuts` → ✅ Kein Änderungsbedarf

#### 1.3.2 Anpassung bestehende Shortcut-Registrierung **~10-20 Zeilen Änderung**

- **Zweck:** Den globalen Shortcut mit der Command-Box verbinden
- **Datei:** Wo auch immer die bestehenden Shortcuts registriert werden (vermutlich `__root.tsx` oder ein `use-shortcuts` Hook)
- **Änderung:** `projectPicker` Shortcut öffnet die Command-Box statt des bisherigen Verhaltens

**Phase 1.3 Gesamt: ~15-25 Zeilen Änderung | 1-2 Dateien**

---

## 📊 Zusammenfassung

| Phase      | Beschreibung                  | Neue Dateien | Geänderte Dateien | Zeilen (ca.) |
| ---------- | ----------------------------- | ------------ | ----------------- | ------------ |
| 1.1        | ProjectCommandBox Komponente  | 4            | 0                 | ~500-600     |
| 1.2        | Integration in Root-Layout    | 0            | 1-2               | ~25-40       |
| 1.3        | Keyboard Shortcut Integration | 0            | 1-2               | ~15-25       |
| **Gesamt** |                               | **4**        | **2-4**           | **~540-665** |

---

## 🗓️ Chat-Zuordnung

### CHAT 2: Implementierung Planung 1

**Phasen in diesem Chat:**

- Phase 1.1: ProjectCommandBox Komponente (~500-600 Zeilen)
- Phase 1.2: Integration in Root-Layout (~25-40 Zeilen)
- Phase 1.3: Keyboard Shortcut Integration (~15-25 Zeilen)

**Geschätzte Tokens:** ~80.000-100.000

- Codebase-Lesen & Kontext: ~30.000
- Implementierung (3 Phasen): ~40.000-50.000
- Validierung & Fixes: ~10.000-20.000

**Mitzugeben:**

- `docs/project-switcher/MASTER-ORCHESTRATOR.md`
- `docs/project-switcher/tasks/01-command-box-project-switcher.md` (diese Datei)

---

## ✅ Abnahme-Kriterien

- [x] Command-Box öffnet sich per Keyboard Shortcut
- [x] Fuzzy-Search funktioniert über Projektnamen (cmdk built-in)
- [x] MRU-Sortierung zeigt kürzlich genutzte Projekte oben
- [x] Favoriten werden in eigener Sektion angezeigt
- [x] Projekt-Switch funktioniert (aktives Projekt wechselt)
- [x] Escape schließt die Command-Box
- [x] Arrow Keys navigieren, Enter wählt aus (cmdk built-in)
- [x] Projekte zeigen Icon + Name + Pfad
- [x] "Neues Projekt öffnen" Option am Ende der Liste
- [x] TypeScript: `npx tsc --noEmit` → 0 neue Fehler (pre-existing Fehler in anderen Dateien)
