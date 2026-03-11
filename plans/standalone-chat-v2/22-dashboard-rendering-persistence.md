# Plan 22: Dashboard Rendering & Persistierung

ULTRATHINK

> **Feature:** React Card-Rendering-UI und Server-seitige Persistierung fuer Dashboard Overviews
> **Erstellt:** 2026-03-10
> **Status:** ✅ Abgeschlossen (2026-03-11)
> **Abhaengig von:** Plan 20 (UI Shell & Panel-Layout), Plan 21 (OverviewService & JSON-Schema)
> **Voraussetzung fuer:** Plan 23 (Aktionen, Verfeinerung & Model-Wahl)
> **Master-Orchestrator:** `plans/standalone-chat-v2/00-global-tasklist.md`

---

## Strategie & Ziele

### Was soll das Feature leisten?

Das generierte Overview-JSON (aus Plan 21) wird:

1. **In schoene React Cards gerendert** -- motivierend, leicht lesbar, mit Icons und Farben
2. **Auf dem Server persistiert** -- damit generierte Overviews nicht verloren gehen
3. **Beim Tab-Wechsel geladen** -- bereits generierte Overviews sofort anzeigen
4. **Interaktiv** -- Loading-States, Error-States, Timestamps, Generierungs-Info

**Was bedeutet das konkret fuer den User?**

> Der User sieht nach der Generierung eine wunderschoene Karten-Ansicht: Oben eine motivierende Zusammenfassung, darunter aufklappbare Sektionen (Features, Bugfixes, Verbesserungsvorschlaege), am Rand Statistiken. Beim naechsten Oeffnen des Tabs ist die letzte Overview sofort da -- kein Neugenerieren noetig.

### Warum Persistierung?

- **Schneller Zugriff:** Beim Oeffnen des Overview-Tabs sofort Daten da, kein Warten
- **Vergleichbarkeit:** Man kann sehen, was das letzte Mal generiert wurde
- **Leichtgewichtig:** JSON-Dateien sind klein (5-20 KB pro Overview)

### Verbindung zu anderen Features

- **Plan 20 (UI Shell):** Das Panel-Geruest (Empty State, Loading State, Content Area) wird hier befuellt
- **Plan 21 (Generation):** Liefert das `DashboardOverviewData`-JSON, das hier gerendert wird
- **Plan 23 (Actions):** Baut auf dem Rendering auf (Regenerate-, Simplify-, Detail-Buttons)

---

## Proaktive F&A & Edge Cases

### F1: Wo werden die Overview-JSONs gespeichert?

> Auf dem Server unter `data/overviews/{projectHash}/`:
>
> - `overview-12h.json`
> - `overview-24h.json`
> - `overview-4d.json`
> - `overview-1w.json`
>   Ein JSON pro Zeitraum-Tab. Wird beim Generieren ueberschrieben.

### F2: Was passiert, wenn die JSON-Datei korrupt ist?

> Defensive Parsing mit try/catch. Korruptes JSON -> `null` zurueckgeben, Client zeigt Empty State, "Bitte neu generieren" Hinweis.

### F3: Wie gross werden die JSON-Dateien?

> Typisch 5-20 KB. Maximal ~50 KB bei sehr grossen Overviews (1-Wochen-Ansicht). Kein Speicherproblem.

### F4: Wie sieht die Card-UI aus?

```
+----------------------------------------------+
| Projekt-Uebersicht (letzte 24h)              |
| Generiert am 10.03.2026 um 21:45             |
+----------------------------------------------+
| "In den letzten 24 Stunden hast du           |
|  grossartige Fortschritte gemacht! ..."       |
+----------------------------------------------+
| Statistiken                                   |
| [12 Dateien] [8 Commits] [+340 Z] [-120 Z]  |
+----------------------------------------------+
| Was wurde gemacht                             |
| +-- Feature: Markdown Explorer ...            |
| +-- Bugfix: History-Tab ...                   |
| +-- Docs: CLAUDE.md aktualisiert              |
+----------------------------------------------+
| Verbesserungsvorschlaege                      |
| +-- Hoch: Cache-Strategie ...                 |
| +-- Mittel: Error-Handling ...                |
+----------------------------------------------+
| Sicherheitshinweise                           |
| +-- Info: Keine Probleme erkannt              |
+----------------------------------------------+
```

