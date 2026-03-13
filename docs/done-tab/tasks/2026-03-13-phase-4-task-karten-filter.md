# 🃏 Phase 4: Task-Karten & Filter-System

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)
**Voraussetzung:** Phase 3 (UI Store & Sidebar-Tab) muss abgeschlossen sein

---

## 🎯 Was soll diese Phase leisten?

Die einfache Liste aus Phase 3 wird durch schöne Karten ersetzt – wie kleine Kanban-Tickets. Dazu kommen eine Suchleiste, ein Kategorie-Filter (Feature, Bugfix, usw.), ein Badge-Filter und eine Sortier-Option. Damit kann der User seine erledigten Aufgaben schnell durchsuchen und filtern.

**Was bedeutet das für den User?** Der Fertig-Tab sieht jetzt richtig gut aus! Jede Aufgabe hat eine schöne Karte mit farbigem Kategorie-Badge, und man kann suchen, filtern und sortieren.

---

## 🚀 Strategie

Wir erweitern das bestehende `completed-tasks-panel.tsx` aus Phase 3. Die neuen Komponenten folgen den bestehenden Patterns:

- **Karten** → angelehnt an `SummaryCard` / `SectionCard` aus den Dashboard-Karten
- **Suche** → Pattern von `session-search-input.tsx` (Input mit Search-Icon, h-8, text-xs)
- **Filter** → Pattern von `project-filter-dropdown.tsx` (Popover mit Checkmark-Selektion)
- **Badges** → Bestehende `Badge`-Komponente mit CVA-Varianten

### Abhängigkeiten

- Phase 3 (Panel-Komponente, Store, API-Hook)
- Bestehende UI-Komponenten: `Badge`, `Input`, `Popover`, `Button`
- Lucide-Icons für Kategorie-Symbole
- `cn()` Utility für bedingte Klassen

---

## ❓ Wichtige Fragen & Antworten

**Wie sehen die Kategorie-Icons aus?**
✅ Jede Kategorie bekommt ein eigenes Lucide-Icon und eine Farbe:

- `feature` → Rocket (sky-500)
- `bugfix` → Bug (red-500)
- `improvement` → Sparkles (amber-500)
- `refactor` → Wrench (violet-500)
- `config` → Settings (slate-500)
- `docs` → FileText (emerald-500)

**Wie funktioniert die Suche?**
✅ Freitext-Suche mit 300ms Debounce (wie FileSearch-Pattern). Durchsucht Titel, Beschreibung und Summary. Leere Suche → alle anzeigen.

**Kann man mehrere Filter gleichzeitig nutzen?**
✅ Ja, Kategorie-Filter UND Badge-Filter UND Suche sind kombinierbar. Die Ergebnisse werden UND-verknüpft.

**Was passiert bei vielen Ergebnissen?**
✅ Zunächst zeigen wir alle Ergebnisse in einem scrollbaren Container. Bei >100 Ergebnissen nutzen wir die `limit`/`offset`-Paginierung aus der API. Ein "Mehr laden"-Button am Ende.

**Kann man Karten löschen?**
✅ Ja, über ein Kontext-Menü (Rechtsklick) oder einen Hover-Button. Mit Bestätigungs-Dialog.

---

## 📱 Beispiel: So sieht es aus

