# 🗂️ Plan 3: History Panel - Orchestrator Run Collapsible Groups

ULTRATHINK

> **Status:** ✅ Implementiert
> **Master-Plan:** `2026-02-22-orchestrator-upgrade-MASTER.md`
> **Abhaengigkeit:** Plan 2 (Run ID Persistenz) muss abgeschlossen sein
> **Referenz:** UniAI Chat VS Code Extension (`history-script-list.ts`, `history-script-core.ts`, `conversation-index.ts`)
> **Ziel:** Sessions, die zum selben Orchestrator-Run gehoeren, als Collapsible Group in der History/Session-Liste darstellen.

---

## 🎯 Strategie

### Problem

Aktuell zeigt der `SessionManager` eine **flache Liste** aller Sessions. Wenn der Orchestrator 10+ Phasen durchlaeuft, hat der User 10+ einzelne Sessions in der Liste, ohne visuellen Zusammenhang. Es ist unklar, welche Sessions zusammengehoeren.

### Loesung (nach UniAI Chat Vorbild)

Die Session-Liste soll Sessions mit gleicher `orchestratorRunId` **gruppieren**:

- Ein **Collapsible Header** zeigt den Run: Titel, Phase-Count, Status-Badge, relative Zeit
- Ein **Chevron** (rechts/unten) zeigt ob der Run expanded/collapsed ist
- **Expanded:** Zeigt alle Phasen-Sessions untereinander (eingerueckt)
- **Collapsed:** Zeigt nur den Header mit Summary-Infos
- Sessions ohne `orchestratorRunId` erscheinen als **normale einzelne Eintraege**

### Was bedeutet das konkret fuer den User?

- **Vorher:** 10 separate Sessions in der Liste, kein Zusammenhang erkennbar
- **Nachher:** 1 Collapsible Group "Orchestrator Workflow (10 phases)" + 9 einzelne Nicht-Orchestrator Sessions. Der User kann die Gruppe auf/zuklappen.

---

## ❓ Proaktive F&A

**Q: Woher kommt die `orchestratorRunId` fuer die Gruppierung?**
✅ Aus Plan 2: Die Run ID wird beim Session-Erstellen serverseitig in `SessionMetadata` gespeichert und ueber `GET /api/sessions` im `SessionListItem` zurueckgeliefert.

**Q: Was passiert mit alten Sessions ohne Run ID?**
✅ Sie erscheinen als einzelne Eintraege - genau wie bisher. Kein Breaking Change.

**Q: Was passiert wenn ein Run nur 1 Session hat?**
✅ Trotzdem als Collapsible Group anzeigen (mit "1 phase"). Der User sieht so, dass der Orchestrator aktiv war.

**Q: Was passiert wenn Sessions aus verschiedenen Projekten die gleiche Run ID haben?**
✅ Unwahrscheinlich (Run IDs sind timestamp-basiert), aber falls ja: Die Gruppierung basiert auf Run ID allein. Projekt-Filter-Dropdown filtert vorher.

**Q: Soll die Expand/Collapse-State persistiert werden?**
✅ Ja, im App Store (Zustand) mit LocalStorage-Persistenz. Wie `historyExpandedRuns` in UniAI Chat.

**Q: Wie wird der Run-Status bestimmt?**
✅ Abgeleitet aus den enthaltenen Sessions:

- Mindestens eine Session hat `runningSessions.has(id)` = true → Status "Running" (blaues Badge)
- Keine Running, aber mindestens eine "done" → Status "Done"
- Alle "read" → Status "Completed"

**Q: Was ist mit Suche/Filter?**
✅ Die Gruppierung passiert NACH dem Filtern. Wenn eine Suche nur 2 von 10 Phasen matcht, wird die Gruppe mit 2 Phasen angezeigt.

---

## 🧩 Komponenten & Implementierung

### Phase 3.1: Datenmodell & Gruppierungslogik **~120 Zeilen Aenderungen**

**Betroffene Dateien:**

#### 1. `apps/ui/src/types/electron.d.ts` **~10 Zeilen Aenderungen**

- `SessionListItem` um `orchestratorRunId?: string` erweitern (schon in Plan 2 vorbereitet)
- Optional: `orchestratorIteration?: number` fuer Sortierung innerhalb der Gruppe

#### 2. `apps/ui/src/hooks/use-session-grouping.ts` **~80 Zeilen NEU**

- **Zweck:** Hook der aus einer Liste von `SessionListItem[]` gruppierte Display-Eintraege erzeugt
- **Interface:**

  ```
  OrchestratorRunGroup {
    runId: string
    sessions: SessionListItem[]  // sortiert nach Iteration/createdAt
    leadSession: SessionListItem // neueste Session fuer Titel/Zeit
    phaseCount: number
    isExpanded: boolean
  }

  DisplayEntry =
    | { type: 'single'; session: SessionListItem }
    | { type: 'orchestrator'; group: OrchestratorRunGroup }
  ```