### F5: Wie reagiert die UI, wenn zwischen Tabs gewechselt wird?

> Der Sub-Tab-Wechsel (12h -> 24h) prueft:
>
> 1. Ist ein Overview fuer diesen Zeitraum im **Zustand-Store Cache**? -> Sofort anzeigen
> 2. Liegt eine **JSON-Datei** auf dem Server? -> HTTP GET -> anzeigen
> 3. Beides leer? -> Empty State mit Generate-Button

### F6: Sollen aeltere Generierungen behalten werden?

> **Nein.** Es gibt nur eine Overview pro Zeitraum. Beim Neugenerieren wird die alte ueberschrieben.

### F7: Was zeigt der Loading-State waehrend der Generierung?

> Phasen-basiertes Loading (aus Plan 21s WebSocket `overview:progress` Event):
>
> 1. "Dateien werden gesammelt..."
> 2. "Git-Historie wird analysiert..."
> 3. "KI erstellt Uebersicht..."
> 4. "Ergebnis wird verarbeitet..."
>    Jede Phase hat eine animierte Pulse-Indikation. Daneben ein Cancel-Button.

### F8: Wie funktioniert die Fehler-Anzeige?

> Error-State-Card:
>
> - Rote Umrandung, Fehler-Icon
> - Verstaendliche Fehlermeldung (keine Stack-Traces)
> - "Erneut versuchen"-Button

---

## Konkrete Beispiele

```
User klickt "Generieren" -> Loading-State mit Phasen
-> JSON kommt an -> Rendering in Cards
User wechselt zu "4 Tage"-Tab -> Empty State (noch nichts generiert)
User wechselt zurueck zu "24h"-Tab -> Vorherige Karten sofort wieder da (aus Store Cache)
User schliesst/oeffnet Browser -> "24h"-Tab zeigt gespeicherte Overview (vom Server geladen)
```

---

## Leistung & Optimierung

- **Zustand-Store Cache:** Geladene Overviews im Client-State halten (kein Server-Aufruf bei Tab-Switch)
- **Lazy-Loading:** JSON nur laden, wenn der Sub-Tab zum ersten Mal besucht wird
- **React Memo:** Card-Komponenten mit `React.memo` fuer stabile Referenzen
- **Server-IO:** Nur einmal beim Init + beim Generieren. Kein Polling.

---

## Code-Wiederverwendung

| Bestehendes Element                                 | Wiederverwendung                                  |
| --------------------------------------------------- | ------------------------------------------------- |
| `apps/chat/src/components/message-bubble.tsx`       | **Vorlage** fuer Card-Styling (Tailwind-Patterns) |
| `apps/chat/src/components/history-panel.tsx`        | **Vorlage** fuer Panel-Struktur, scrollbare Liste |
| `apps/chat/src/stores/dashboard-store.ts` (Plan 20) | Erweitern um Cache-Logik                          |
| `apps/chat/src/hooks/use-dashboard.ts` (Plan 20)    | Erweitern um Lade- und Render-Logik               |
| `apps/chat/src/services/api.ts` (falls vorhanden)   | HTTP-Client fuer API-Aufrufe                      |
| Tailwind CSS Utility-Klassen                        | Konsistentes Look & Feel                          |

---

## Phasen & Komponenten

### Phase 1: Frontend -- Card-basierte Overview-UI Rendering (~450 Zeilen)

> **Was bedeutet das konkret?** Das generierte JSON wird in schoene, lesbare React-Komponenten umgewandelt und im Dashboard-Panel angezeigt.

#### 1.1 OverviewCards Hauptkomponente

**`apps/chat/src/components/dashboard-overview-cards.tsx`** (~120 Zeilen, neue Datei)

- React-Komponente `DashboardOverviewCards`
- Props: `data: DashboardOverviewData`
- Rendert alle Unter-Komponenten in einer scrollbaren Liste:
  1. Header (Zeitraum + Datum)
  2. Summary Card
  3. Stats Bar
  4. Sections (aufklappbar)
  5. Improvements
  6. Security
  7. Metadata Footer

#### 1.2 Summary Card Komponente

**`apps/chat/src/components/dashboard-summary-card.tsx`** (~40 Zeilen, neue Datei)

- Grosse Summary-Card oben (motivierender Text)
- Tailwind: `bg-gradient-to-r from-blue-500/10 to-purple-500/10` (dezenter Gradient)
- Groessere Schrift fuer den Summary-Text
- Generierungs-Datum formatiert anzeigen