```
🖥️ Fertig-Tab mit Karten und Filtern:

┌─────────────────────────────────────┐
│ Erledigte Aufgaben (12)             │
├─────────────────────────────────────┤
│ 🔍 Suchen...                        │
│ [Kategorie ▾] [Badges ▾] [Neueste ▾]│
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚀 Dark Mode für Dashboard     │ │
│ │ ┌─────────┐ ┌──────────┐       │ │
│ │ │ Feature │ │ Frontend │       │ │
│ │ └─────────┘ └──────────┘       │ │
│ │ Dunkles Farbschema für das     │ │
│ │ Übersichts-Panel implementiert │ │
│ │ 📅 vor 2 Stunden               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🐛 Login-Bug behoben           │ │
│ │ ┌──────────┐ ┌─────────┐       │ │
│ │ │ Bug-Fix  │ │ Backend │       │ │
│ │ └──────────┘ └─────────┘       │ │
│ │ Session-Token wurde nicht      │ │
│ │ korrekt erneuert               │ │
│ │ 📅 vor 5 Stunden               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🔧 API-Endpunkte refactored    │ │
│ │ ┌──────────┐                    │ │
│ │ │ Refactor │                    │ │
│ │ └──────────┘                    │ │
│ │ REST-Routen auf neues Pattern  │ │
│ │ 📅 gestern                      │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧩 Komponenten & Dateien

### 4.1 Task-Karten-Komponente: `apps/ui/src/components/session-manager/completed-task-card.tsx` **~180 Zeilen**

Einzelne Karte für eine erledigte Aufgabe:

- **Container:** `rounded-lg border border-muted p-3 hover:bg-muted/30 transition-colors group cursor-pointer`
- **Layout:** Vertikal gestapelt
  - **Kopfzeile:** `flex items-start justify-between gap-2`
    - Links: Kategorie-Icon + Titel (`truncate font-medium text-sm`)
    - Rechts: Löschen-Button (nur sichtbar bei Hover: `opacity-0 group-hover:opacity-100`)
  - **Badges-Zeile:** `flex flex-wrap gap-1 mt-1.5`
    - Kategorie-Badge: Farbig, mit Icon (`Badge` Komponente, Variante je nach Kategorie)
    - Zusatz-Badges: `variant="outline"` für jeden Badge-Tag
  - **Beschreibung:** `text-xs text-muted-foreground mt-1.5 line-clamp-2` (max 2 Zeilen)
  - **Fußzeile:** `flex items-center gap-2 mt-2 text-[10px] text-muted-foreground`
    - Relative Zeit: "vor 2 Stunden" (mit `formatDistanceToNow` oder eigenem Formatter)
    - History-Link (falls vorhanden): Icon + "History" (wird in Phase 6 erweitert)

**Props:**

```typescript
interface CompletedTaskCardProps {
  task: CompletedTask;
  onDelete?: (taskId: string) => void;
  onHistoryClick?: (historyFile: string) => void;
}
```

### 4.2 Kategorie-Helfer: `apps/ui/src/components/session-manager/completed-task-utils.ts` **~60 Zeilen**

Mapping-Funktionen für Kategorien:

```typescript
// Kategorie → Icon-Komponente
export function getCategoryIcon(category: CompletedTaskCategory): LucideIcon;

// Kategorie → Farb-Klassen (für Badge-Variante)
export function getCategoryColor(category: CompletedTaskCategory): string;

// Kategorie → Lesbares Label ("feature" → "Neues Feature")
export function getCategoryLabel(category: CompletedTaskCategory): string;

