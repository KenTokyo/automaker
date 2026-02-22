# 🔄 Plan 1: Orchestrator Auto-Send Fix

ULTRATHINK

> **Status:** ✅ Implementiert
> **Master-Plan:** `2026-02-22-orchestrator-upgrade-MASTER.md`
> **Ziel:** Der Orchestrator soll nach NEXT_PHASE_READY die naechste Phase **automatisch starten** - ohne manuelles Enter.

---

## 🎯 Strategie

### Problem

Der aktuelle Auto-Send Flow hat eine **Race Condition**:

1. `NEXT_PHASE_READY` wird erkannt (agent-view.tsx:338)
2. `quickCreateSessionRef.current()` erstellt neue Session (agent-view.tsx:349)
3. `pendingOrchestratorContent` wird gesetzt (agent-view.tsx:345)
4. Im separaten `useEffect` (agent-view.tsx:362-388) wird auf `pendingOrchestratorContent` reagiert
5. Dort wird `sendMessage(content)` nach einem `setTimeout(100ms)` aufgerufen

**Das 100ms-Timeout ist ein Hack** - die neue Session braucht:

- WebSocket Connection aufgebaut (`isConnected = true`)
- Server-seitige Session geladen (`agent.start()`)
- Kein laufender Prozess (`isProcessing = false`)

Wenn eine dieser Bedingungen nicht erfuellt ist, schlaegt der Auto-Send fehl und der Content bleibt nur in der Textarea.

### Loesung (nach UniAI Chat Vorbild)

Statt den Textarea-Umweg zu nehmen, soll der Auto-Send **direkt ueber `sendMessage()`** laufen - mit einem robusten Warte-Mechanismus auf Session-Readiness.

### Was bedeutet das konkret fuer den User?

Der User startet den Orchestrator, gibt seinen Prompt ein, und die KI arbeitet automatisch Phase fuer Phase durch. Kein manuelles Enter mehr noetig.

---

## ❓ Proaktive F&A

**Q: Was passiert, wenn die neue Session nicht connected wird?**
✅ Timeout-Mechanismus: Nach 10 Sekunden Warten wird abgebrochen und der Content in die Textarea geschrieben als Fallback.

**Q: Was passiert bei ALL_PHASES_COMPLETE?**
✅ Der bestehende Flow bleibt: `orchestratorShouldTrigger()` gibt `false` zurueck (kein NEXT_PHASE_READY), also kein Auto-Send.

**Q: Kann ein doppelter Send passieren?**
✅ `pendingOrchestratorContent` wird sofort auf `null` gesetzt bevor der Send beginnt. Ein Guard verhindert Doppelausfuehrung.

**Q: Was passiert bei Netzwerkfehlern waehrend des Sendens?**
✅ Der normale Error-Handler greift. Die Session bleibt bestehen, der User kann manuell fortfahren.

---

## 🧩 Komponenten & Implementierung

### Phase 1.1: Robuster Auto-Send Mechanismus **~200 Zeilen Aenderungen**

**Betroffene Dateien:**

#### 1. `apps/ui/src/components/views/agent-view.tsx` **~120 Zeilen Aenderungen**

- **Zweck:** Den bestehenden `pendingOrchestratorContent` useEffect komplett ueberarbeiten
- Statt `setTimeout(100ms)` einen robusten Warte-Mechanismus implementieren
- Warten bis `isConnected === true` UND `isProcessing === false` UND `currentSessionId` sich geaendert hat
- Erst dann `sendMessage()` aufrufen - ohne Textarea-Umweg
- Fallback: Nach 10s Timeout den Content in die Textarea schreiben (manueller Modus)
- **Wichtig:** `setInput(content)` NUR als Fallback, nicht als primaerer Pfad
- Guard-Variable (Ref) um doppelte Sends zu verhindern

#### 2. `apps/ui/src/store/orchestrator-store.ts` **~40 Zeilen Aenderungen**

- Neue Funktion `generateRunId()` die eine **stabile** Run ID erzeugt (einmal pro Orchestrator-Activation)
- `orchestratorRunId: string | null` als neues State-Feld
- Run ID wird beim Aktivieren generiert, beim Deaktivieren auf `null` gesetzt
- `getMessageWrapper()` nutzt die stabile Run ID statt `Date.now()`

#### 3. `apps/ui/src/components/views/agent-view/input-area/orchestrator-settings.tsx` **~20 Zeilen Aenderungen**

- Status-Anzeige erweitern: Zeige "Auto-sending..." waehrend des Wartens auf Session-Readiness
- Zeige Run ID wenn aktiv (gekuerzt)

### Zusammenfassung Phase 1.1

| Datei                       | Typ       | Geschaetzte Zeilen |
| --------------------------- | --------- | ------------------ |
| `agent-view.tsx`            | Aenderung | ~120               |
| `orchestrator-store.ts`     | Aenderung | ~40                |
| `orchestrator-settings.tsx` | Aenderung | ~20                |
| **Gesamt**                  |           | **~180**           |

---

## 📋 CHAT-Aufteilung

### CHAT 1: Phase 1.1 komplett (~20.000 Tokens)

**Kontext mitgeben:**

- Diese Datei (`01-orchestrator-auto-send.md`)
- Master-Plan (`2026-02-22-orchestrator-upgrade-MASTER.md`)
- `apps/ui/src/store/orchestrator-store.ts` (aktuell)
- `apps/ui/src/components/views/agent-view.tsx` (Zeilen 296-388 relevant)

**Tasks:**

1. Orchestrator Store: Stabile Run ID implementieren
2. Agent View: `pendingOrchestratorContent` useEffect ueberarbeiten mit robustem Warte-Mechanismus
3. Agent View: Guard gegen doppelte Sends
4. Orchestrator Settings: Status-Anzeige fuer Auto-Send
5. TypeScript-Check: `npx tsc --noEmit` in `apps/ui`

---

## ⚡ Edge Cases

1. **Race Condition:** Neue Session ist noch nicht connected wenn Auto-Send triggert -> Warte-Loop mit Timeout
2. **Doppelter Trigger:** `isProcessing` flackert kurz -> Guard-Ref verhindert doppelten Send
3. **User tippt waehrend Auto-Send:** Unwahrscheinlich, aber der Auto-Send Content ueberschreibt kein manuelles Input - er geht direkt an `sendMessage()`
4. **Session-Erstellung schlaegt fehl:** `quickCreateSessionRef` koennte `null` sein -> null-Check vorhanden
5. **Max Iterations erreicht:** `orchestratorIncrementIteration()` gibt `false` zurueck -> kein Auto-Send
6. **Browser-Tab inaktiv:** `setTimeout` koennte verzoegert werden -> kein Problem, der Warte-Loop ist zustandsbasiert

---

## 🔄 Code-Wiederverwendung

- `sendMessage()` aus `useElectronAgent` wird direkt wiederverwendet
- `quickCreateSessionRef` bleibt der Session-Erstellungs-Mechanismus
- Kein neuer Hook noetig - die Logik bleibt im `agent-view.tsx` useEffect

---

## ✅ Abnahmekriterien

- [x] Orchestrator erkennt NEXT_PHASE_READY
- [x] Neue Session wird automatisch erstellt
- [x] Content wird automatisch gesendet (ohne Enter)
- [x] Process laeuft autonom weiter bis ALL_PHASES_COMPLETE oder Max Iterations
- [x] Bei Connection-Problemen: Fallback auf Textarea mit User-Hinweis
- [x] Kein doppelter Send
- [x] TypeScript fehlerfrei