#### 1.3 Stats Bar Komponente

**`apps/chat/src/components/dashboard-stats-bar.tsx`** (~60 Zeilen, neue Datei)

- Horizontale Statistik-Kaestchen (Dateien, Commits, Zeilen+, Zeilen-)
- Jede Stat in einem kleinen Box mit Zahl oben, Label unten
- Tailwind Flexbox: `flex gap-3 justify-between`
- Farben: Gruen fuer Zeilen+, Rot fuer Zeilen-

#### 1.4 Section Card Komponente

**`apps/chat/src/components/dashboard-section-card.tsx`** (~80 Zeilen, neue Datei)

- Aufklappbare (Collapsible) Section-Card mit React State
- Header: Icon + Titel + Item-Count, Klick zum Auf-/Zuklappen
- Body: Liste der Items mit Type-spezifischem Icon
- Item-Types: Feature (Rakete), Bugfix (Kaefer), Refactor (Schraubenschluessel), Docs (Dokument), Other (Pin)
- Animation: `transition-all duration-200` beim Auf-/Zuklappen
- Standard: aufgeklappt

#### 1.5 Improvements & Security Komponenten

**`apps/chat/src/components/dashboard-improvements.tsx`** (~60 Zeilen, neue Datei)

- Verbesserungsvorschlaege als farbcodierte Cards
- Priority-Farben: Hoch (rot), Mittel (gelb/amber), Niedrig (gruen)
- Tailwind: `border-l-4` mit Priority-Farbe als linker Rand

**`apps/chat/src/components/dashboard-security.tsx`** (~50 Zeilen, neue Datei)

- Sicherheitshinweise als hervorgehobene Cards
- Severity-Indikatoren: Critical (rot), Warning (gelb), Info (blau)
- Falls leer: "Keine Sicherheitsprobleme erkannt" Hinweis

#### 1.6 Metadata Footer

**`apps/chat/src/components/dashboard-metadata.tsx`** (~40 Zeilen, neue Datei)

- Kleine Info-Zeile am Ende: "X Dateien analysiert, Y Zeichen im Prompt"
- Falls `truncated: true`: Hinweis "Daten wurden fuer die Analyse gekuerzt"
- Muted Farbe, kleine Schrift

**Geschaetzt: ~450 Zeilen neue Zeilen, verteilt auf 7 neue Dateien**

---

### Phase 2: Frontend -- Loading-States, Error-States, Tab-Caching (~300 Zeilen)

> **Was bedeutet das konkret?** Die dynamische Logik: Overviews laden, Loading-Animationen, Error-Handling, Tab-Switching mit Caching.

#### 2.1 Dashboard-Store erweitern (Cache-Logik)

**`apps/chat/src/stores/dashboard-store.ts`** (Plan 20, ~60 Zeilen Ergaenzung)

- `overviewCache: Record<string, DashboardOverviewData | null>` -- gecachte Overviews pro Zeitraum
- `cacheOverview(timeRange, data)` -- Daten im Cache speichern
- `getCachedOverview(timeRange)` -- Daten aus Cache lesen
- `tabStatus: Record<string, { exists: boolean, generatedAt?: string }>` -- Status pro Tab

#### 2.2 Dashboard-Panel Rendering-Logik erweitern

**`apps/chat/src/components/dashboard-panel.tsx`** (Plan 20, ~100 Zeilen Ergaenzung)

- Beim Tab-Wechsel:
  1. Cache pruefen -> sofort anzeigen
  2. Falls nicht im Cache: HTTP GET an `/api/overview/{timeRange}` -> Cache fuellen -> anzeigen
  3. Falls 404: Empty State anzeigen
- `DashboardOverviewCards` Komponente einbinden (statt Platzhalter)
- Loading-State: Phasen-Text aus WebSocket-Events (`overview:progress`)
- Error-State: Fehlermeldung + Retry-Button

#### 2.3 Loading-Komponente

**`apps/chat/src/components/dashboard-loading.tsx`** (~60 Zeilen, neue Datei)

- Phasen-basiertes Loading mit animierter Pulse-Indikation
- Props: `phase: string`, `onCancel: () => void`
- Fortschritts-Text aendert sich bei jedem WebSocket-Event
- Cancel-Button zum Abbrechen

