# Plan 23: Dashboard Aktionen, Verfeinerung & Model-Wahl

ULTRATHINK

> **Feature:** Regenerate/Simplify/Detail-Aktionen, Model-Selector und Verfeinerungsoptionen fuer Overviews
> **Erstellt:** 2026-03-10
> **Status:** ✅ Abgeschlossen (2026-03-11)
> **Abhaengig von:** Plan 21 (OverviewService & Generation), Plan 22 (Rendering & Persistierung)
> **Master-Orchestrator:** `plans/standalone-chat-v2/00-global-tasklist.md`

---

## Strategie & Ziele

### Was soll das Feature leisten?

Nachdem die Basis-Generierung (Plan 21) und das Rendering (Plan 22) stehen, bekommt der User **erweiterte Kontrolle** ueber die generierten Overviews:

1. **Regenerate:** Die gleiche Analyse nochmal ausfuehren (z.B. nach neuen Commits)
2. **Simplify:** Die Uebersicht in einfacherer Sprache neu generieren (keine Fachbegriffe)
3. **More Detail:** Die Uebersicht mit mehr Erklaerungen und Kontext regenerieren
4. **Model-Selector:** Waehlen, welches KI-Modell die Analyse durchfuehrt (unabhaengig vom Chat-Modell)

**Was bedeutet das konkret fuer den User?**

> Der User generiert eine 24h-Uebersicht, findet sie aber zu technisch. Er klickt "Vereinfachen" -> die KI generiert die gleiche Analyse nochmal, diesmal in alltagstauglicher Sprache. Oder er wechselt das Modell auf "Opus" fuer tiefere Analyse und klickt "Neu generieren".

### Warum als separater Plan?

- **Trennung von Kern und Erweiterung:** Die Basis-Generierung (Plan 21) soll erstmal stabil laufen
- **UI-Komplexitaet:** Model-Selector + Action-Buttons brauchen eigene UI-Logik
- **Prompt-Varianten:** Simplify/Detail erfordern unterschiedliche System-Prompts

### Verbindung zu anderen Features

- **Plan 21 (OverviewService):** `generateOverview()` bekommt neue Parameter (`mode`, `model`)
- **Plan 22 (Rendering):** Die Aktions-Buttons werden **unter** die gerenderten Cards gesetzt
- **Bestehend (Model-Resolver):** `@automaker/model-resolver` fuer Model-Alias-Aufloesung
- **Bestehend (Model-Selector-Compact):** `model-selector-compact.tsx` als UX-Vorlage

---

## Proaktive F&A & Edge Cases

### F1: Wie unterscheiden sich Regenerate, Simplify und Detail technisch?

> Alle drei rufen `OverviewService.generateOverview()` auf, aber mit unterschiedlichem `mode`:
>
> - **Regenerate (`mode: 'standard'`):** Identischer Prompt wie beim ersten Generieren. Nutzt aktuelle Daten.
> - **Simplify (`mode: 'simplify'`):** System-Prompt Zusatz: "Erklaere alles in einfacher Alltagssprache. Keine Fachbegriffe, keine Code-Bezeichnungen."
> - **Detail (`mode: 'detail'`):** System-Prompt Zusatz: "Erklaere jeden Punkt ausfuehrlich. Beschreibe Zusammenhaenge. Gib konkrete Beispiele."

### F2: Soll der Model-Selector persistent sein?

> **Ja.** Der gewaehlte Model-Override wird im Dashboard-Store gespeichert (localStorage). Default: Standard-Modell (Sonnet). Der Override gilt nur fuer Overview-Generierung, nicht fuer den Chat.

### F3: Welche Modelle stehen zur Auswahl?

> Alle Claude-Modelle, die der User konfiguriert hat:
>
> - `haiku` (schnell, guenstig)
> - `sonnet` (Standard, ausgewogen)
> - `opus` (tiefste Analyse, teuerste)
>   Aufgelöst via `@automaker/model-resolver`.

### F4: Werden die Aktions-Buttons vor oder nach der ersten Generierung angezeigt?

> **Nur nach der ersten Generierung.** Im Empty State gibt es nur den "Generieren"-Button. Erst wenn Daten da sind, erscheinen Regenerate/Simplify/Detail als zusaetzliche Aktions-Buttons.

### F5: Kann man waehrend einer laufenden Generierung das Modell wechseln?

> **Nein.** Waehrend der Generierung sind Model-Selector und Action-Buttons disabled.

