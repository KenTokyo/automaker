# 🔘 Phase 5: Systemprompt-Schalter

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)
**Voraussetzung:** Phase 2 (Server-Routen) und Phase 3 (UI Store) müssen abgeschlossen sein

---

## 🎯 Was soll diese Phase leisten?

Ein Toggle-Schalter wird in den Input-Bereich des Agent-Views eingebaut. Wenn aktiviert, bekommt der KI-Agent eine zusätzliche Anweisung im Systemprompt: "Wenn du eine Aufgabe abgeschlossen hast, erstelle einen Eintrag über die `/api/completed-tasks`-Route." So werden erledigte Aufgaben automatisch erfasst, ohne dass der User manuell etwas eintragen muss.

**Was bedeutet das für den User?** Ein kleiner Schalter neben den anderen Einstellungen. Einschalten → die KI dokumentiert ab jetzt automatisch, was sie erledigt hat. Ausschalten → keine automatische Erfassung.

---

## 🚀 Strategie

Der Schalter folgt dem bestehenden Pattern der Input-Controls (wie `OrchestratorSettings` und `TimeLimiterSettings`):

1. Ein kleiner Icon-Button in der Controls-Leiste
2. Bei Klick öffnet sich ein Dropdown mit Erklärung und Toggle
3. Der Toggle-Zustand wird im Store und in den Projekt-Settings gespeichert
4. Beim Senden einer Nachricht wird der Systemprompt-Zusatz eingefügt, wenn aktiv

### Abhängigkeiten

- Phase 2 (Server-Route muss existieren, damit der Agent Aufgaben speichern kann)
- Input-Controls (`apps/ui/src/components/views/agent-view/input-area/input-controls.tsx`)
- Bestehende Dropdown-Patterns (`OrchestratorSettings`, `TimeLimiterSettings`)
- Store (`app-store.ts`) für den Toggle-Zustand
- Server-seitiges Prompt-System (`@automaker/prompts`)

---

## ❓ Wichtige Fragen & Antworten

**Wo genau sitzt der Schalter?**
✅ In der Controls-Leiste unter dem Textarea, neben den bestehenden Buttons (Orchestrator, Timer, usw.). Getrennt durch einen Divider (`mx-0.5 h-4 w-px bg-border`).

**Was passiert im Hintergrund, wenn der Toggle aktiv ist?**
✅ Beim Senden einer Nachricht an den Agent wird ein zusätzlicher Abschnitt an den Systemprompt angehängt. Dieser Abschnitt enthält:

- Die Anweisung, erledigte Aufgaben zu dokumentieren
- Das API-Format (welche Felder, welche Kategorien)
- Den API-Endpunkt

**Wird der Toggle-Zustand pro Projekt oder global gespeichert?**
✅ Pro Projekt. Der Zustand wird in `.automaker/settings.json` gespeichert (neben den anderen Projekt-Settings). So kann man es pro Projekt ein- oder ausschalten.

**Was wenn der Agent den Endpunkt nicht erreichen kann?**
✅ Kein Problem – der Agent versucht es, und wenn es nicht klappt, läuft der Rest trotzdem normal weiter. Es ist eine "best effort"-Dokumentation.

**Muss der Server auch angepasst werden?**
✅ Ja, minimal:

1. Der Prompt-Zusatz wird als Template in `@automaker/prompts` gespeichert
2. Die `send`-Route prüft, ob der Toggle aktiv ist, und fügt den Prompt-Abschnitt ein

---

## 📱 Beispiel: So sieht es aus