- **Funktion `buildDisplayEntries(sessions, expandedRunIds)`:**
  - Iteriert ueber Sessions
  - Sessions mit `orchestratorRunId` werden in einer Map nach Run ID gruppiert
  - Sessions ohne Run ID werden als `type: 'single'` eingefuegt
  - Gruppen-Eintraege werden als `type: 'orchestrator'` eingefuegt
  - Innerhalb jeder Gruppe: Sessions nach `createdAt` sortieren
  - `leadSession` ist die neueste Session (fuer Anzeige von Titel/Zeit im Header)
- **Wichtig:** Stabile Sortierung - die Position des Gruppen-Headers richtet sich nach der neuesten Session darin (damit die Gruppe immer oben steht wenn sie gerade aktiv ist)

#### 3. `apps/ui/src/store/app-store.ts` **~20 Zeilen Aenderungen**

- Neues State-Feld: `expandedOrchestratorRuns: Record<string, boolean>`
- Neuer Action: `toggleOrchestratorRunExpanded(runId: string)`
- Neuer Action: `setOrchestratorRunExpanded(runId: string, expanded: boolean)`
- Persistiert via bestehender Zustand/LocalStorage Mechanismus

### Phase 3.2: SessionManager UI - Collapsible Rendering **~200 Zeilen Aenderungen**

**Betroffene Dateien:**

#### 4. `apps/ui/src/components/session-manager.tsx` **~180 Zeilen Aenderungen**

- **Import:** `useSessionGrouping` Hook, `ChevronRight`/`ChevronDown` Icons
- **Statt `displayedSessions.map()`:** Verwende `displayEntries.map()` mit Fallunterscheidung:
  - `type: 'single'` → Bisheriges Session-Item Rendering (unveraendert)
  - `type: 'orchestrator'` → Neues Orchestrator-Run-Item:
    - **Header-Element (immer sichtbar):**
      - Chevron Icon (Right wenn collapsed, Down wenn expanded)
      - Run-Titel (Titel der leadSession, oder "Orchestrator Workflow")
      - Badge: Status (Running/Completed) + Phase Count
      - Meta: Relative Zeit, Gesamte Message-Anzahl
      - onClick: `toggleOrchestratorRunExpanded(runId)`
    - **Children-Container (nur wenn expanded):**
      - Eingerueckt (padding-left)
      - Zeigt jede Phase-Session als normales Session-Item
      - Optionale Phase-Nummer Badge ("Phase 1", "Phase 2", etc.)
- **Multiselect:** Wenn ein Run-Header im Multiselect-Modus geklickt wird → Alle Sessions der Gruppe toggeln
- **Running-State:** Pruefe ob eine Session innerhalb der Gruppe in `runningSessions` ist

#### 5. `apps/ui/src/components/session-manager/orchestrator-run-header.tsx` **~80 Zeilen NEU**

- **Zweck:** Separate Komponente fuer den Collapsible Run-Header
- **Props:**
  - `group: OrchestratorRunGroup`
  - `isExpanded: boolean`
  - `onToggle: () => void`
  - `runningSessions: Set<string>`
  - `currentSessionId: string | null`
  - `sessionFontSize: number`
- **Rendering:**
  - Chevron (ChevronRight/ChevronDown)
  - Status-Badge (Running = Spinner + blau, Completed = gruen)
  - Titel (truncated)
  - Phase Count Badge ("5 phases")
  - Meta-Zeile: Relative Zeit, Total Messages
- **Styling:** Leicht andere Hintergrundfarbe als normale Sessions (z.B. `bg-muted/30` statt transparent)

### Phase 3.3: Styling & Polish **~60 Zeilen Aenderungen**

**Betroffene Dateien:**

#### 6. Styling in bestehenden Tailwind-Klassen (inline in Komponenten)

- **Run-Header:** `border-l-2 border-primary/50`, leichter Hintergrund
- **Children-Container:** `pl-4 border-l border-dashed border-muted-foreground/30`
- **Phase-Items:** Leicht eingerueckt, kleinere Schrift
- **Expand/Collapse Animation:** CSS Transition fuer `max-height` oder einfaches `hidden`/`block`
- **Badge-Farben:**
  - Running: `bg-blue-500/10 text-blue-500`
  - Completed: `bg-green-500/10 text-green-500`
  - Phase: `bg-muted text-muted-foreground`

### Zusammenfassung

| Datei                         | Typ       | Geschaetzte Zeilen |
| ----------------------------- | --------- | ------------------ |
| `electron.d.ts`               | Aenderung | ~10                |
| `use-session-grouping.ts`     | NEU       | ~80                |
| `app-store.ts`                | Aenderung | ~20                |
| `session-manager.tsx`         | Aenderung | ~180               |
| `orchestrator-run-header.tsx` | NEU       | ~80                |
| **Gesamt**                    |           | **~370**           |

---

## 📋 CHAT-Aufteilung

### CHAT 3: Phase 3.1 - Datenmodell & Gruppierungslogik (~20.000 Tokens)