### F6: Soll der Mode im JSON persistiert werden?

> **Ja.** Das `DashboardOverviewData`-Interface hat ein Feld `mode: 'standard' | 'simplify' | 'detail'`. So weiss die UI, welcher Mode verwendet wurde, und markiert den entsprechenden Button als "aktiv".

### F7: Was passiert bei einem Fehler waehrend Simplify/Detail?

> Gleiche Error-Behandlung wie bei Standard-Generierung (Plan 22). Error-State mit Retry-Button. Der vorherige Overview bleibt erhalten (wird erst nach erfolgreichem Neurendering ersetzt).

### F8: Was passiert, wenn das gewaehlte Modell nicht verfuegbar ist?

> **Fallback auf Standard-Modell (Sonnet).** Info-Hinweis im Error-State: "Modell nicht verfuegbar, verwende Standard-Modell."

---

## Konkrete Beispiele

```
User hat eine 24h-Uebersicht generiert -> sieht Cards + Aktions-Buttons
User klickt "Vereinfachen" -> Loading-State -> KI generiert mit Simplify-Prompt
-> Neue Cards erscheinen in einfacherer Sprache, "Vereinfachen"-Button ist aktiv markiert

User oeffnet Model-Selector -> waehlt "Claude Opus" statt "Sonnet"
User klickt "Neu generieren" -> Loading -> Opus analysiert -> detailliertere Ergebnisse
-> Model-Badge zeigt "Opus" an, Overview ist umfangreicher

User klickt "Mehr Details" -> KI generiert mit Detail-Prompt
-> Overview enthaelt ausfuehrlichere Erklaerungen und Code-Referenzen
```

---

## Leistung & Optimierung

- **Kein Doppel-Request:** Action-Buttons disabled waehrend Generierung
- **Vorheriger Overview bleibt sichtbar:** Waehrend Regenerierung sieht der User die alte Version (mit Loading-Overlay)
- **Model-Wechsel ohne Seiteneffekte:** Model-Override gilt nur fuer Overview, Chat bleibt unberuehrt

---

## Code-Wiederverwendung

| Bestehendes Element                                      | Wiederverwendung                              |
| -------------------------------------------------------- | --------------------------------------------- |
| `apps/chat/src/components/model-selector-compact.tsx`    | **Vorlage** fuer Model-Dropdown im Dashboard  |
| `@automaker/model-resolver` `resolveModelString()`       | Model-Alias-Aufloesung                        |
| `apps/chat/src/stores/dashboard-store.ts`                | Erweitern um `mode` und `modelOverride`       |
| `apps/server/src/services/overview-service.ts` (Plan 21) | Erweitern um `mode` und `model` Parameter     |
| `apps/server/src/routes/overview/` (Plan 21)             | Erweitern des POST-Handlers um neue Parameter |

---

## Phasen & Komponenten

### Phase 1: Backend -- Mode-Parameter & Prompt-Varianten (~200 Zeilen)

> **Was bedeutet das konkret?** Der `OverviewService` wird um Regenerate/Simplify/Detail-Modi erweitert und das Prompt-Building bekommt mode-spezifische Anweisungen.

#### 1.1 OverviewService erweitern: Mode-Parameter

**`apps/server/src/services/overview-service.ts`** (~60 Zeilen Aenderung)

- `generateOverview()` Signatur erweitern:
  - Neuer Parameter: `options?: { mode?: 'standard' | 'simplify' | 'detail'; modelOverride?: string }`
  - Mode-Default: `'standard'`
  - Model-Override: Falls gesetzt, dieses Modell statt dem Standard verwenden

#### 1.2 Prompt-Builder: Mode-Varianten

**`apps/server/src/services/overview-service.ts`** (~80 Zeilen Aenderung)

- `buildOverviewPrompt()` erweitern um `mode`-Parameter
- **Simplify-Zusatz:**
  - "Erklaere alles in einfacher Alltagssprache."
  - "Keine Fachbegriffe, keine Code-Bezeichnungen."
  - "Schreibe so, als wuerdest du es einem Nicht-Techniker erklaeren."
  - "Maximal 2 Saetze pro Punkt."
- **Detail-Zusatz:**
  - "Erklaere jeden Punkt ausfuehrlich."
  - "Beschreibe Zusammenhaenge zwischen Aenderungen."
  - "Erklaere technische Entscheidungen und Auswirkungen."
  - "Nenne konkrete Dateien und Code-Patterns."
  - "Gib Verbesserungsvorschlaege mit Begruendung."

