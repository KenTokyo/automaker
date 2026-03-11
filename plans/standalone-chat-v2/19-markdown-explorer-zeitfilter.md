# 📋 Plan 19: Markdown Explorer — Zeitbasierte Filterung

ULTRATHINK

> **Feature:** Zeitbasierte Datei-Filterung im Markdown Explorer
> **Erstellt:** 2026-03-10
> **Status:** ✅ Abgeschlossen
> **Voraussetzung für:** Plan 21 (Dashboard Generation Backend)
> **Master-Orchestrator:** `plans/standalone-chat-v2/00-global-tasklist.md`

---

## 🎯 Strategie & Ziele

### Was soll das Feature leisten?

Der Markdown Explorer (rechte Sidebar) zeigt aktuell Dateien mit einer Suche und Baumansicht. Wir wollen zusätzlich einen **Zeitfilter** einbauen, der Dateien nach ihrem **letzten Änderungsdatum** filtert.

**Was bedeutet das konkret für den User?**
> Der User kann sagen: "Zeig mir nur Dateien, die in den letzten 2 Tagen geändert wurden" — damit sieht er genau die aktiven Arbeitsdateien und nicht den ganzen historischen Ballast.

### Warum brauchen wir das?

1. **Übersichtlichkeit:** Bei großen Projekten mit 500+ Markdown-Dateien wird der Explorer unübersichtlich.
2. **Voraussetzung für Dashboard:** Plan 21 nutzt genau diese Logik, um der KI nur relevante Dateien zu übergeben.
3. **Schneller finden:** Weniger Dateien = schneller zum Ziel.

### Verbindung zu anderen Features

- **Markdown Explorer (bestehend):** Direkte Erweiterung des vorhandenen Such- und Filtersystems.
- **Dashboard (Plan 21):** Nutzt die gleiche Server-API zum Dateien-Sammeln nach Zeitraum.
- **Verlauf-Panel:** Hat bereits ein ähnliches Zeitfilter-Konzept (1h, 6h, 12h, 24h, 7d) — konsistentes Bedienungsmuster.

---

## ❓ Proaktive F&A & Edge Cases

### ✅ F1: Was passiert, wenn keine Dateien im Zeitraum liegen?
→ Leere Liste anzeigen mit Hinweis: "Keine Markdown-Dateien in den letzten X Tagen geändert." Kein Fehler, kein Absturz.

### ✅ F2: Wie interagiert der Zeitfilter mit der bestehenden Suche?
→ **Zeitfilter zuerst**, dann Suche. Beispiel: "Letzte 7 Tage" + Suche "TODO" → Erst alle Dateien der letzten 7 Tage sammeln, dann nach "TODO" filtern.

### ✅ F3: Welches Datum wird für die Filterung verwendet?
→ `modified` (mtimeMs) — das Datum der letzten Änderung. Nicht das Erstelldatum, weil eine Datei vor Monaten erstellt, aber gestern geändert worden sein kann.

### ✅ F4: Was ist der Anfangswert?
→ "Alle" (kein Zeitfilter aktiv) — damit ändert sich für bestehende User nichts.

### ✅ F5: Soll der Zeitfilter gespeichert werden?
→ Ja, im Explorer-Store (Zustand). Beim nächsten Öffnen ist der letzte Zeitfilter wieder aktiv.

### ✅ F6: Soll die Filterung auf dem Server oder im Browser passieren?
→ **Auf dem Server.** Der Server kennt die Datei-Metadaten (mtimeMs) bereits beim Scannen. Ein neuer optionaler Query-Parameter `sinceHours` am Such-Endpunkt filtert serverseitig. Das spart Netzwerk-Traffic bei großen Projekten.

---

## 📱 Konkrete Beispiele