```
🖥️ Input-Bereich (Controls-Leiste):

┌─────────────────────────────────────────────────────┐
│ [Nachricht eingeben...]                              │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [📎] [🖼️] [⚙️ Orch.] [⏱️ Timer] │ [✅ Fertig-Log] │
│                                   ↑ Divider          │
└──────────────────────────────────────────────────────┘

Klick auf [✅ Fertig-Log]:

┌──────────────────────────────────┐
│ ✅ Aufgaben-Erfassung            │
│ ─────────────────────────────── │
│ Wenn aktiviert, dokumentiert     │
│ der KI-Agent automatisch alle    │
│ erledigten Aufgaben.             │
│                                  │
│ Automatisch erfassen  [  🔘 AN] │
│                                  │
│ ─────────────────────────────── │
│ Status: Aktiv für dieses Projekt │
│ 📊 12 Aufgaben bisher erfasst   │
└──────────────────────────────────┘
```

---

## 🧩 Komponenten & Dateien

### 5.1 Toggle-Komponente: `apps/ui/src/components/views/agent-view/input-area/completed-tasks-toggle.tsx` **~120 Zeilen**

Angelehnt an `orchestrator-settings.tsx`:

- **Trigger-Button:** `h-7 w-7 rounded-md border-border shrink-0`
  - Icon: `CheckCircle` von Lucide
  - Aktiv-Zustand: `border-emerald-500/50 text-emerald-600 w-auto min-w-7 px-1.5 gap-1` + Label "AN"
  - Inaktiv-Zustand: Standard-Outline-Button
- **Dropdown-Content:** `DropdownMenuContent className="w-72"`
  - **Header:** `p-3 border-b border-border`
    - Icon + Titel "Aufgaben-Erfassung"
    - Beschreibungstext (text-xs text-muted-foreground)
  - **Body:** `p-3 space-y-4`
    - Toggle-Zeile: `flex items-center justify-between`
      - Label: "Automatisch erfassen"
      - `Switch` Komponente (checked/onChange)
  - **Footer:** `pt-2 border-t border-border`
    - Status-Text: "Aktiv für dieses Projekt" oder "Deaktiviert"
    - Statistik: "X Aufgaben bisher erfasst" (optional, aus API)

**Props:**

```typescript
interface CompletedTasksToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  taskCount?: number;
  disabled?: boolean;
}
```

### 5.2 Input-Controls erweitern: `apps/ui/src/components/views/agent-view/input-area/input-controls.tsx` **~10 Zeilen Änderung**

- Divider hinzufügen nach den bestehenden Buttons
- `CompletedTasksToggle` Komponente einbinden
- Props aus dem Store lesen (`completedTasksAutoCapture`)

### 5.3 Store erweitern: `apps/ui/src/store/app-store.ts` **~10 Zeilen Änderung**

Neuer State:

- `completedTasksAutoCapture` (boolean) – Ist die automatische Erfassung aktiv?
- `setCompletedTasksAutoCapture(enabled: boolean)` – Toggle-Aktion

**Persistenz:** Der Wert wird über die Projekt-Settings API gespeichert/geladen (nicht im lokalen Zustand).

### 5.4 Projekt-Settings erweitern: Server-seitig **~15 Zeilen Änderung**

In der bestehenden Settings-Struktur (`.automaker/settings.json`):

```json
{
  "completedTasksAutoCapture": true
}
```

Die Settings-Route (`apps/server/src/routes/settings/`) liest und schreibt diesen Wert bereits generisch – es muss nur der Typ erweitert werden.

### 5.5 Prompt-Template: `libs/prompts/src/completed-task-prompt.ts` **~80 Zeilen**

Neues Prompt-Template, das dem Agent erklärt, wie er Aufgaben dokumentieren soll:

```typescript
export function getCompletedTaskCapturePrompt(apiBaseUrl: string): string {
  return `
## Automatische Aufgaben-Erfassung

Wenn du eine Aufgabe abgeschlossen hast, erstelle einen Eintrag:

POST ${apiBaseUrl}/api/completed-tasks
Content-Type: application/json

