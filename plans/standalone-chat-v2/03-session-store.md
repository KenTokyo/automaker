# Phase 3: Session/Thread Zustand Store

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 1
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Der aktuelle Chat hat kein Multi-Session-Management.
Es gibt nur eine einzige Session, die direkt über den `useAppStore` läuft.
Für parallele Chats, Tabs und Verlauf brauchen wir einen eigenen Store.

## Was soll passieren?

Ein neuer Zustand Store (`useSessionStore`) der:

- Mehrere Chat-Sessions gleichzeitig verwaltet
- Die aktive Session trackt
- Session-Metadaten speichert (Name, Status, Modell, Tokens, Kosten)
- Entwurf-Nachrichten pro Session speichert
- Session-Wechsel ohne Datenverlust erlaubt

## Wie der User die App danach erlebt

1. "Neuer Chat" → Neue Session wird erstellt, alter Chat bleibt erhalten
2. Klick auf Tab → Wechsel zur anderen Session (alles bleibt)
3. Session schließen → Chat wird archiviert, Tab verschwindet
4. App neustarten → Letzte aktive Session wird wiederhergestellt

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                          | Zweck                                                    |
| ------------------------------ | -------------------------------------------------------- |
| `stores/session-store.ts`      | Zustand Store für Sessions                               |
| `stores/types.ts`              | TypeScript Typen für Session-Daten                       |
| `hooks/use-active-session.ts`  | Hook für Zugriff auf aktive Session                      |
| `hooks/use-session-actions.ts` | Hook für Session-Aktionen (erstellen, wechseln, löschen) |

### Geänderte Dateien

| Datei         | Was ändern                   |
| ------------- | ---------------------------- |
| `src/app.tsx` | Session-Store initialisieren |

---

## Datenstruktur

### SessionState (ein einzelner Thread)

```
SessionState:
  id: string                    // z.B. "sess_1710000000_abc123"
  name: string                  // z.B. "Alpha", "Beta", "Gamma" oder AI-generiert
  serverSessionId: string       // Session-ID vom Server (für API-Calls)
  createdAt: string             // ISO Zeitstempel

  // Status
  isRunning: boolean            // Läuft gerade ein Agent?
  processStatus: 'idle' | 'running' | 'error' | 'stopped'

  // Modell & Provider
  model: string                 // z.B. "claude-sonnet-4-6"
  thinkingLevel: string         // z.B. "medium"
  reasoningEffort: string       // z.B. "high"

  // Zähler
  messageCount: number
  totalTokensInput: number
  totalTokensOutput: number
  totalCost: number

  // Nachrichten
  messages: Message[]           // Lokaler Cache der Nachrichten

  // Entwurf
  draftMessage: string          // Nicht-gesendete Eingabe
  draftImages: ImageAttachment[] // Nicht-gesendete Bilder

  // Orchestrator
  orchestratorMode: boolean
  orchestratorRunId: string | null
  orchestratorIteration: number

  // Meta
  title: string | null          // AI-generierter Titel
  description: string | null    // AI-generierte Beschreibung
  projectPath: string           // Welches Projekt
  workingDirectory: string      // Arbeitsverzeichnis
```

### SessionStore (der ganze Store)

```
SessionStore:
  // State
  sessions: Map<sessionId, SessionState>
  activeSessionId: string | null
  sessionOrder: string[]        // Reihenfolge der Tabs

  // Getters (abgeleitet)
  activeSession: SessionState | null
  activeSessions: SessionState[]  // Alle nicht-archivierten
  runningSessions: SessionState[] // Alle gerade laufenden

  // Aktionen
  createSession(projectPath, workingDirectory): string  // Gibt Session-ID zurück
  switchSession(sessionId): void
  closeSession(sessionId): void
  removeSession(sessionId): void

  // Session-Updates
  updateSession(sessionId, partial): void
  setSessionRunning(sessionId, isRunning): void
  setSessionModel(sessionId, model): void
  addMessage(sessionId, message): void
  clearMessages(sessionId): void
  setDraft(sessionId, message, images?): void

  // Session-Meta
  setSessionTitle(sessionId, title, description?): void
  setSessionTokens(sessionId, input, output, cost): void

  // Orchestrator
  setOrchestratorMode(sessionId, enabled, runId?): void
  incrementOrchestratorIteration(sessionId): void

  // Batch-Operationen
  closeAllSessions(): void
  closeIdleSessions(): void
```

---

## Aufgaben

