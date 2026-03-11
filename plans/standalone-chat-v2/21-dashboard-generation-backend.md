# Plan 21: Dashboard KI-Analyse Backend

ULTRATHINK

> **Feature:** KI-gestuetzte Projektanalyse mit Daten-Sammlung, Prompt-Bau und JSON-Parsing
> **Erstellt:** 2026-03-10
> **Status:** ✅ Abgeschlossen
> **Abhaengig von:** Plan 19 (Zeitfilter-Logik), Plan 20 (Dashboard UI Shell & Store)
> **Voraussetzung fuer:** Plan 22 (Rendering), Plan 23 (Aktionen)
> **Master-Orchestrator:** `plans/standalone-chat-v2/00-global-tasklist.md`

---

## Strategie & Ziele

### Was soll das Feature leisten?

Wenn der User auf "Generieren" klickt, passiert Folgendes im Hintergrund:
1. **Daten sammeln:** Relevante Markdown-Dateien + Git-Changes fuer den gewaehlten Zeitraum
2. **KI-Prompt bauen:** Einen strukturierten Prompt mit den gesammelten Daten
3. **KI aufrufen:** Den Prompt an Claude (via Claude Agent SDK) schicken
4. **Antwort parsen:** Die KI-Antwort als strukturiertes JSON extrahieren
5. **Ergebnis zurueckgeben:** JSON via WebSocket an den Client senden

**Was bedeutet das konkret fuer den User?**
> Der User klickt "Generieren" im 24h-Tab. Der Server sammelt alle Markdown-Dateien der letzten 24 Stunden + alle Git-Commits dieses Zeitraums, baut daraus einen Analyse-Prompt und laesst die KI eine strukturierte Zusammenfassung generieren. Das Ergebnis erscheint als schoene Karten-Ansicht.

### Warum als separater Service?

- Die Overview-Generierung soll den **laufenden Chat nicht stoeren**
- Sie braucht einen **eigenen Prozess** (separater Agent SDK Call), der parallel zum Chat laeuft
- Die Daten-Sammlung und das Prompt-Building sind **wiederverwendbare Logik** (fuer Regenerate, Simplify, Detail)
- Klare **Separation of Concerns**: Daten-Sammlung != KI-Aufruf != JSON-Parsing

### Architektur-Unterschied zu VS Code Extension

| Aspekt | VS Code Extension | Automaker Web |
|--------|-------------------|---------------|
| KI-Aufruf | CLI-Spawn (`claude --print`) | Claude Agent SDK (`Anthropic` SDK direkt) |
| Kommunikation | `ctx.postMessage()` | WebSocket Events + HTTP REST |
| Datei-Zugriff | Extension Host `fs` | Server-seitiger Express-Service |
| State | Webview `vscode.getState()` | Zustand Store (Client) |
| Persistierung | `.overview/` im Workspace | `data/overviews/` im Data-Dir |

### Verbindung zu anderen Features

- **Plan 19 (Time-Filter):** Die `getFilesFilteredByTime()`-Methode wird hier direkt genutzt
- **Plan 20 (UI Shell):** Das Dashboard-Panel sendet HTTP-Requests/WS-Events an den Server
- **Plan 22 (Rendering):** Empfaengt das generierte JSON und rendert es als React Cards
- **Plan 23 (Actions):** Erweitert die Generation um Regenerate/Simplify/Detail

---

## Proaktive F&A & Edge Cases

### F1: Wie laeuft die KI-Generierung, ohne den Chat zu blockieren?
> Wir nutzen die **Claude Agent SDK** (`@anthropic-ai/sdk`) direkt auf dem Server. Ein separater API-Call, unabhaengig von laufenden Chat-Sessions. Kein Streaming noetig — One-Shot-Anfrage.

### F2: Was passiert, wenn die Datenmenge zu gross ist (100+ Dateien)?
> **Chunking-Strategie:**
> 1. Dateien priorisieren: Zuerst nach `modified` sortieren (neueste zuerst)
> 2. Inhalt begrenzen: Pro Datei nur die ersten 50 Zeilen + Metadaten
> 3. Harte Grenze: Maximal 30 Dateien pro Anfrage
> 4. Falls trotzdem zu gross: Nur Dateinamen + Aenderungsdatum + erste 3 Zeilen