#### 1.3 Model-Override im KI-Aufruf

**`apps/server/src/services/overview-service.ts`** (~40 Zeilen Aenderung)

- `_callClaude()` erweitern:
  - Falls `modelOverride` gesetzt: `resolveModelString(modelOverride)` aufrufen
  - Resultierendes Modell im API-Call verwenden: `client.messages.create({ model: resolvedModel, ... })`
  - Fallback bei ungueltigem Modell: Standard-Modell verwenden + Warnung loggen

#### 1.4 Route erweitern

**`apps/server/src/routes/overview/index.ts`** (~20 Zeilen Aenderung)

- `POST /api/overview/generate` Body erweitern:
  - `mode?: 'standard' | 'simplify' | 'detail'`
  - `modelOverride?: string`
- Parameter an `overviewService.generateOverview()` weiterreichen

**Geschaetzt: ~200 Zeilen neue/geaenderte Zeilen, verteilt auf 2 Dateien**

---

### Phase 2: Frontend -- Action-Buttons UI (~300 Zeilen)

> **Was bedeutet das konkret?** Unter den gerenderten Overview-Cards erscheinen Action-Buttons (Regenerate, Simplify, Detail) und ein Model-Selector-Dropdown.

#### 2.1 Action-Buttons Komponente

**`apps/chat/src/components/dashboard-action-bar.tsx`** (~120 Zeilen, neue Datei)

- React-Komponente `DashboardActionBar`
- Props: `data: DashboardOverviewData | null`, `isGenerating: boolean`, `onAction: (mode, model?) => void`
- **Wenn `data === null`:** Nur grosser "Generieren"-Button (aus Plan 20 Empty State)
- **Wenn `data !== null`:**
  - "Neu generieren" Button (Standard-Modus)
  - "Vereinfachen" Button (mit aktiv-Markierung wenn `data.mode === 'simplify'`)
  - "Mehr Details" Button (mit aktiv-Markierung wenn `data.mode === 'detail'`)
- Alle Buttons disabled waehrend `isGenerating`
- Tailwind: Pill-Style Buttons mit `hover:` und `active:` States
- Model-Info-Badge: "Generiert mit [Model] am [Datum]"

#### 2.2 Model-Selector fuer Dashboard

**`apps/chat/src/components/dashboard-model-selector.tsx`** (~80 Zeilen, neue Datei)

- Kompaktes Dropdown im Toolbar-Bereich des Dashboard-Panels
- Optionen:
  - "Sonnet (Standard)" -- Default
  - "Haiku (Schnell)"
  - "Opus (Ausfuehrlich)"
- Nutzt `resolveModelString()` Pattern
- Change-Handler: `onModelChange(modelAlias)`
- Disabled waehrend Generierung
- Persisted im Dashboard-Store

#### 2.3 Dashboard-Panel Integration

**`apps/chat/src/components/dashboard-panel.tsx`** (Plan 20, ~60 Zeilen Ergaenzung)

- `DashboardActionBar` einbinden (unterhalb der Overview Cards)
- `DashboardModelSelector` einbinden (im Toolbar-Bereich, neben Generate-Button)
- Action-Handler: Bei Klick auf Action-Button -> `generateOverview(sinceHours, { mode, model })` aufrufen
- Die alte Overview bleibt sichtbar waehrend die neue generiert wird

#### 2.4 Dashboard-Store erweitern

**`apps/chat/src/stores/dashboard-store.ts`** (~40 Zeilen Ergaenzung)

- Neue State-Variablen:
  - `modelOverride: string` (Standard: 'sonnet')
  - `lastUsedMode: 'standard' | 'simplify' | 'detail'` (Standard: 'standard')
- Aktionen:
  - `setModelOverride(model)` -- Model-Wahl aendern
  - `setLastUsedMode(mode)` -- Letzten Mode speichern
- Persistierung im localStorage

**Geschaetzt: ~300 Zeilen neue/geaenderte Zeilen, verteilt auf 4 Dateien**

---

### Phase 3: Frontend -- Integration & Polish (~200 Zeilen)

> **Was bedeutet das konkret?** Die Action-Buttons und Model-Selector werden in den bestehenden Dashboard-Flow integriert und die UX wird verfeinert.

#### 3.1 API-Client erweitern

**`apps/chat/src/hooks/use-dashboard.ts`** (Plan 20/22, ~40 Zeilen Ergaenzung)

