# 📋 Planung 3: Session-Suche & Filterung

> **ULTRATHINK** - Detaillierte Planung für Suche und Filterung von Sessions/Chats

**Status:** 🟡 Geplant
**Referenz:** `docs/project-switcher/MASTER-ORCHESTRATOR.md`
**Implementierung:** CHAT 4

---

## 🎯 Ziel & Strategie

Der User möchte:

1. **Suche:** Über alle Sessions hinweg nach Name/Inhalt suchen
2. **Filter nach Projekt:** Nur Sessions eines bestimmten Projekts anzeigen
3. **Kombination:** Suche + Filter gleichzeitig nutzbar

**Aktueller Stand:** Die Session-Liste (`SessionManager`) zeigt alle Sessions des aktuellen Zustands. Es gibt keine Suche und keinen Projekt-Filter. Die API liefert alle Sessions ohne Filtermöglichkeit.

**Strategie:**

- **Client-Side Filtering** für Projekt-Filter (Daten sind bereits vorhanden)
- **Client-Side Search** für Name/Preview-Suche (Daten sind bereits vorhanden)
- **Optional Backend:** Für Volltext-Suche über Nachrichteninhalte (Server-Route erweitern)

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ Soll die Suche auch Nachrichteninhalte durchsuchen?

→ **Phase 1:** Nur über Session-Name und Preview (client-side, sofort). **Phase 2 (Future):** Volltext über Nachrichteninhalte (benötigt Server-Endpoint). Für jetzt reicht Phase 1.

### ✅ Was passiert, wenn kein Ergebnis gefunden wird?

→ Empty State: "Keine Sessions gefunden" mit Vorschlag, den Filter zu entfernen oder die Suche anzupassen.

### ✅ Bleibt der Filter bestehen wenn man das Projekt wechselt?

→ Nein. Beim Projekt-Wechsel wird der Projekt-Filter automatisch auf das neue Projekt gesetzt (oder auf "Alle Projekte" zurückgesetzt). Suche bleibt bestehen.

### ✅ Was passiert mit archivierten Sessions beim Filtern?

→ Filter funktioniert auf der aktuell sichtbaren Tab (Aktiv/Archiviert). Beide Tabs unterstützen Suche und Projekt-Filter unabhängig.

### ✅ Performance bei 500+ Sessions mit Suche?

→ Client-Side Filtering mit `useMemo` + Debounce auf Search-Input (300ms). Die cmdk-basierte Suche ist optimiert für schnelle Filterung. Kein Performance-Problem erwartet unter 1000 Sessions.

### ✅ Werden Filter-Einstellungen persistiert?

→ Nein. Filter sind transient (session-only). Beim Reload werden sie zurückgesetzt. Das ist Standard-Verhalten für Filter-UIs.

---

## ⚡ Performance-Optimierung

- **Debounced Search:** `useDebounce(searchTerm, 300)` - verhindert Filterung bei jedem Tastendruck
- **Memoized Filtering:** `useMemo` für gefilterte Session-Liste
- **Kein zusätzlicher API-Call:** Alles client-side basierend auf bereits geladenen Daten
- **Lazy Filter UI:** Filter-Dropdown wird erst beim Klick gerendert

---

## 🔄 Code-Wiederverwendung

### Bestehende Komponenten:

- `apps/ui/src/components/session-manager.tsx` → Hauptkomponente die angepasst wird
- `apps/ui/src/components/ui/command.tsx` → Für den Projekt-Filter-Dropdown (cmdk-basiert, optional)
- `apps/ui/src/hooks/use-project-lookup.ts` → Aus Planung 2 (Projekt-Name Lookup)

### Bestehende Logik:

- Session-Daten kommen über React Query (`useSessions`)
- `projectPath` ist in jedem `SessionListItem` vorhanden

---

## 🧩 Komponenten & Implementierung

### Phase 3.1: Search Input in Session Manager

#### 3.1.1 `SessionSearchInput` (`apps/ui/src/components/session-manager/session-search-input.tsx`) **~60-80 Zeilen**

- **Zweck:** Such-Input-Feld oben in der Session-Liste
- **Anzeige:**
  - Search-Icon (🔍) links
  - Input-Feld mit Placeholder "Chats durchsuchen..."
  - Clear-Button (X) rechts, wenn Text eingegeben
- **Props:** `value: string`, `onChange: (value: string) => void`, `onClear: () => void`
- **Styling:** Glass-Morphism passend zum bestehenden Design, `backdrop-blur`, `border-white/10`
- **Keyboard:** `Ctrl+F` fokussiert das Suchfeld (innerhalb des Session-Panels)

#### 3.1.2 `useSessionSearch` Hook (`apps/ui/src/hooks/use-session-search.ts`) **~40-60 Zeilen**

- **Zweck:** Verwaltet Such-State und Debouncing
- **Returns:**
  - `searchTerm: string` (aktueller Suchbegriff)
  - `debouncedSearchTerm: string` (debounced für Filterung)
  - `setSearchTerm: (term: string) => void`
  - `clearSearch: () => void`
- **Logik:** `useDebounce` mit 300ms Verzögerung
- **Wiederverwendbar:** Kann auch für andere Suchen im Projekt genutzt werden

**Phase 3.1 Gesamt: ~100-140 Zeilen | 2 neue Dateien**

---

### Phase 3.2: Projekt-Filter Dropdown

#### 3.2.1 `ProjectFilterDropdown` (`apps/ui/src/components/session-manager/project-filter-dropdown.tsx`) **~120-160 Zeilen**

