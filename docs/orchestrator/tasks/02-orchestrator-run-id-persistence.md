# Plan 2: Orchestrator Run ID Persistenz

ULTRATHINK

> Status: ✅ Implementiert
> Planungsstatus: Abgeschlossen (Iteration 1/100)
> Master-Plan: `2026-02-22-orchestrator-upgrade-MASTER.md`
> Ziel: Die Orchestrator Run ID serverseitig in `SessionMetadata` persistieren, damit Sessions eines Runs zusammengehoeren.

---

## Strategie

### Problem

Aktuell ist die Run ID nur transient im Prompt-Wrapper sichtbar. Ohne Persistenz kann die History spaeter keine zugehoerigen Sessions gruppieren.

### Loesung

1. `orchestratorRunId` wird beim Session-Erstellen mitgegeben.
2. Server speichert das Feld in `SessionMetadata`.
3. Session-List-Response liefert das Feld zurueck.
4. Frontend-Typen und API-Client reichen das Feld durch.

Was bedeutet das konkret fuer den User?

- In dieser Phase sieht der User noch kaum UI-Aenderungen.
- Aber die Datenbasis fuer Plan 3 (Collapsible History Groups) ist danach stabil vorhanden.

---

## Regeln aus global-coding-rules.md, die hier aktiv angewendet werden

- Rule 0.1: Keine Test-Suites, stattdessen TypeScript-Validierung mit `npx tsc --noEmit`.
- Rule 3.3: Maximal 700 Zeilen pro Datei beachten, keine ueberladenen Dateien.
- Rule 4.1: Kontextanalyse vor Aenderungen (Plan 1 + Master-Plan beruecksichtigen).
- Rule 4.10: Single Source of Truth fuer Metadatenfluss (Run ID nicht mehrfach unterschiedlich ableiten).

---

## Komponenten und Aufgaben

### Phase 2.1: Server-seitige Persistenz (~150 Zeilen)

Dateien:

1. `apps/server/src/services/agent-service.ts`

- `SessionMetadata` um `orchestratorRunId?: string` erweitern.
- `createSession()` optionalen Parameter annehmen.
- Metadaten-Schreibpfad konsistent halten.

2. `apps/server/src/routes/sessions/routes/create.ts`

- Optionales Feld `orchestratorRunId` aus Request Body akzeptieren.
- Wert an `createSession()` weiterreichen.

3. `apps/server/src/routes/sessions/routes/index.ts`

- `orchestratorRunId` im Session-List-Mapping mit zurueckgeben.

4. `apps/ui/src/types/electron.d.ts`

- `SessionListItem` um `orchestratorRunId?: string` erweitern.

### Phase 2.2: Frontend-Integration (~120 Zeilen)

Dateien: 5. `apps/ui/src/lib/http-api-client.ts`

- `createSession()` Signatur um optionales `orchestratorRunId` erweitern.

6. `apps/ui/src/components/session-manager.tsx`

- Beim schnellen Session-Erstellen die Run ID aus dem Orchestrator-Store mitsenden.

7. `apps/ui/src/store/orchestrator-store.ts`

- Sicherstellen, dass stabile Run ID einmal pro aktivem Orchestrator-Lauf verfuegbar bleibt.

Gesamtaufwand:

- Geschaetzt ~140 Zeilen verteilt auf 7 Dateien.

---

## CHAT-Aufteilung

### CHAT 2: Phase 2.1 + 2.2 komplett (~25.000 Tokens)

Kontext mitgeben:

- `docs/orchestrator/tasks/2026-02-22-orchestrator-upgrade-MASTER.md`
- `docs/orchestrator/tasks/02-orchestrator-run-id-persistence.md`
- `orchestrator-run-id-persistenz---server-frontend-history.md`
- `apps/server/src/services/agent-service.ts`
- `apps/server/src/routes/sessions/routes/create.ts`
- `apps/server/src/routes/sessions/routes/index.ts`
- `apps/ui/src/types/electron.d.ts`
- `apps/ui/src/lib/http-api-client.ts`
- `apps/ui/src/store/orchestrator-store.ts`
- `apps/ui/src/components/session-manager.tsx`

Umsetzungsschritte:

1. Server-Metadatenmodell erweitern.
2. Create-Route erweitern.
3. List-Route erweitern.
4. Frontend-Types erweitern.
5. API-Client-Request erweitern.
6. Session-Manager mit Run-ID-Weitergabe koppeln.
7. TypeScript pruefen in:

- `apps/server`: `npx tsc --noEmit`
- `apps/ui`: `npx tsc --noEmit`

---

## Edge Cases

1. Alte Sessions ohne Run ID:

- Feld bleibt optional, daher kein Breaking Change.

2. Zwei Browser-Tabs:

- Run-ID ist pro Tab/Store-Instanz getrennt, kein harter Konflikt.

3. Archivieren/Loeschen:

- Persistierte Run-ID bleibt fuer verbleibende Sessions erhalten.

4. Server-Neustart:

- Metadaten bleiben in Session-Storage-Datei erhalten.

---

## Abnahmekriterien fuer die Implementierung

- [x] `SessionMetadata` enthaelt optionales `orchestratorRunId`.
- [x] `createSession()` akzeptiert Run ID.
- [x] `GET /api/sessions` liefert Run ID im Session-Item.
- [x] `SessionListItem` Type kennt das Feld.
- [x] Session-Manager sendet Run ID beim Session-Erstellen mit.
- [x] TypeScript ist in `apps/server` und `apps/ui` fehlerfrei.

---

## Planungsphase abgeschlossen

- [x] Komponenten benannt
- [x] Aufgaben in CHAT 2 zerlegt
- [x] Token-Schaetzung dokumentiert
- [x] Context-Paket fuer naechsten Agent vorbereitet