```
🖥️ User öffnet Markdown Explorer → Sieht "Zeitraum: Alle" als Grundeinstellung
🖥️ User wählt "Letzte 2 Tage" → Explorer zeigt nur kürzlich geänderte Dateien
🖥️ User tippt "migration" in die Suche → Suche läuft nur auf den 2-Tage-Dateien
🖥️ User wechselt zu "Letzte 12 Stunden" → Nur heute bearbeitete Dateien sichtbar
✅ Zeitfilter + Suche arbeiten harmonisch zusammen!
```

---

## ⚡ Leistung & Optimierung

- **Server-seitige Filterung:** Der Markdown Explorer Service filtert bereits beim Scannen nach `mtimeMs`. Weniger Daten über die Leitung = schnellere Antwort.
- **Kein zusätzliches Scannen:** Der bestehende Scan-Prozess liefert bereits `stat`-Daten pro Datei. Die Zeitfilterung ist ein einfacher Vergleich, keine neue I/O-Operation.
- **Cache-freundlich:** Gefilterte Ergebnisse können im Explorer-Store gecacht werden (pro Zeitraum).

---

## 🔄 Code-Wiederverwendung

| Bestehendes Element | Wiederverwendung |
|---------------------|------------------|
| `apps/server/src/services/markdown-explorer-service.ts` | Erweitern um Zeitfilter-Parameter beim Scannen |
| `apps/server/src/routes/markdown-explorer/routes/search.ts` | Neuer Query-Parameter `sinceHours` |
| `apps/chat/src/stores/explorer-store.ts` | Neue State-Variable `timeFilter` |
| `apps/chat/src/components/markdown-explorer.tsx` | Zeitfilter-Dropdown im Toolbar-Bereich |
| Verlauf-Panel Zeitfilter-Pattern (`HistoryTimeFilter`) | Gleiche UX-Logik, ähnliche Dropdown-Optionen |

---

## 🧩 Phasen & Komponenten

### Phase 1: Backend — Service & Route erweitern (~150 Zeilen)

> **Was bedeutet das konkret?** Der Markdown Explorer Service bekommt eine optionale Zeitfilter-Möglichkeit und die API-Route akzeptiert einen neuen Parameter.

#### 1.1 Markdown Explorer Service erweitern

**`apps/server/src/services/markdown-explorer-service.ts`** (~60 Zeilen Änderung)
- Neue optionale Parameter in der Scan-Methode: `sinceHours?: number`
- Wenn `sinceHours` gesetzt: nur Dateien zurückgeben, deren `stat.mtimeMs >= Date.now() - (sinceHours * 3600000)`
- Neue Hilfsmethode `getFilesFilteredByTime(projectPath: string, sinceHours: number): Promise<SearchResult[]>`
  - Nutzt den bestehenden Scan, filtert nach `mtimeMs`
  - Sortiert nach `modified` (neueste zuerst)
- Diese Methode wird auch von Plan 21 (Dashboard Generation) wiederverwendet

#### 1.2 Such-Route erweitern

**`apps/server/src/routes/markdown-explorer/routes/search.ts`** (~30 Zeilen Änderung)
- Neuer optionaler Query-Parameter: `sinceHours` (Zahl, 0 = alle)
- Validierung: Muss eine positive Zahl sein (oder 0/undefined)
- Weiterleitung an den Service mit dem Zeitfilter

#### 1.3 Typen

**`apps/server/src/services/markdown-explorer-service.ts`** (~20 Zeilen Änderung)
- `SearchOptions` Interface erweitern um `sinceHours?: number`
- Neues Interface `TimeFilterOption`: `{ value: number; label: string }`

#### 1.4 Neue Route: Dateien nach Zeitraum abrufen

**`apps/server/src/routes/markdown-explorer/routes/files-by-time.ts`** (~40 Zeilen, neue Datei)
- GET `/api/markdown-explorer/files-by-time?projectPath=...&sinceHours=24`
- Ruft `service.getFilesFilteredByTime()` auf
- Gibt gefilterte Dateiliste als JSON zurück
- Wird vom Dashboard (Plan 21) direkt genutzt