### F3: Was passiert, wenn keine Git-Historie verfuegbar ist?
> Kein Problem. Die Git-Analyse ist **optional**. Wenn `git log` fehlschlaegt (kein Repo), wird der Overview nur aus Markdown-Dateien generiert. Ein Hinweis im JSON: `"gitAvailable": false`.

### F4: Welches Modell wird fuer die Generierung genutzt?
> Standard: **Sonnet** (schnell + guenstig fuer Analysen). In Plan 23 kommt ein Model-Selector dazu, der ueberschrieben werden kann.

### F5: Was passiert bei einem Netzwerk-/API-Fehler?
> Der Service faengt den Fehler und sendet ein `overview:error` WebSocket-Event an den Client. Der Client zeigt einen Error-State mit Retry-Button (Plan 20 hat die UI-States schon vorbereitet).

### F6: Wie sieht das JSON-Format der KI-Antwort aus?
> Definiertes Schema:
> ```typescript
> interface DashboardOverviewData {
>   timeRange: '12h' | '24h' | '4d' | '1w';
>   generatedAt: string; // ISO timestamp
>   model: string; // welches KI-Modell
>   summary: string; // 2-3 Saetze Gesamtuebersicht
>   sections: DashboardSection[];
>   improvements: DashboardImprovement[];
>   security: DashboardSecurityItem[];
>   stats: DashboardStats;
>   metadata: DashboardMetadata;
>   mode: 'standard' | 'simplify' | 'detail';
> }
> ```

### F7: Was passiert, wenn die KI kein valides JSON zurueckgibt?
> **Fallback-Parsing:**
> 1. Suche nach ```json ... ``` Block via Regex
> 2. Falls nicht gefunden: gesamten Text als JSON parsen
> 3. Letzter Fallback: Raw-Text in einem `summary`-Feld zurueckgeben

### F8: Kann der User die Generierung abbrechen?
> Ja. Der Cancel-Button sendet ein HTTP DELETE. Der Service bricht den laufenden API-Call ab (`AbortController`).

### F9: Wie lange dauert eine typische Generierung?
> Geschaetzt: 10-45 Sekunden. Deshalb: Loading-State mit Phasen-Anzeige via WebSocket-Events ("Dateien sammeln...", "Git analysieren...", "KI generiert...", "Ergebnis verarbeiten...").

### F10: Was passiert bei Context-Overflow (zu viel Input fuer die KI)?
> Hard-Limit fuer die Prompt-Groesse (ca. 50.000 Zeichen). Wenn ueberschritten: Datei-Inhalte kuerzen, dann Git-Diffs kuerzen, zuletzt aelteste Dateien weglassen.

---

## Konkrete Beispiele

```
User klickt "Generieren" im 24h-Tab
-> Phase 1: Markdown-Dateien sammeln (12 Dateien, letzte 24h)
-> Phase 2: Git-Log abrufen (8 Commits, letzte 24h)
-> Phase 3: Prompt bauen (Dateien + Commits -> strukturierter Prompt)
-> Phase 4: KI-Anfrage senden (Claude Sonnet)
-> Phase 5: Antwort empfangen + JSON parsen
-> Overview-JSON fertig -> via WebSocket an Client -> Plan 22 rendert
```

```
User klickt "Generieren" im 1w-Tab (grosse Datenmenge)
-> Phase 1: 78 Markdown-Dateien gefunden -> auf 30 begrenzt (neueste zuerst)
-> Phase 2: 42 Git-Commits -> Summary-Mode (nur Commit-Messages, keine Diffs)
-> Phase 3: Prompt gebaut (35.000 Zeichen, unter Limit)
-> Phase 4: KI-Anfrage gesendet
-> Phase 5: Antwort parsen
-> Fertig!
```

---

## Leistung & Optimierung

- **Separater API-Call:** Die KI-Generierung blockiert weder den Chat noch andere Sessions
- **Markdown Explorer Cache:** Wiederverwendung des existierenden Scan-Caches (kein doppeltes Scannen)
- **Git-Command-Optimierung:** `git log --oneline --since="24 hours ago"` ist schnell
- **Prompt-Groessen-Limit:** Hard-Cap bei 50.000 Zeichen verhindert Token-Overflow
- **Progressive Updates:** WebSocket-Events informieren den User ueber den Fortschritt

