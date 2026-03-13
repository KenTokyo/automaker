# 🖥️ Phase 3: UI Store & Sidebar-Tab

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)
**Voraussetzung:** Phase 1 (Typen) und Phase 2 (Server-Routen) müssen abgeschlossen sein

---

## 🎯 Was soll diese Phase leisten?

In der linken Seitenleiste (wo auch "Sitzungen", "Dokumente" und "Übersicht" stehen) kommt ein neuer Tab dazu: **"Fertig"**. Wenn man draufklickt, sieht man eine Liste der erledigten Aufgaben. Außerdem wird der Zustand (also welche Aufgaben geladen sind, welche Filter aktiv sind usw.) im Zustand-Store verwaltet.

**Was bedeutet das für den User?** Ab jetzt gibt es den neuen Tab! Man kann draufklicken und sieht erstmal eine einfache Liste der erledigten Aufgaben. Die schönen Karten und Filter kommen in Phase 4.

---

## 🚀 Strategie

Drei Bereiche werden verändert:

1. **Store-Typen** – Der `LeftPanelTab`-Typ bekommt einen neuen Wert
2. **Session-Manager** – Der Tab-Trigger und das Panel werden eingebaut
3. **API-Anbindung** – Ein Hook holt die Daten vom Server

### Abhängigkeiten

- Phase 1 Typen (`CompletedTask`, `CompletedTaskFilter` usw.)
- Phase 2 Server-Routen (API-Endpunkte)
- Zustand Store (`apps/ui/src/store/app-store.ts`)
- Session-Manager (`apps/ui/src/components/session-manager.tsx`)
- Bestehendes `LeftPanelTab` System

---

## ❓ Wichtige Fragen & Antworten

**Wo erscheint der Tab genau?**
✅ In der linken Seitenleiste, als vierter Tab neben "Sitzungen", "Dokumente" und "Übersicht". Icon: CheckCircle (Haken-Kreis) von Lucide.

**Braucht der Tab auch in der rechten Seitenleiste zu erscheinen?**
✅ Ja, aber erst als Erweiterung. Die rechte Seitenleiste hat ein anderes Layout (Agent-View mit Panels). Dort kommt es als eigenes Panel in Phase 4 oder als Erweiterung der Dashboard-Karten.

**Was sieht man, wenn noch keine Aufgaben fertig sind?**
✅ Ein freundlicher Leerer-Zustand: "Noch keine erledigten Aufgaben. Sobald die KI etwas fertigstellt, erscheint es hier."

**Wie oft werden die Daten aktualisiert?**
✅ Beim Tab-Wechsel werden die Daten neu geladen. Zusätzlich kommen Echtzeit-Updates über WebSocket, wenn eine neue Aufgabe gespeichert wird.

**Was passiert, wenn der Server nicht erreichbar ist?**
✅ Der Tab zeigt "Verbindung zum Server nicht möglich" mit einem Wiederholen-Button an.

---

## 📱 Beispiel: So sieht der Tab aus