**Geschätzt: ~150 Zeilen neue/geänderte Zeilen, verteilt auf 3-4 Dateien**

---

### Phase 2: Frontend — Zeitfilter-UI im Explorer (~200 Zeilen)

> **Was bedeutet das konkret?** Im Markdown Explorer erscheint ein neues Dropdown "Zeitraum" im Toolbar-Bereich. Der User kann dort auswählen, ob er nur Dateien der letzten Stunden/Tage sehen will.

#### 2.1 Explorer-Store erweitern

**`apps/chat/src/stores/explorer-store.ts`** (~40 Zeilen Änderung)
- Neue State-Variable: `timeFilter: number` (0 = alle, Stundenzahl sonst)
- Neue Aktion: `setTimeFilter(hours: number)`
- Konstante `TIME_FILTER_OPTIONS` mit den verfügbaren Optionen:
  - `{ value: 0, label: 'Alle' }`
  - `{ value: 12, label: '12 Stunden' }`
  - `{ value: 24, label: '1 Tag' }`
  - `{ value: 48, label: '2 Tage' }`
  - `{ value: 96, label: '4 Tage' }`
  - `{ value: 168, label: '1 Woche' }`
  - `{ value: 720, label: '30 Tage' }`
- Persistierung im localStorage (wie andere Explorer-Einstellungen)

#### 2.2 Markdown Explorer Komponente erweitern

**`apps/chat/src/components/markdown-explorer.tsx`** (~80 Zeilen Änderung)
- Neues Select/Dropdown im Toolbar-Bereich (neben Suche)
- Label: "Zeitraum"
- Rendert die `TIME_FILTER_OPTIONS` als Optionen
- Bei Änderung: `setTimeFilter()` aufrufen + Datenliste neu laden
- Wenn Zeitfilter aktiv: kleiner Hinweis-Text "Zeige Dateien der letzten X"

#### 2.3 API-Aufruf anpassen

**`apps/chat/src/components/markdown-explorer.tsx`** oder zugehöriger Hook (~40 Zeilen Änderung)
- Den bestehenden Fetch-Aufruf an die Markdown Explorer API erweitern
- `sinceHours` Parameter mitschicken, wenn Zeitfilter aktiv ist
- Alternativ: Die neue Route `files-by-time` nutzen, wenn Zeitfilter > 0

#### 2.4 Leerer Zustand bei Filterung

**`apps/chat/src/components/markdown-explorer.tsx`** (~30 Zeilen Änderung)
- Wenn gefilterte Liste leer: "Keine Dateien in den letzten [Zeitraum] geändert."
- Vorschlag anzeigen: "Versuche einen größeren Zeitraum."

**Geschätzt: ~200 Zeilen neue/geänderte Zeilen, verteilt auf 2-3 Dateien**

---

## 📋 Zusammenfassung

| Phase | Typ | Dateien | ~Zeilen | Inhalt |
|-------|-----|---------|---------|--------|
| 1 | Backend | 3-4 Dateien | ~150 | Service + Route + Zeitfilter-Logik |
| 2 | Frontend | 2-3 Dateien | ~200 | Dropdown-UI + Store + API-Aufruf |
| **Gesamt** | | **~6 Dateien** | **~350** | |

### Umsetzungs-Reihenfolge
1. Phase 1 zuerst (Backend muss den Zeitfilter können)
2. Phase 2 danach (Frontend nutzt die Backend-API)

### CHAT-Zuordnung
- **CHAT 9:** Phase 1 + Phase 2 zusammen (~30-40k Tokens geschätzt, gemeinsam mit Plan 20)

---

## 📚 Dokumentation

Nach Abschluss aktualisieren:
- `plans/standalone-chat-v2/00-global-tasklist.md` → Plan 19 als ✅ markieren
- Hinweis in CLAUDE.md falls nötig: Zeitfilter-API unter `/api/markdown-explorer/files-by-time`