{
  "projectPath": "<aktueller Projektpfad>",
  "title": "<kurze Beschreibung, max 100 Zeichen>",
  "description": "<was genau gemacht wurde, 1-3 Sätze>",
  "category": "<feature|bugfix|improvement|refactor|config|docs>",
  "badges": ["<frontend|backend|urgent|breaking-change>"],
  "relatedFiles": ["<geänderte Dateien>"],
  "summary": "<einzeilige Zusammenfassung>"
}

Kategorien:
- feature: Komplett neues Feature
- bugfix: Fehler behoben
- improvement: Bestehendes verbessert
- refactor: Code umstrukturiert
- config: Konfiguration geändert
- docs: Dokumentation erstellt/aktualisiert

Erstelle den Eintrag NACHDEM die Arbeit erledigt ist, nicht vorher.
  `;
}
```

### 5.6 Send-Route erweitern: `apps/server/src/routes/agent/routes/send.ts` **~15 Zeilen Änderung**

Beim Senden einer Nachricht:

1. Prüfen ob `completedTasksAutoCapture` in den Projekt-Settings aktiv ist
2. Falls ja: `getCompletedTaskCapturePrompt()` aufrufen und an den Systemprompt anhängen
3. Falls nein: Nichts ändern

---

## ⚡ Edge Cases

| Was könnte passieren?                            | Lösung                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| Toggle wird mitten im Chat umgeschaltet          | Wirkt erst ab der nächsten Nachricht                                |
| Agent erstellt doppelte Einträge                 | Server prüft auf ähnliche Titel in den letzten 5 Minuten            |
| Agent sendet ungültige Kategorie                 | Server validiert und setzt auf 'improvement' als Fallback           |
| Agent vergisst den Eintrag zu erstellen          | Best-effort – keine Garantie, ist OK                                |
| Projekt-Settings-Datei existiert nicht           | Default: `completedTasksAutoCapture = false`                        |
| Mehrere Agents laufen gleichzeitig               | Jeder Agent hat den Prompt, jeder kann Einträge erstellen           |
| User schaltet Toggle aus, hat aber offenen Agent | Laufende Agents behalten ihren Prompt (Toggle wirkt erst bei neuen) |

---

## 🔄 Wiederverwendung

- **Dropdown-Pattern:** 1:1 von `OrchestratorSettings` übernommen (DropdownMenu + Header + Body + Footer)
- **Switch-Komponente:** Bestehende Radix UI Switch aus `apps/ui/src/components/ui/switch.tsx`
- **Button-Styling:** Identisch zu den anderen Control-Buttons (h-7 w-7, aktiv-Zustand mit Farbe)
- **Prompt-Pattern:** Wie bestehende Prompts in `@automaker/prompts` (Template-Funktion mit String-Rückgabe)
- **Settings-Persistenz:** Nutzt bestehende Projekt-Settings-Infrastruktur

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 7 – Phase 5 implementieren (~40.000 Tokens)

**Schritt 1:** Prompt-Template erstellen

- `libs/prompts/src/completed-task-prompt.ts`
- Export in `libs/prompts/src/index.ts` hinzufügen

**Schritt 2:** Toggle-Komponente erstellen

- `completed-tasks-toggle.tsx` mit DropdownMenu und Switch
- Aktiv/Inaktiv-Zustände

**Schritt 3:** Input-Controls erweitern

- `input-controls.tsx`: Divider + Toggle einbauen
- Props aus Store lesen

**Schritt 4:** Store erweitern

- `app-store.ts`: `completedTasksAutoCapture` State + Aktion
- Settings-API anbinden

**Schritt 5:** Send-Route erweitern

- `send.ts`: Prompt-Zusatz bei aktivem Toggle einfügen

**Schritt 6:** TypeScript-Check

- `npx tsc --noEmit` über Server und UI

---

**Vorherige Phase:** [Phase 4 – Task-Karten & Filter](./2026-03-13-phase-4-task-karten-filter.md)
**Nächste Phase:** [Phase 6 – History-Verknüpfung](./2026-03-13-phase-6-history-verknuepfung.md)