### Aufgabe 3.1: TypeScript Typen definieren (`stores/types.ts`)

Alle Interfaces und Types für:

- `SessionState`
- `Message` (inkl. Tool-Use, Thinking, etc.)
- `ImageAttachment`
- `SessionMetadata` (für Persistenz)

### Aufgabe 3.2: Zustand Store erstellen (`stores/session-store.ts`)

- `create()` mit allen State-Feldern und Aktionen
- Persistenz via `persist` Middleware (LocalStorage)
- Nur Metadaten persistieren (nicht die vollen Nachrichten)
- Nachrichten kommen vom Server (über API)
- `useShallow` für alle Selektoren (wie in MEMORY.md beschrieben)

Wichtig (Zustand-Regeln aus Memory):

- Keine neuen Objekte/Arrays in Selektoren zurückgeben
- `useShallow` für Multi-Value Selektoren
- Stabile Fallback-Werte (leere Arrays als Konstanten)

### Aufgabe 3.3: Session-Erstellung

Wenn "Neuer Chat" geklickt wird:

1. Neue `SessionState` mit Standardwerten erstellen
2. Server-Session über API erstellen (`POST /api/sessions`)
3. Server-Session starten (`POST /api/agent/start`)
4. Session-ID und Server-Session-ID verknüpfen
5. Tab-Reihenfolge aktualisieren

Session-Name Vergabe:

- Automatisch: Griechische Buchstaben (Alpha, Beta, Gamma, ...)
- Oder: "Chat 1", "Chat 2", etc.
- Später: AI-generierter Titel nach erster Nachricht

### Aufgabe 3.4: Session-Wechsel

Wenn auf einen Tab geklickt wird:

1. Aktuelle Eingabe als Draft speichern
2. `activeSessionId` ändern
3. Nachrichten der neuen Session laden (vom Server falls nicht im Cache)
4. Draft der neuen Session wiederherstellen
5. Scroll-Position der neuen Session wiederherstellen

### Aufgabe 3.5: Session-Wiederverwendung

Strategie (wie in UniAI Extension):

1. "Neuer Chat" geklickt
2. Ist die aktive Session idle (nicht am laufen)?
   → Session leeren und wiederverwenden
3. Gibt es eine andere idle Session ohne Draft?
   → Zu der wechseln und wiederverwenden
4. Sonst: Neue Session erstellen
5. Idle Sessions über dem Limit (z.B. 5) automatisch schließen

### Aufgabe 3.6: Hooks erstellen

**`use-active-session.ts`**:

```
Gibt zurück: { session, isRunning, messages, model, ... }
Nutzt useShallow für Performance
```

**`use-session-actions.ts`**:

```
Gibt zurück: { createSession, switchSession, closeSession, sendMessage, stopExecution, ... }
Wrapped die Store-Aktionen mit API-Calls
```

### Aufgabe 3.7: WebSocket Event-Routing

Die bestehende WebSocket-Verbindung sendet Events mit `sessionId`.
Der Store muss:

- Events der richtigen Session zuordnen
- `agent:stream` Events verarbeiten (stream, complete, error, tool_use)
- Session-Status aktualisieren (running/idle)
- Token/Kosten-Updates verarbeiten

---

## Prüfpunkte

- [ ] Neue Session erstellen funktioniert
- [ ] Zwischen Sessions wechseln ohne Datenverlust
- [ ] Draft-Nachrichten bleiben pro Session erhalten
- [ ] Session-Status (running/idle) wird korrekt angezeigt
- [ ] Token/Kosten-Zähler funktionieren pro Session
- [ ] WebSocket-Events landen in der richtigen Session
- [ ] App-Neustart: Letzte Session wird wiederhergestellt
- [ ] Idle Sessions werden automatisch aufgeräumt

---

## Edge Cases

| Fall                                           | Lösung                                                      |
| ---------------------------------------------- | ----------------------------------------------------------- |
| Nachricht senden während Session wechselt      | Nachricht geht an die Session, die beim Absenden aktiv war  |
| Server-Neustart während Chat läuft             | Session-Status zurücksetzen, "Verbindung verloren" anzeigen |
| 10+ Sessions gleichzeitig offen                | Tab-Overflow mit horizontalem Scroll                        |
| Gleiche Session in 2 Browser-Tabs              | WebSocket-Events werden an beide geliefert                  |
| Session erstellen fehlschlägt (Server offline) | Fehlermeldung zeigen, Session nicht in Store aufnehmen      |