```
🖥️ Linke Seitenleiste:

┌──────────────────────────────┐
│ [💬 Sitzungen] [📄 Doks]    │
│ [📊 Übersicht] [✅ Fertig]  │
├──────────────────────────────┤
│                              │
│  Erledigte Aufgaben (12)     │
│                              │
│  ┌────────────────────────┐  │
│  │ ✅ Dark Mode Dashboard │  │
│  │ Feature · vor 2 Std    │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🐛 Login-Bug behoben   │  │
│  │ Bugfix · vor 5 Std     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🔧 API Refactoring     │  │
│  │ Refactor · gestern     │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

---

## 🧩 Komponenten & Dateien

### 3.1 Store-Typ erweitern: `apps/ui/src/store/types/ui-types.ts` **~3 Zeilen Änderung**

- `LeftPanelTab` Union erweitern: `'sessions' | 'docs' | 'overview' | 'completed'`

### 3.2 App-Store erweitern: `apps/ui/src/store/app-store.ts` **~20 Zeilen Änderung**

- Neuer State:
  - `completedTasks` (CompletedTask[]) – Geladene Aufgaben
  - `completedTasksLoading` (boolean) – Ladezustand
  - `completedTasksError` (string | null) – Fehlermeldung
- Neue Aktionen:
  - `setCompletedTasks(tasks)` – Aufgaben setzen
  - `addCompletedTask(task)` – Einzelne Aufgabe hinzufügen (für Echtzeit-Updates)
  - `removeCompletedTask(taskId)` – Aufgabe entfernen
  - `setCompletedTasksLoading(loading)` – Ladezustand setzen
  - `setCompletedTasksError(error)` – Fehler setzen

### 3.3 API-Hook: `apps/ui/src/hooks/use-completed-tasks.ts` **~120 Zeilen**

- `useCompletedTasks(filter?)` – Haupthook
  - Nutzt `fetch()` um `/api/completed-tasks` aufzurufen
  - Parameter aus `CompletedTaskFilter` als Query-String
  - Ergebnis in den Store schreiben
  - Bei Fehler: Store-Error setzen
  - Lädt automatisch beim Mounten und bei Filter-Änderungen
- `useCreateCompletedTask()` – Hook zum Erstellen
  - POST an `/api/completed-tasks`
  - Bei Erfolg: Aufgabe in den Store einfügen
  - Bei Fehler: Toast-Benachrichtigung
- `useDeleteCompletedTask()` – Hook zum Löschen
  - DELETE an `/api/completed-tasks/:taskId`
  - Bei Erfolg: Aufgabe aus dem Store entfernen
- WebSocket-Listener für `completed-task:created` und `completed-task:deleted` Events
  - Automatisches Update des Stores bei Events von anderen Tabs/Clients

### 3.4 Basis-Panel: `apps/ui/src/components/session-manager/completed-tasks-panel.tsx` **~200 Zeilen**

- Einfache Liste der erledigten Aufgaben (noch ohne fancy Karten – die kommen in Phase 4)
- Kopfzeile mit Titel "Erledigte Aufgaben" + Anzahl
- Lade-Zustand (Spinner/Skeleton)
- Fehler-Zustand (Fehlermeldung + Wiederholen-Button)
- Leerer Zustand (freundliche Nachricht + Icon)
- Scroll-Container für die Liste
- Jeder Eintrag zeigt: Titel, Kategorie-Icon, relative Zeit ("vor 2 Std")
- Klick auf Eintrag → Details-Ansicht (erstmal nur als Expand)

### 3.5 Session-Manager anpassen: `apps/ui/src/components/session-manager.tsx` **~15 Zeilen Änderung**

- Neuen Tab-Trigger hinzufügen:
  - Icon: `CheckCircle` von Lucide
  - Label: "Fertig"
  - Value: `'completed'`
- Neue Bedingung im Content-Bereich:
  - `leftPanelTab === 'completed'` → `<CompletedTasksPanel />` rendern

### 3.6 Keyboard-Shortcut (optional): `apps/ui/src/store/types/ui-types.ts` **~2 Zeilen**

- Neuen Shortcut `completedTasks` im `KeyboardShortcuts` Interface hinzufügen
- Standard: z.B. "4" (weil es der 4. Tab ist)

---

## ⚡ Edge Cases

| Was könnte passieren?                  | Lösung                                                                            |
| -------------------------------------- | --------------------------------------------------------------------------------- |
| User wechselt schnell zwischen Tabs    | Lade-Abbruch (AbortController) für vorherige Anfragen                             |
| Server braucht lange zum Antworten     | Skeleton-Ladeanimation nach 200ms                                                 |
| 100+ Aufgaben in der Liste             | Virtualisierte Liste mit `limit` beim Laden                                       |
| WebSocket-Verbindung bricht ab         | Fallback: Daten beim Tab-Wechsel neu laden                                        |
| Store wächst zu groß im Speicher       | Bei Tab-Wechsel weg: Daten behalten (Cache), bei >500 Einträgen älteste verwerfen |
| Zustand-Selektor erzeugt neue Referenz | `useShallow` nutzen (siehe Zustand-Regeln in Memory!)                             |

---

## 🔄 Wiederverwendung

- **Panel-Pattern:** Angelehnt an `LeftOverviewPanel` (gleiche Struktur mit Header, Content, Footer)
- **Hook-Pattern:** Ähnlich wie die bestehenden Dashboard-Hooks (fetch + store update)
- **Tab-Pattern:** Genau wie die bestehenden Tabs in `session-manager.tsx` (Radix UI Tabs)
- **Leerer-Zustand:** Ähnliches Design wie `DashboardEmptyState` in den Dashboard-Karten

---

## ⚡ Performance-Überlegungen

- **Erstmaliges Laden:** Nur beim Tab-Wechsel, nicht beim App-Start (lazy loading)
- **Re-Renders verhindern:** Zustand-Selektoren mit `useShallow` für Objekt-Arrays
- **Netzwerk sparen:** Daten im Store cachen, nur bei Tab-Wechsel invalidieren oder bei WebSocket-Event aktualisieren

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 5 – Phase 3 implementieren (~50.000 Tokens)

**Schritt 1:** Store-Typen erweitern

- `ui-types.ts`: `LeftPanelTab` erweitern
- `state-types.ts` falls nötig anpassen

**Schritt 2:** App-Store erweitern

- Neuen State und Aktionen hinzufügen
- `useShallow` für Selektoren beachten

**Schritt 3:** API-Hook erstellen

- `use-completed-tasks.ts` mit Fetch + Store-Integration
- WebSocket-Listener einbauen

**Schritt 4:** Basis-Panel erstellen

- `completed-tasks-panel.tsx` mit allen Zuständen (Laden, Fehler, Leer, Liste)

**Schritt 5:** Session-Manager anpassen

- Tab-Trigger und Content-Bereich erweitern

**Schritt 6:** TypeScript-Check

- `npx tsc --noEmit` über das gesamte Projekt

---

**Vorherige Phase:** [Phase 2 – Server-Routen & Speicherung](./2026-03-13-phase-2-server-routen.md)
**Nächste Phase:** [Phase 4 – Task-Karten & Filter](./2026-03-13-phase-4-task-karten-filter.md)
