# 07 - Orchestrator-Modus

## Status: ABGESCHLOSSEN

---

## 🎯 Strategie & Ziele

Der **Orchestrator-Modus** ist ein Feature, das mehrstufige KI-Projekte automatisiert, indem es:

1. Die letzte KI-Antwort auf ein **Trigger-Keyword** prüft (z.B. `OPEN_NEW_CHAT`)
2. Automatisch den letzten KI-Text extrahiert und in einen **neuen Chat** einfügt
3. Dort automatisch absendet, sodass die KI nahtlos weiterarbeitet

**Kernidee:** Wie der bestehende Time Limiter, aber statt zeitbasiert wird **inhaltsbasiert** (Regex auf KI-Antwort) ein neuer Chat erstellt. Die KI liefert selbst den Kontext für den nächsten Chat mit.

### Verbindungen zu bestehenden Features:

- **Time Limiter Store** → Blueprint für Store-Pattern (localStorage-Persistenz, pendingContent)
- **Agent Prompts** → Orchestrator kann Agent-Prompts nutzen, die automatisch mitgegeben werden
- **Session Manager** → `quickCreateSessionRef` für automatische Session-Erstellung
- **Copy-All-Chat** → `generateContextSummary()` für Kontext-Extraktion

---

## ❓ Proaktive F&A & Edge-Cases

**Q1: Was passiert, wenn die KI das Keyword mitten im Text schreibt, nicht am Ende?**
✅ Wir parsen nur die **letzte Nachricht** der KI beim `complete`-Event. Regex prüft ob das Keyword **irgendwo** in der letzten Antwort vorkommt (nicht nur am Ende). Der User kann in den Settings entscheiden ob es am Ende sein muss.

**Q2: Was passiert bei Endlosschleifen (KI schreibt immer OPEN_NEW_CHAT)?**
✅ `maxIterations`-Limit (default: 100). Bei Erreichen wird der Orchestrator automatisch deaktiviert + Toast-Warnung.

**Q3: Was wenn die Session-Erstellung fehlschlägt?**
✅ Error-Handling mit Toast. Orchestrator bleibt enabled, aber der aktuelle Zyklus stoppt. User kann manuell fortfahren.

**Q4: Was genau wird in den neuen Chat eingefügt?**
✅ Die **letzte KI-Nachricht komplett** (nicht der Context-Summary). Die KI sorgt selbst dafür, dass ihre letzte Nachricht den nötigen Kontext enthält (Master-Plan, Status, nächste Phase).

**Q5: Kann der User den Orchestrator während der Verarbeitung stoppen?**
✅ Toggle auf Disabled schalten → nächster Complete wird nicht mehr abgefangen. Laufende Verarbeitung wird NICHT unterbrochen.

**Q6: Was ist der Unterschied zum Time Limiter?**
✅ Time Limiter: Zeitbasiert, nutzt `generateContextSummary()` für Kontext. Orchestrator: Keyword-basiert, kopiert die letzte KI-Nachricht 1:1 als neuen Prompt.

---

## ⚡ Performance & Architektur-Überlegungen

1. **Kein Polling** → Reagiert auf `complete`-Event (bereits vorhanden in `useElectronAgent`)
2. **Regex statt String.includes** → Flexibler, aber Performance ist unkritisch (einmalig bei complete)
3. **Store in localStorage** → Wie Time Limiter, keine Server-Kommunikation nötig
4. **Auto-Send** → Neuer Chat wird erstellt UND automatisch abgesendet (nicht nur Input setzen)

---

## 🔄 Code-Wiederverwendung

| Bestehendes Pattern         | Wiederverwendung                                      |
| --------------------------- | ----------------------------------------------------- |
| `time-limiter-store.ts`     | Blueprint für Store-Struktur, localStorage-Persistenz |
| `time-limiter-settings.tsx` | Blueprint für UI-Komponente (DropdownMenu-Pattern)    |
| `agent-view.tsx` L179-208   | Blueprint für auto-session-switch Effect              |
| `quickCreateSessionRef`     | Direkte Wiederverwendung für Session-Erstellung       |
| `handleSend` in agent-view  | Kann für Auto-Send im neuen Chat genutzt werden       |

---

## 📋 Phasen

### Phase 1: Orchestrator-Store (~120 Zeilen)

**Datei:** `apps/ui/src/store/orchestrator-store.ts`

**Zweck:** Zustand-Store für Orchestrator-Modus State & Persistenz

**State:**

- `isEnabled: boolean` → Orchestrator an/aus
- `triggerKeyword: string` → Default: `OPEN_NEW_CHAT`
- `maxIterations: number` → Default: 100
- `currentIteration: number` → Zähler pro Enable-Zyklus
- `pendingOrchestratorContent: string | null` → KI-Nachricht für nächsten Chat
- `autoSendEnabled: boolean` → Default: true (automatisch absenden)