---

## Code-Wiederverwendung

| Bestehendes Element | Wiederverwendung |
|---------------------|------------------|
| `apps/server/src/services/markdown-explorer-service.ts` | Dateien nach Zeitraum filtern (mit Plan 19 Erweiterung) |
| `apps/server/src/routes/markdown-explorer/` | Pattern fuer Route-Struktur |
| `@automaker/utils` `createLogger` | Logging im neuen Service |
| `@automaker/platform` `secureFs` | Dateizugriff |
| `@automaker/model-resolver` | Model-Alias-Aufloesung |
| `child_process.execSync('git log ...')` | Git-History abrufen |
| WebSocket Event-Pattern aus `lib/events.ts` | Progress-Events an Client |

---

## Phasen & Komponenten

### Phase 1: Backend -- OverviewService: Daten-Sammlung (~300 Zeilen)

> **Was bedeutet das konkret?** Ein neuer Service, der Markdown-Dateien und Git-Changes fuer einen Zeitraum sammelt und strukturiert aufbereitet.

#### 1.1 OverviewService Grundgeruest

**`apps/server/src/services/overview-service.ts`** (~200 Zeilen, neue Datei)
- Klasse `OverviewService` mit Dependency auf `MarkdownExplorerService`
- Constructor: nimmt `projectPath` als Parameter

**Methoden fuer Daten-Sammlung:**

- `collectMarkdownData(sinceHours: number): Promise<OverviewMarkdownData[]>`
  - Nutzt `MarkdownExplorerService` + filtert nach Zeitraum (Plan 19 API)
  - Sortiert nach `modified` (neueste zuerst)
  - Begrenzt auf `MAX_FILES = 30`
  - Pro Datei: Pfad, Name, Modified-Datum, erste 50 Zeilen (Preview)

- `collectGitData(sinceHours: number): Promise<OverviewGitData>`
  - Fuehrt `git log --since="<timestamp>" --pretty=format:"%h|%s|%an|%ai" --no-merges` aus
  - Parsed die Ausgabe in strukturierte Commit-Objekte
  - Bei sinceHours > 96: nur Commit-Messages, keine Diffs
  - Bei sinceHours <= 24: auch `git diff --stat` pro Commit (falls <20 Commits)
  - Fehlerbehandlung: Git nicht installiert oder kein Repo -> `gitAvailable: false`

- `private _sinceHoursToGitSince(hours: number): string`
  - Mapping: 12 -> '12 hours ago', 24 -> '24 hours ago', etc.

#### 1.2 Types & Interfaces

**`apps/server/src/services/overview-types.ts`** (~80 Zeilen, neue Datei)
- `OverviewMarkdownData`: `{ path, name, modified, preview, size }`
- `OverviewGitData`: `{ available, commits: OverviewGitCommit[], totalCommits }`
- `OverviewGitCommit`: `{ hash, message, author, date }`
- `DashboardTimeRange`: `'12h' | '24h' | '4d' | '1w'`
- `DashboardSection`: `{ title, icon, items: DashboardItem[] }`
- `DashboardItem`: `{ text, detail?, type: 'feature'|'bugfix'|'refactor'|'docs'|'other' }`
- `DashboardImprovement`: `{ title, description, priority: 'high'|'medium'|'low' }`
- `DashboardSecurityItem`: `{ title, description, severity: 'critical'|'warning'|'info' }`
- `DashboardStats`: `{ filesChanged, commitsCount, linesAdded?, linesRemoved? }`
- `DashboardMetadata`: `{ gitAvailable, filesScanned, filesIncluded, promptCharacters, truncated }`
- `DashboardOverviewData` (Hauptstruktur wie in F6 beschrieben)

**Geschaetzt: ~280 Zeilen neue Zeilen, verteilt auf 2 Dateien**

---

### Phase 2: Backend -- Prompt-Builder & KI-Aufruf (~350 Zeilen)

> **Was bedeutet das konkret?** Der gesammelte Inhalt wird in einen strukturierten KI-Prompt umgewandelt, an Claude geschickt und die Antwort als JSON geparst.