// Relative Zeitanzeige ("vor 2 Stunden", "gestern", "vor 3 Tagen")
export function formatRelativeTime(isoDate: string): string;
```

### 4.3 Suchleiste: `apps/ui/src/components/session-manager/completed-tasks-search.tsx` **~50 Zeilen**

Angelehnt an `session-search-input.tsx`:

- **Input:** `h-8 text-xs` mit `startAddon={<Search className="w-3.5 h-3.5" />}`
- **Clear-Button:** `endAddon` nur wenn Suchtext vorhanden
- **Debounce:** 300ms setTimeout mit Cleanup
- **Props:**

```typescript
interface CompletedTasksSearchProps {
  value: string;
  onChange: (value: string) => void;
}
```

### 4.4 Filter-Leiste: `apps/ui/src/components/session-manager/completed-tasks-filter-bar.tsx` **~200 Zeilen**

Flex-Leiste unter der Suche mit drei Elementen:

#### Kategorie-Filter (Popover)

- Trigger: `Button variant="outline" size="sm" className="h-7 text-xs gap-1"`
  - Text: "Kategorie" oder "2 gewählt" wenn Filter aktiv
  - Aktiv: `border-sky-500/50 text-sky-600`
- Content: `w-48 p-1`
  - Jede Kategorie als Button-Zeile: Icon + Label + Checkmark wenn aktiv
  - "Alle" Button zum Zurücksetzen

#### Badge-Filter (Popover)

- Gleiche Struktur wie Kategorie-Filter
- Trigger: "Badges" oder "3 gewählt"
- Content: Liste aller verfügbaren Badge-Werte mit Checkmark

#### Sortierung (Select/Popover)

- Trigger: `Button variant="outline" size="sm" className="h-7 text-xs"`
- Optionen:
  - "Neueste zuerst" (completedAt desc) – Standard
  - "Älteste zuerst" (completedAt asc)
  - "A-Z" (title asc)
  - "Z-A" (title desc)
  - "Nach Kategorie" (category asc)

**Props:**

```typescript
interface CompletedTasksFilterBarProps {
  filter: CompletedTaskFilter;
  onFilterChange: (filter: CompletedTaskFilter) => void;
  sortField: CompletedTaskSortField;
  sortOrder: CompletedTaskSortOrder;
  onSortChange: (field: CompletedTaskSortField, order: CompletedTaskSortOrder) => void;
  availableBadges: CompletedTaskBadge[]; // Dynamisch aus geladenen Daten
}
```

### 4.5 Panel erweitern: `apps/ui/src/components/session-manager/completed-tasks-panel.tsx` **Modifizieren (~100 Zeilen Änderung)**

Das bestehende Panel aus Phase 3 wird erweitert:

- **Header-Bereich:** Titel + Anzahl (unverändert)
- **Unter Header:** Such- und Filter-Leiste einfügen
- **Liste:** Einfache Einträge durch `CompletedTaskCard` ersetzen
- **Leerer Zustand:** Unterscheidung zwischen "keine Aufgaben" und "keine Suchergebnisse"
  - Keine Aufgaben: Icon + "Noch keine erledigten Aufgaben"
  - Keine Suchergebnisse: Icon + "Keine Aufgaben gefunden" + Filter-Reset-Button
- **Löschen:** `useDeleteCompletedTask` Hook anbinden + Bestätigungs-Dialog

### 4.6 Store erweitern: `apps/ui/src/store/app-store.ts` **~15 Zeilen Änderung**

Neuer State für Filter und Sortierung:

- `completedTasksFilter` (CompletedTaskFilter) – Aktive Filter
- `completedTasksSortField` (CompletedTaskSortField) – Aktives Sortierfeld
- `completedTasksSortOrder` (CompletedTaskSortOrder) – Sortierrichtung
- Aktionen: `setCompletedTasksFilter`, `setCompletedTasksSortField`, `setCompletedTasksSortOrder`

**Wichtig:** Selektoren mit `useShallow` für Objekt-Rückgaben!

---

## ⚡ Edge Cases

| Was könnte passieren?                        | Lösung                                                |
| -------------------------------------------- | ----------------------------------------------------- |
| Suche liefert 0 Ergebnisse                   | Spezielle "Nichts gefunden"-Ansicht mit Reset-Button  |
| Kategorie hat 0 Einträge                     | Wird trotzdem im Filter angezeigt (ausgegraut)        |
| Badge-Werte sind dynamisch                   | Verfügbare Badges aus den geladenen Tasks extrahieren |
| Titel ist sehr lang (>100 Zeichen)           | `truncate` CSS-Klasse kürzt mit "..."                 |
| Beschreibung fehlt                           | Kein Beschreibungs-Bereich anzeigen                   |
| Schnelles Tippen in Suche                    | 300ms Debounce verhindert zu viele API-Calls          |
| Gleichzeitig Suche + Kategorie + Badge aktiv | UND-Verknüpfung, Server filtert serverseitig          |
| Löschen einer Karte während Filter aktiv     | Karte verschwindet, Zähler aktualisiert sich          |
| User klickt schnell hintereinander "Löschen" | Button wird nach Klick disabled bis Antwort kommt     |

---

## 🔄 Wiederverwendung

- **Badge-Komponente:** Nutzt bestehende `apps/ui/src/components/ui/badge.tsx` mit CVA-Varianten
- **Search-Pattern:** Übernommen von `session-search-input.tsx` (Input mit startAddon)
- **Filter-Pattern:** Übernommen von `project-filter-dropdown.tsx` (Popover mit Checkmarks)
- **Karten-Styling:** Angelehnt an `SummaryCard` / `SectionCard` aus Dashboard-Karten
- **Hover-Button:** Pattern von `session-list-item.tsx` (group + group-hover:opacity-100)
- **Leerer Zustand:** Design-Pattern von `DashboardEmptyState` (zentriert, Icon, Text)

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 6 – Phase 4 implementieren (~55.000 Tokens)

**Schritt 1:** `completed-task-utils.ts` erstellen

- Kategorie-Icon-Mapping
- Kategorie-Farb-Mapping
- Relative Zeitformatierung

**Schritt 2:** `completed-task-card.tsx` erstellen

- Karten-Komponente mit allen Bereichen
- Kategorie-Badge, Zusatz-Badges
- Hover-Buttons (Löschen)
- Relative Zeit

**Schritt 3:** `completed-tasks-search.tsx` erstellen

- Such-Input mit Debounce
- Clear-Button

**Schritt 4:** `completed-tasks-filter-bar.tsx` erstellen

- Kategorie-Filter-Popover
- Badge-Filter-Popover
- Sortier-Dropdown

**Schritt 5:** `completed-tasks-panel.tsx` erweitern

- Such- und Filter-Leiste einbauen
- Karten statt einfacher Liste
- "Keine Ergebnisse"-Zustand
- Löschen-Funktion anbinden

**Schritt 6:** Store erweitern

- Filter- und Sortier-State hinzufügen
- Selektoren mit `useShallow`

**Schritt 7:** TypeScript-Check

- `npx tsc --noEmit` über das UI-Paket

---

**Vorherige Phase:** [Phase 3 – UI Store & Sidebar-Tab](./2026-03-13-phase-3-ui-store-tab.md)
**Nächste Phase:** [Phase 5 – Systemprompt-Schalter](./2026-03-13-phase-5-systemprompt-schalter.md)