**Actions:**

- `setEnabled(enabled)` → Toggle + Reset currentIteration
- `setTriggerKeyword(keyword)` → Keyword setzen + localStorage
- `setMaxIterations(max)` → Max setzen + localStorage
- `incrementIteration()` → Zähler erhöhen
- `resetIteration()` → Zähler zurücksetzen
- `setPendingContent(content)` → Content für nächsten Chat
- `clearPendingContent()` → Content leeren
- `setAutoSendEnabled(enabled)` → Auto-Send Toggle
- `shouldTrigger(lastMessage)` → Prüft ob Keyword in Nachricht

**Persistenz:** `automaker:orchestrator-*` Keys in localStorage

**Geschätzt:** ~120 Zeilen

---

### Phase 2: Orchestrator-Settings UI (~170 Zeilen)

**Datei:** `apps/ui/src/components/views/agent-view/input-area/orchestrator-settings.tsx`

**Zweck:** DropdownMenu-Button ähnlich TimeLimiterSettings, für Orchestrator-Konfiguration

**UI-Elemente:**

- **Trigger-Button:** Icon-Button (Repeat/Workflow Icon) in der InputControls-Leiste
  - Zeigt aktiven Status (farbig wenn enabled)
  - Zeigt Iterations-Counter wenn aktiv: `3/100`
- **Dropdown-Inhalt:**
  - Header: "Orchestrator Settings"
  - Enable/Disable Toggle (Switch)
  - Trigger Keyword Input (Text, default: `OPEN_NEW_CHAT`)
  - Max Iterations Input (Number, 1-999)
  - Auto-Send Toggle
  - Current Status (wenn aktiv): Iteration X/Y

**Pattern:** Exakt wie `time-limiter-settings.tsx` (DropdownMenu + Button + Switch + Input)

**Geschätzt:** ~170 Zeilen

---

### Phase 3: Integration in agent-view.tsx (~40 Zeilen Ergänzung)

**Datei:** `apps/ui/src/components/views/agent-view.tsx` (Ergänzung)
**Datei:** `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx` (Ergänzung)

**Änderungen in agent-view.tsx:**

- Import `useOrchestratorStore`
- Neuer `useEffect` analog zum Time-Limiter auto-switch (L179-208):
  - Hört auf `isProcessing` Wechsel von `true` → `false`
  - Prüft letzte KI-Nachricht mit `shouldTrigger()`
  - Wenn Trigger: Kopiert letzte KI-Nachricht in `pendingOrchestratorContent`
  - Erstellt neuen Chat via `quickCreateSessionRef`
  - Incrementiert Iteration
- Neuer `useEffect` für pending content (analog L170-177):
  - Wenn `pendingOrchestratorContent` vorhanden + neuer Chat aktiv
  - Setzt Content als Input UND sendet automatisch (wenn autoSend enabled)

**Änderungen in input-controls.tsx:**

- Import `OrchestratorSettings`
- Einfügen neben `TimeLimiterSettings` in der Controls-Leiste

**Geschätzt:** ~40 Zeilen Ergänzung (agent-view) + ~5 Zeilen (input-controls)

---

## 🧩 Zusammenfassung

| Phase      | Datei                                          | Zeilen   | Status |
| ---------- | ---------------------------------------------- | -------- | ------ |
| 1          | `orchestrator-store.ts` (NEU)                  | ~120     | ✅     |
| 2          | `orchestrator-settings.tsx` (NEU)              | ~170     | ✅     |
| 3          | `agent-view.tsx` + `input-controls.tsx` (EDIT) | ~45      | ✅     |
| **Gesamt** |                                                | **~335** |        |

---

## 🔑 Wichtige Architektur-Entscheidungen

1. **Letzte KI-Nachricht 1:1 kopieren, nicht Context-Summary**: Der User wünscht explizit, dass die KI selbst den Kontext liefert (z.B. Master-Plan). Wir kopieren die letzte `assistant`-Nachricht direkt.

2. **Auto-Send statt nur Input setzen**: Im Gegensatz zum Time Limiter (der nur in den Input einfügt) soll der Orchestrator den Text auch automatisch absenden. Dafür nutzen wir `sendMessage()` direkt nach Session-Erstellung.

3. **Keyword per Regex, nicht String.includes**: Für Flexibilität (User könnte auch Regex-Patterns eingeben wollen). Aktuell einfach `content.includes(keyword)`, aber erweiterbar.

4. **Iteration-Tracking pro Enable-Zyklus**: Wird bei jedem Enable zurückgesetzt. Verhindert Endlosschleifen.

5. **Unabhängig vom Time Limiter**: Beide können gleichzeitig aktiv sein. Time Limiter hat Priorität (prüft zuerst), Orchestrator wird nur geprüft wenn Time Limiter nicht ausgelöst hat.