- `generateOverview()` erweitern um `mode` und `modelOverride` Parameter
- HTTP POST Body: `{ projectPath, sinceHours, mode, modelOverride }`
- Nach erfolgreicher Generierung: `lastUsedMode` im Store aktualisieren

#### 3.2 Aktiver-Mode-Anzeige

**`apps/chat/src/components/dashboard-overview-cards.tsx`** (Plan 22, ~30 Zeilen Ergaenzung)

- Kleiner Badge im Header: "Modus: Standard / Vereinfacht / Detailliert"
- Modell-Info: "Generiert mit Sonnet" (dezent, muted Farbe)
- Falls `mode !== 'standard'`: Visueller Hinweis dass der Overview modifiziert ist

#### 3.3 Loading-Overlay statt Replace

**`apps/chat/src/components/dashboard-panel.tsx`** (~40 Zeilen Ergaenzung)

- Wenn eine Regenerierung laeuft (Simplify/Detail/Regenerate):
  - Die vorherige Overview bleibt sichtbar
  - Ein halbtransparentes Loading-Overlay darueber
  - Cancel-Button im Overlay
  - Bei Fehler: Overlay verschwindet, alte Overview bleibt
  - Bei Erfolg: Neue Overview ersetzt die alte smooth

#### 3.4 Keyboard-Shortcut (optional)

**`apps/chat/src/components/dashboard-panel.tsx`** (~20 Zeilen Ergaenzung)

- `Ctrl+Shift+G` -> Generieren/Regenerieren im aktiven Tab
- Nur aktiv wenn Dashboard-Panel offen und sichtbar

#### 3.5 Accessibility & UX-Feinschliff

**Verteilt auf mehrere Dateien** (~70 Zeilen gesamt)

- Action-Buttons: `aria-label`, `aria-pressed` fuer aktiven Mode
- Model-Selector: `aria-label="Modell fuer Uebersicht waehlen"`
- Loading-State: `aria-live="polite"` fuer Phasen-Updates
- Tooltips auf Buttons: Kurze Erklaerung was jeder Mode tut
- Tab-Navigation: Buttons per Tab erreichbar, Enter zum Aktivieren

**Geschaetzt: ~200 Zeilen neue/geaenderte Zeilen, verteilt auf 4-5 Dateien**

---

## Zusammenfassung

| Phase      | Typ      | Dateien         | ~Zeilen  | Inhalt                                            |
| ---------- | -------- | --------------- | -------- | ------------------------------------------------- |
| 1          | Backend  | 2 Dateien       | ~200     | Mode-Parameter, Prompt-Varianten, Model-Override  |
| 2          | Frontend | 4 Dateien       | ~300     | Action-Buttons, Model-Selector, Store-Erweiterung |
| 3          | Frontend | 4-5 Dateien     | ~200     | Integration, Loading-Overlay, Accessibility       |
| **Gesamt** |          | **~10 Dateien** | **~700** |                                                   |

### Umsetzungs-Reihenfolge

1. Phase 1 zuerst (Backend muss die neuen Parameter unterstuetzen)
2. Phase 2 danach (UI-Elemente erstellen)
3. Phase 3 zuletzt (alles verbinden und polieren)

### CHAT-Zuordnung

- **CHAT 12:** Phase 1 + Phase 2 + Phase 3 (~80.000 Tokens geschaetzt)

---

## Dokumentation

Nach Abschluss aktualisieren:

- `plans/standalone-chat-v2/00-global-tasklist.md` -> Plan 23 als erledigt markieren
- JSON-Schema um `mode`-Feld dokumentieren
- Model-Selector-Integration dokumentieren

## Umgesetzt am 2026-03-11

- Backend nimmt jetzt `mode` und `modelOverride` in der Generate-Route an.
- `OverviewService` nutzt den Modus für passende Prompt-Hinweise und löst Modell-Aliase sauber auf.
- Dashboard-Store speichert Modell-Wahl und letzten Modus im Browser-Speicher.
- Dashboard-UI zeigt Modell-Auswahl plus Aktionsknöpfe für Neu generieren, Vereinfachen und Mehr Details.
- Beim Neuladen bleibt die alte Übersicht sichtbar und ein Lade-Overlay zeigt den Fortschritt.
- TypeScript geprüft:
  - `npm run typecheck --workspace=apps/chat`
  - `npx tsc --noEmit` in `apps/server`