#### 2.1 Prompt-Builder

**`apps/server/src/services/overview-service.ts`** (~120 Zeilen Ergaenzung)

- `buildOverviewPrompt(markdownData: OverviewMarkdownData[], gitData: OverviewGitData, sinceHours: number): string`
  - **System-Prompt-Aufbau:**
    1. Rolle: "Du bist ein Projekt-Analyst. Erstelle eine motivierende, leicht verstaendliche Projektuebersicht."
    2. Zeitraum: "Analysiere die Aktivitaeten der letzten [Zeitraum]."
    3. Markdown-Dateien: Liste mit Pfaden + Preview-Inhalten
    4. Git-Commits: Liste mit Messages + Autoren
    5. Output-Anweisung: "Antworte ausschliesslich mit einem JSON-Objekt im folgenden Schema: ..."
    6. Stil-Anweisung: "Verwende einfache Sprache, motivierende Formulierungen, passende Emojis."
  - **Prompt-Groessen-Management:**
    - `MAX_PROMPT_CHARS = 50000`
    - Wenn ueber Limit: Datei-Previews kuerzen (erst 20 Zeilen, dann 10, dann nur Pfade)
    - Git-Diffs komplett weglassen, nur Messages behalten
    - Metadata-Feld `truncated: true` setzen

- `private _truncatePromptContent(markdownData, gitData, maxChars): TruncationResult`

#### 2.2 KI-Aufruf via Claude Agent SDK

**`apps/server/src/services/overview-service.ts`** (~130 Zeilen Ergaenzung)

- `generateOverview(sinceHours: number, onProgress?: (phase: string) => void): Promise<DashboardOverviewData>`
  - **Hauptmethode** -- orchestriert den gesamten Flow:
    1. `onProgress?.('Dateien sammeln...')` -> `collectMarkdownData(sinceHours)`
    2. `onProgress?.('Git analysieren...')` -> `collectGitData(sinceHours)`
    3. `onProgress?.('Prompt vorbereiten...')` -> `buildOverviewPrompt(...)`
    4. `onProgress?.('KI generiert Uebersicht...')` -> `callClaude(prompt)`
    5. `onProgress?.('Ergebnis verarbeiten...')` -> `parseOverviewResponse(response)`
    6. Return: `DashboardOverviewData`
  - Fehlerbehandlung: Jede Phase einzeln in try/catch

- `private _callClaude(systemPrompt: string, userPrompt: string, abortSignal?: AbortSignal): Promise<string>`
  - Nutzt `@anthropic-ai/sdk` (Anthropic Client)
  - `client.messages.create({ model: 'claude-sonnet-4-6', ... })`
  - One-Shot-Anfrage, kein Streaming noetig
  - **Timeout:** 120 Sekunden
  - **Cancel-Support:** AbortController Signal weiterreichen
  - API-Key aus den Credentials (wie bestehende Agent-Aufrufe)

- `cancelGeneration(): void`
  - Ruft `abortController.abort()` auf
  - Setzt State zurueck

#### 2.3 JSON-Parser

**`apps/server/src/services/overview-service.ts`** (~100 Zeilen Ergaenzung)

- `private _parseOverviewResponse(rawResponse: string, sinceHours: number): DashboardOverviewData`
  - **Stufe 1:** Suche nach ```json ... ``` Block via Regex
  - **Stufe 2:** Falls nicht gefunden, gesamten Text als JSON parsen
  - **Stufe 3:** Suche nach erstem `{` und letztem `}` und parse Substring
  - **Fallback:** Minimal-`DashboardOverviewData` mit Raw-Text im `summary`-Feld
  - Validierung: Pruefe ob Pflichtfelder vorhanden sind
  - Ergaenze fehlende Felder mit Defaults

**Geschaetzt: ~350 Zeilen neue/geaenderte Zeilen, ueberwiegend in overview-service.ts**

---

### Phase 3: Backend -- API-Routes & WebSocket-Events (~250 Zeilen)

> **Was bedeutet das konkret?** Express-Routes und WebSocket-Events verbinden den OverviewService mit dem Frontend.

#### 3.1 Overview-Routes