**Kontext mitgeben:**

- Diese Datei (`03-orchestrator-history-collapsible.md`)
- Master-Plan (`2026-02-22-orchestrator-upgrade-MASTER.md`)
- `apps/ui/src/types/electron.d.ts` (SessionListItem)
- `apps/ui/src/store/app-store.ts` (fuer expandedOrchestratorRuns State)

**Tasks:**

1. `SessionListItem` Type erweitern (falls nicht schon in Plan 2 erledigt)
2. `use-session-grouping.ts` Hook erstellen mit `buildDisplayEntries()`
3. `app-store.ts`: expandedOrchestratorRuns State + Actions
4. TypeScript-Check: `npx tsc --noEmit` in `apps/ui`

**Geschaetzte Tokens:** ~20.000

### CHAT 4: Phase 3.2 + 3.3 - UI Rendering & Styling (~35.000 Tokens)

**Kontext mitgeben:**

- Diese Datei (`03-orchestrator-history-collapsible.md`)
- Master-Plan (`2026-02-22-orchestrator-upgrade-MASTER.md`)
- `apps/ui/src/components/session-manager.tsx` (komplette Datei)
- `apps/ui/src/hooks/use-session-grouping.ts` (aus CHAT 3)
- `apps/ui/src/store/app-store.ts` (aktualisiert aus CHAT 3)

**Tasks:**

1. `orchestrator-run-header.tsx` Komponente erstellen
2. `session-manager.tsx` umbauen: `displayEntries.map()` statt `displayedSessions.map()`
3. Collapsible Toggle-Logik implementieren
4. Multiselect-Integration fuer Orchestrator-Gruppen
5. Running-State Propagation an Gruppen-Header
6. Styling: Badges, Einrueckung, Hintergrund, Animations
7. TypeScript-Check: `npx tsc --noEmit` in `apps/ui`

**Geschaetzte Tokens:** ~35.000

---

## ⚡ Edge Cases

1. **Leere Gruppe (alle Sessions geloescht):** Gruppe wird nicht angezeigt wenn keine Sessions mehr drin sind
2. **Einzelne Session in Gruppe:** Wird trotzdem als Collapsible Group gezeigt (zeigt Orchestrator-Kontext)
3. **Laufende Session in collapsed Gruppe:** Der Header zeigt trotzdem den "Running" Status via Badge + Spinner
4. **Session-Loeschung aus Gruppe:** Wenn die leadSession geloescht wird, faellt die naechste Session als leadSession nach
5. **Parallele Orchestrator-Runs:** Verschiedene Run IDs → verschiedene Gruppen. Kein Konflikt.
6. **Archivierte Orchestrator-Sessions:** Wenn alle Sessions eines Runs archiviert werden, erscheint die Gruppe im "Archived" Tab
7. **Gemischte Archivierung:** Wenn nur einige Sessions eines Runs archiviert sind → Gruppe wird in beiden Tabs gezeigt (mit jeweiligen Sessions). ALTERNATIVE: Gruppe nur im Tab anzeigen wo die Mehrheit der Sessions ist. -> Einfachste Loesung: Jede Session bleibt in ihrem Tab, Gruppen werden pro Tab gebildet.
8. **Search Highlighting:** Wenn eine Suche nur einige Phasen matcht, sollte die Gruppe trotzdem angezeigt werden (mit den gematchten Phasen)
9. **Session-Erstellung waehrend expanded Gruppe:** Neue Session mit gleicher Run ID wird automatisch in die Gruppe eingefuegt beim naechsten Render

---

## 🔄 Code-Wiederverwendung

- **UniAI Chat Referenz:** `buildConversationDisplayEntries()` Logik wird 1:1 portiert als React Hook
- **UniAI Chat Referenz:** `buildOrchestratorRunHeaderHtml()` wird zu React Komponente `OrchestratorRunHeader`
- **UniAI Chat Referenz:** `isOrchestratorRunExpanded()` wird zu Zustand-Selector
- **UniAI Chat Referenz:** `getOrchestratorRunStatus()` wird als Helper-Funktion im Hook uebernommen
- Bestehende Session-Item Rendering bleibt fuer `type: 'single'` und fuer Phase-Items innerhalb der Gruppe

---

## ✅ Abnahmekriterien

- [x] Sessions mit gleicher `orchestratorRunId` werden als Collapsible Group angezeigt
- [x] Group Header zeigt: Titel, Phase Count, Status Badge, relative Zeit
- [x] Chevron-Click toggelt expand/collapse
- [x] Expand/Collapse State wird persistiert (ueberleben Page Reload)
- [x] Running-State wird im Group Header angezeigt (Spinner + Badge)
- [x] Normale Sessions ohne Run ID bleiben unveraendert
- [x] Multiselect funktioniert mit Orchestrator-Gruppen
- [x] Search/Filter funktioniert mit Orchestrator-Gruppen
- [x] Archivierte Sessions in Gruppen erscheinen korrekt
- [x] TypeScript fehlerfrei