- **Zweck:** Dropdown zum Filtern nach Projekt
- **Anzeige:**
  - Button mit aktuellem Filter: "Alle Projekte" oder "[Projektname]"
  - Dropdown-Liste mit allen Projekten
  - "Alle Projekte" Option oben (Standard)
  - Projekte sortiert: Favoriten zuerst, dann alphabetisch
  - Projekt-Icon + Name in jeder Option
  - Anzahl der Sessions pro Projekt als Badge
- **Props:** `selectedProjectPath: string | null`, `onChange: (projectPath: string | null) => void`, `sessionCounts: Record<string, number>`
- **UI-Pattern:** Popover mit Listbox (ShadcnUI-Primitives nutzen)
- **Keyboard:** Arrow Keys navigieren, Enter wählt aus

#### 3.2.2 `useSessionFilter` Hook (`apps/ui/src/hooks/use-session-filter.ts`) **~60-80 Zeilen**

- **Zweck:** Verwaltet Filter-State und wendet Filter auf Sessions an
- **Returns:**
  - `filterProjectPath: string | null`
  - `setFilterProjectPath: (path: string | null) => void`
  - `filteredSessions: SessionListItem[]` (gefiltert + durchsucht)
  - `sessionCountByProject: Record<string, number>`
- **Logik:**
  - Nimmt `sessions: SessionListItem[]`, `searchTerm: string`, `filterProjectPath: string | null`
  - Filtert nach Projekt (wenn gesetzt)
  - Filtert nach Suchbegriff (Name + Preview, case-insensitive)
  - Berechnet Session-Counts pro Projekt
  - Alles in `useMemo` gewrapped

**Phase 3.2 Gesamt: ~180-240 Zeilen | 2 neue Dateien**

---

### Phase 3.3: Integration in SessionManager

#### 3.3.1 Anpassung `SessionManager` (`apps/ui/src/components/session-manager.tsx`) **~50-80 Zeilen Änderung**

- **Zweck:** Suche und Filter in den bestehenden SessionManager einbauen
- **Änderungen:**
  - Import der neuen Komponenten und Hooks
  - `useSessionSearch()` und `useSessionFilter()` Hooks einbinden
  - `SessionSearchInput` oberhalb der Session-Liste platzieren
  - `ProjectFilterDropdown` neben der Suche (in einer Toolbar-Zeile)
  - Session-Liste nutzt jetzt `filteredSessions` statt `sessions`
  - Toolbar-Layout: `[Search Input] [Project Filter Dropdown]`
- **Layout-Anpassung:**
  - Neue Toolbar-Zeile zwischen Tabs und Session-Liste
  - `flex` Layout: Suche nimmt restlichen Platz, Filter hat feste Breite
  - Sticky Header: Toolbar bleibt oben beim Scrollen

#### 3.3.2 Anpassung Session-Count Anzeige **~10-15 Zeilen Änderung**

- **Datei:** `apps/ui/src/components/session-manager.tsx`
- **Zweck:** Session-Count im Tab-Header aktualisieren (zeigt gefilterte Anzahl)
- **Änderung:** `Active (12)` → `Active (5 von 12)` wenn Filter aktiv

**Phase 3.3 Gesamt: ~60-95 Zeilen Änderung | 1 geänderte Datei**

---

## 📊 Zusammenfassung

| Phase      | Beschreibung                   | Neue Dateien | Geänderte Dateien | Zeilen (ca.) |
| ---------- | ------------------------------ | ------------ | ----------------- | ------------ |
| 3.1        | Search Input + Hook            | 2            | 0                 | ~100-140     |
| 3.2        | Projekt-Filter Dropdown + Hook | 2            | 0                 | ~180-240     |
| 3.3        | Integration in SessionManager  | 0            | 1                 | ~60-95       |
| **Gesamt** |                                | **4**        | **1**             | **~340-475** |

---

## 🗓️ Chat-Zuordnung

### CHAT 4: Implementierung Planung 3 + 4

**Phasen in diesem Chat (aus Planung 3):**

- Phase 3.1: Search Input (~100-140 Zeilen)
- Phase 3.2: Projekt-Filter Dropdown (~180-240 Zeilen)
- Phase 3.3: Integration in SessionManager (~60-95 Zeilen)

**Phasen in diesem Chat (aus Planung 4):**

- Phase 4.1: UI-Refinement (~50-80 Zeilen)
- Phase 4.2: Final Testing & Cleanup (~20-40 Zeilen)

**Geschätzte Tokens (gesamt CHAT 4):** ~90.000-120.000

- Codebase-Lesen & Kontext: ~25.000
- Implementierung Planung 3 (3 Phasen): ~35.000-45.000
- Implementierung Planung 4 (2 Phasen): ~15.000-25.000
- Validierung & Fixes: ~15.000-25.000

**Mitzugeben:**

- `docs/project-switcher/MASTER-ORCHESTRATOR.md`
- `docs/project-switcher/tasks/03-session-search-filtering.md` (diese Datei)
- `docs/project-switcher/tasks/04-integration-ui-refinement.md`

---

## ✅ Abnahme-Kriterien

- [ ] Such-Input zeigt "Chats durchsuchen..." Placeholder
- [ ] Suche filtert nach Session-Name und Preview-Text
- [ ] Suche ist debounced (kein Flackern bei schnellem Tippen)
- [ ] Clear-Button löscht die Suche
- [ ] Projekt-Filter Dropdown zeigt alle Projekte mit Session-Count
- [ ] "Alle Projekte" ist Standard-Option
- [ ] Projekt-Filter + Suche kombinierbar
- [ ] Empty State wenn keine Sessions gefunden
- [ ] Tab-Header zeigt gefilterte Anzahl
- [ ] Filter wird bei Projekt-Wechsel zurückgesetzt
- [ ] TypeScript: `npx tsc --noEmit` → 0 Fehler