**`apps/server/src/routes/overview/index.ts`** (~120 Zeilen, neue Datei)

- `POST /api/overview/generate`
  - Body: `{ projectPath: string, sinceHours: number }`
  - Erstellt `OverviewService` Instanz
  - Ruft `generateOverview()` auf
  - Progress-Callbacks -> WebSocket-Events: `overview:progress`
  - Erfolg -> JSON Response + WebSocket-Event: `overview:data`
  - Fehler -> 500 + WebSocket-Event: `overview:error`
  - Speichert Ergebnis via `saveOverview()` (fuer Persistierung in Plan 22)

- `DELETE /api/overview/generate`
  - Ruft `cancelGeneration()` auf
  - 200 OK

- `GET /api/overview/:timeRange`
  - Parameter: `timeRange` ('12h', '24h', '4d', '1w')
  - Query: `projectPath`
  - Laedt gespeicherten Overview aus Dateisystem (falls vorhanden)
  - 200 + Data oder 404

- `GET /api/overview/status`
  - Query: `projectPath`
  - Gibt Status aller 4 Zeitraum-Tabs zurueck (welche haben Daten)
  - Response: `{ '12h': { exists, generatedAt }, '24h': { ... }, ... }`

#### 3.2 Route-Registrierung

**`apps/server/src/index.ts`** (~10 Zeilen Aenderung)
- Import und Registrierung der Overview-Routes: `app.use('/api/overview', overviewRoutes)`

#### 3.3 WebSocket-Event-Typen

**WebSocket-Events (in bestehender Event-Infrastruktur):**
- `overview:progress` — `{ phase: string }` (Fortschritts-Updates waehrend Generierung)
- `overview:data` — `{ data: DashboardOverviewData }` (Ergebnis)
- `overview:error` — `{ message: string }` (Fehler)

#### 3.4 Persistierung (Grundlage fuer Plan 22)

**`apps/server/src/services/overview-service.ts`** (~50 Zeilen Ergaenzung)

- `saveOverview(data: DashboardOverviewData, projectPath: string): Promise<void>`
  - Ziel: `data/overviews/{projectHash}/overview-{timeRange}.json`
  - `projectHash` = kurzer Hash des projectPath (fuer Multi-Projekt-Support)
  - `fs.promises.mkdir()` + `fs.promises.writeFile()`

- `loadOverview(timeRange: string, projectPath: string): Promise<DashboardOverviewData | null>`
  - Liest JSON-Datei, defensive Parsing mit try/catch
  - Korruptes JSON -> `null`

- `getOverviewStatus(projectPath: string): Promise<Record<string, { exists: boolean, generatedAt?: string }>>`
  - Prueft fuer alle 4 Zeitraeume ob eine JSON-Datei existiert

**Geschaetzt: ~250 Zeilen neue/geaenderte Zeilen, verteilt auf 3-4 Dateien**

---

## Zusammenfassung

| Phase | Typ | Dateien | ~Zeilen | Inhalt |
|-------|-----|---------|---------|--------|
| 1 | Backend | 2 Dateien | ~280 | OverviewService Daten-Sammlung + Types |
| 2 | Backend | 1 Datei | ~350 | Prompt-Builder, KI-Aufruf, JSON-Parser |
| 3 | Backend | 3-4 Dateien | ~250 | API-Routes, WebSocket-Events, Persistierung |
| **Gesamt** | | **~6 Dateien** | **~880** | |

### Umsetzungs-Reihenfolge
1. Phase 1 zuerst (Daten-Sammlung = Grundlage fuer alles)
2. Phase 2 danach (Prompt + KI-Aufruf braucht die gesammelten Daten)
3. Phase 3 zuletzt (Routes + Events verbinden alles)

### CHAT-Zuordnung
- **CHAT 10:** Phase 1 + Phase 2 + Phase 3 (~90.000 Tokens geschaetzt)

---

## Dokumentation

Nach Abschluss aktualisieren:
- `plans/standalone-chat-v2/00-global-tasklist.md` -> Plan 21 als erledigt markieren
- `CLAUDE.md` -> Hinweis auf `OverviewService` API-Verwendung
- JSON-Schema dokumentieren (fuer spaetere Agent-Prompt-Anpassungen in Plan 23)