#### 2.4 WebSocket-Integration

**`apps/chat/src/hooks/use-dashboard.ts`** (Plan 20, ~80 Zeilen Ergaenzung)

- WebSocket-Listener fuer `overview:progress`, `overview:data`, `overview:error`
- Bei `overview:progress`: Loading-Phase im Store aktualisieren
- Bei `overview:data`: Overview in Cache speichern + aus Loading-State wechseln
- Bei `overview:error`: Fehler anzeigen + Loading beenden
- HTTP-Calls: `fetchOverview(timeRange)`, `generateOverview(sinceHours)`, `cancelGeneration()`

**Geschaetzt: ~300 Zeilen neue/geaenderte Zeilen, verteilt auf 4 Dateien**

---

### Phase 3: Backend -- Lade-Endpunkte & Init-Status (~150 Zeilen)

> **Was bedeutet das konkret?** Der Server liefert gespeicherte Overviews beim Tab-Wechsel und sendet den Tab-Status beim Init.

#### 3.1 Lade-Route vervollstaendigen

**`apps/server/src/routes/overview/index.ts`** (Plan 21, ~40 Zeilen Ergaenzung)

- `GET /api/overview/:timeRange` -> Implementation: `overviewService.loadOverview()`
- `GET /api/overview/status` -> Implementation: `overviewService.getOverviewStatus()`
- Korrektes Error-Handling: 404 fuer nicht vorhandene Overviews

#### 3.2 Auto-Save nach Generierung

**`apps/server/src/routes/overview/index.ts`** (~20 Zeilen Ergaenzung)

- Nach erfolgreicher Generierung (im POST-Handler): `overviewService.saveOverview(data, projectPath)` aufrufen
- Dann Ergebnis an Client senden (HTTP Response + WebSocket Event)

#### 3.3 Cleanup-Route (optional)

**`apps/server/src/routes/overview/index.ts`** (~20 Zeilen Ergaenzung)

- `DELETE /api/overview/:timeRange` -> Loescht eine gespeicherte Overview
- Fuer manuelles Aufraumen oder Debugging

**Geschaetzt: ~150 Zeilen neue/geaenderte Zeilen, verteilt auf 1-2 Dateien**

---

## Zusammenfassung

| Phase      | Typ      | Dateien         | ~Zeilen  | Inhalt                                 |
| ---------- | -------- | --------------- | -------- | -------------------------------------- |
| 1          | Frontend | 7 Dateien       | ~450     | Card-Rendering React-Komponenten       |
| 2          | Frontend | 4 Dateien       | ~300     | Loading, Error, Tab-Caching, WebSocket |
| 3          | Backend  | 1-2 Dateien     | ~150     | Lade-Endpunkte, Auto-Save, Init-Status |
| **Gesamt** |          | **~12 Dateien** | **~900** |                                        |

### Umsetzungs-Reihenfolge

1. Phase 1 (Frontend Rendering) -- damit JSON -> React-Darstellung funktioniert
2. Phase 2 (Frontend Interaktion) -- damit Loading/Error/Caching zusammenspielt
3. Phase 3 (Backend Laden) -- damit gespeicherte Overviews zurueckgegeben werden

### CHAT-Zuordnung

- **CHAT 11:** Phase 1 + Phase 2 + Phase 3 (~90.000 Tokens geschaetzt)

---

## Dokumentation

Nach Abschluss aktualisieren:

- `plans/standalone-chat-v2/00-global-tasklist.md` -> Plan 22 als erledigt markieren
- Card-Komponentenstruktur dokumentieren (fuer spaetere Theme-Anpassungen)

---

## Abschluss-Update (2026-03-11)

Umgesetzt in dieser Phase:

- Card-Rendering fuer Overview-Daten in mehreren kleinen Dashboard-Komponenten.
- Cache- und Lade-Logik pro Zeitraum im Dashboard-Store und Hook.
- Server-Persistierung (save/load/status) fuer Overviews pro Zeitraum.
- Live-Fortschritt ueber WebSocket-Events (overview:progress, overview:data, overview:error) im Dashboard-Hook.
- Fehler- und Lade-Zustand im Panel verbessert (kein Abbrechen-Button beim reinen Laden gespeicherter Daten).

Validierung:

- npm run typecheck --workspace=apps/chat ✅
- npx tsc --noEmit in apps/server ✅
