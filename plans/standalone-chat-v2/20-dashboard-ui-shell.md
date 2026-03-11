# 📋 Plan 20: Dashboard UI Shell & Navigation

ULTRATHINK

> **Feature:** Neues Dashboard-Panel in der linken Sidebar mit Tab-Umschalter und Zeitraum-Tabs
> **Erstellt:** 2026-03-10
> **Status:** ✅ Abgeschlossen
> **Abhängig von:** Plan 19 (Zeitfilter-Logik für spätere Integration)
> **Voraussetzung für:** Plan 22 (Rendering), Plan 23 (Aktionen)
> **Master-Orchestrator:** `plans/standalone-chat-v2/00-global-tasklist.md`

---

## 🎯 Strategie & Ziele

### Was soll das Feature leisten?

Ein komplett neues Panel, das **neben dem Verlauf-Panel** in der linken Sidebar lebt. Der User kann zwischen "Verlauf" und "Übersicht" hin- und herschalten. Das Übersicht-Panel hat eigene **Zeitraum-Tabs** (12h, 24h, 4 Tage, 1 Woche) und einen **Generieren-Button**.

**Was bedeutet das konkret für den User?**
> Statt nur alte Chats im Verlauf zu sehen, kann der User jetzt auf "Übersicht" klicken und bekommt ein intelligentes Dashboard. Dort sieht er auf einen Blick, was im Projekt passiert ist — aufgeteilt nach Zeiträumen.

### Verbindung zu anderen Features

- **Verlauf-Panel (bestehend):** Teilt den gleichen Seitenbereich. Ein Tab-Umschalter wechselt zwischen beiden.
- **Markdown Explorer (rechte Sidebar):** Bleibt unverändert, lebt separat.
- **Session Tabs (oben):** Unabhängig — Session Tabs sind oberhalb, Dashboard-Tab ist seitlich.
- **Dashboard Generation (Plan 21):** Der "Generieren"-Button sendet eine Anfrage an das Backend (Plan 21).

---

## ❓ Proaktive F&A & Edge Cases

### ✅ F1: Wo genau wird das Dashboard angezeigt?
→ Im gleichen Seitenbereich wie der Verlauf-Tab (linke Sidebar). Ein **Tab-Umschalter** oben ermöglicht den Wechsel zwischen "📋 Verlauf" und "📊 Übersicht".

### ✅ F2: Können Verlauf und Dashboard gleichzeitig offen sein?
→ Nein, nur eins gleichzeitig. Der Tab-Umschalter schaltet den gesamten Panel-Inhalt um. Ähnlich wie Browser-Tabs.

### ✅ F3: Was passiert mit der Panel-Breite?
→ Gleicher Resize-Handle wie beim Verlauf-Panel. Die Breite wird geteilt. Wenn der User das Verlauf-Panel auf 350px gezogen hat, hat das Dashboard auch 350px.

### ✅ F4: Soll der aktive Tab gespeichert werden?
→ Ja, im Zustand-Store. Wenn der User zuletzt "Übersicht" offen hatte, soll beim Neuladen wieder "Übersicht" aktiv sein.

### ✅ F5: Was sehen die Zeitraum-Tabs am Anfang (ohne Daten)?
→ Leerer Zustand mit einem großen "Übersicht generieren"-Button und einer kurzen Erklärung: "Klicke auf 'Generieren' um eine Zusammenfassung der letzten [Zeitraum] zu erstellen."

### ✅ F6: Wie verhält sich das Dashboard bei neuem Projekt?
→ Alle Zeitraum-Tabs sind leer. Kein automatisches Generieren. Der User muss aktiv auf "Generieren" klicken.

### ✅ F7: Soll das Dashboard den Chat beeinflussen?
→ Nein. Das Dashboard ist ein separates, nur-lesen-Panel. Es teilt keinen Zustand mit dem Chat-Fenster.

### ✅ F8: Was passiert, wenn die linke Sidebar geschlossen wird?
→ Beim Schließen der linken Sidebar verschwindet sowohl Verlauf als auch Dashboard. Beim Öffnen erscheint der zuletzt aktive Tab wieder. Der Dashboard-Zustand (generierte Daten) bleibt im Store erhalten.

---

## 📱 Konkrete Beispiele

```
🖥️ User öffnet linke Sidebar → Sieht Tab-Umschalter: [📋 Verlauf] [📊 Übersicht]
🖥️ User klickt "📊 Übersicht" → Verlauf verschwindet, Dashboard erscheint
🖥️ User sieht Zeitraum-Tabs: [12h] [24h] [4 Tage] [1 Woche]
🖥️ User klickt "24h" Tab → Sieht "Noch keine Übersicht generiert"
🖥️ User klickt "🔄 Generieren" → Ladebildschirm → (Plan 21 generiert)
🖥️ User wechselt zurück zu "📋 Verlauf" → Verlauf-Panel wieder da
✅ Nahtloses Umschalten ohne Datenverlust!
```

---

## ⚡ Leistung & Optimierung

- **Bedingtes Rendern:** Das Dashboard-Panel wird erst beim ersten Öffnen gemountet (React lazy). Solange der User nur den Verlauf nutzt, kostet das Dashboard nichts.
- **Kein Netzwerk-Aufruf beim Tab-Wechsel:** Alles lokal im Zustand-Store. Nur CSS-Wechsel.
- **Geteilte Breite:** Nur ein Resize-Handle, Breite wird geteilt.
- **Zustand bleibt erhalten:** Zeitraum-Tabs-Inhalte bleiben im Store, auch beim Tab-Wechsel.

---

## 🔄 Code-Wiederverwendung

| Bestehendes Element | Wiederverwendung |
|---------------------|------------------|
| `apps/chat/src/components/chat-sidebar-left.tsx` | **Umbauen:** Tab-Umschalter hinzufügen, bedingt Verlauf oder Dashboard anzeigen |
| `apps/chat/src/components/history-panel.tsx` | **Vorlage** für Panel-Struktur, Header, Layout |
| `apps/chat/src/stores/session-store.ts` | **Vorlage** für Store-Pattern (Zustand mit Persistierung) |
| `apps/chat/src/hooks/use-chat-panel-preferences.ts` | Erweitern um `activeSidebarTab` Einstellung |
| Tailwind CSS Klassen aus History-Panel | Konsistentes Look & Feel (Farben, Abstände, Ränder) |

---

## 🧩 Phasen & Komponenten

### Phase 1: Frontend — Tab-Umschalter & Sidebar-Umbau (~250 Zeilen)

> **Was bedeutet das konkret?** Die linke Sidebar bekommt oben einen Tab-Umschalter. Der User kann zwischen "Verlauf" und "Übersicht" hin- und herschalten.

#### 1.1 ChatSidebarLeft umbauen

**`apps/chat/src/components/chat-sidebar-left.tsx`** (~80 Zeilen Änderung)
- Am Anfang des Panels einen **Tab-Umschalter** einfügen:
  - Zwei Buttons/Tabs: "📋 Verlauf" (Standard aktiv) und "📊 Übersicht"
  - Tailwind CSS für aktiven/inaktiven Zustand (ähnlich Session-Tab-Styling)
- Bestehender HistoryPanel-Inhalt wird bedingt angezeigt: nur wenn `activeSidebarTab === 'history'`
- Neues DashboardPanel wird bedingt angezeigt: nur wenn `activeSidebarTab === 'overview'`
- Props-Interface erweitern um `activeSidebarTab` und `onSidebarTabChange`

#### 1.2 Panel-Preferences erweitern

**`apps/chat/src/hooks/use-chat-panel-preferences.ts`** (~30 Zeilen Änderung)
- Neue Einstellung: `activeSidebarTab: 'history' | 'overview'` (Standard: 'history')
- Persistierung im localStorage
- Getter und Setter bereitstellen

#### 1.3 ChatView Integration

**`apps/chat/src/components/chat-view.tsx`** oder **`chat-view-layout.tsx`** (~40 Zeilen Änderung)
- `activeSidebarTab` aus den Preferences lesen
- An ChatSidebarLeft als Prop weitergeben
- `onSidebarTabChange` Callback implementieren

**Geschätzt: ~250 Zeilen neue/geänderte Zeilen, verteilt auf 3 Dateien**

---

### Phase 2: Frontend — Dashboard-Panel Grundgerüst (~350 Zeilen)

> **Was bedeutet das konkret?** Ein neues React-Komponent für das Dashboard-Panel mit Zeitraum-Tabs, leerem Zustand und Generieren-Button.

#### 2.1 Dashboard-Panel Komponente

**`apps/chat/src/components/dashboard-panel.tsx`** (~200 Zeilen, neue Datei)
- React-Komponente `DashboardPanel`
- **Zeitraum-Tab-Leiste:** 4 Buttons (12h, 24h, 4 Tage, 1 Woche) mit aktivem Zustand
- **Inhaltsbereich** pro Zeitraum-Tab:
  - Wenn keine Daten: Leerer Zustand mit Generieren-Button + Erklärungstext
  - Wenn Daten vorhanden: Platzhalter für Card-Rendering (Plan 22)
  - Wenn wird geladen: Ladebildschirm mit Phasen-Anzeige
  - Wenn Fehler: Fehlermeldung mit Nochmal-Button
- **Generieren-Button:** Prominent, farbig, sendet Anfrage (Plan 21)
- **Abbrechen-Button:** Während der Generierung sichtbar
- Props: `onGenerate(timeRange)`, `onCancel()`, diverse Zustands-Props

#### 2.2 Dashboard Zeitraum-Tabs Unterkomponente

**`apps/chat/src/components/dashboard-time-tabs.tsx`** (~80 Zeilen, neue Datei)
- Kleine Komponente nur für die Zeitraum-Tab-Leiste
- Props: `activeTab`, `onTabChange`, `tabStatus` (welche Tabs haben Daten: grüner Punkt)
- Zeitraum-Optionen als Konstante:
  - `{ id: '12h', label: '12h', hours: 12 }`
  - `{ id: '24h', label: '24h', hours: 24 }`
  - `{ id: '4d', label: '4 Tage', hours: 96 }`
  - `{ id: '1w', label: '1 Woche', hours: 168 }`
- Visueller Indikator (kleiner Punkt) bei Tabs, die bereits Daten haben

#### 2.3 Dashboard leerer Zustand

**`apps/chat/src/components/dashboard-empty-state.tsx`** (~60 Zeilen, neue Datei)
- Motivierender Zustand wenn noch nichts generiert wurde
- Großer "🔄 Übersicht generieren" Button
- Kurze Erklärung: "Klicke auf Generieren, um eine Zusammenfassung der letzten [Zeitraum] zu erstellen."
- Kleine Illustrationen oder Icons die den Nutzen andeuten
- Props: `timeRangeLabel`, `onGenerate`

**Geschätzt: ~350 Zeilen neue/geänderte Zeilen, verteilt auf 3 neue Dateien**

---

### Phase 3: Frontend — Dashboard-Store & Zustandsverwaltung (~300 Zeilen)

> **Was bedeutet das konkret?** Ein eigener Zustand-Store für das Dashboard mit Daten-Cache, Lade-Zustand und Zeitraum-Verwaltung.

#### 3.1 Dashboard-Store

**`apps/chat/src/stores/dashboard-store.ts`** (~200 Zeilen, neue Datei)
- Zustand-Store `useDashboardStore` mit:
  - `activeTimeRange: '12h' | '24h' | '4d' | '1w'` (Standard: '24h')
  - `overviewCache: Record<string, DashboardOverviewData | null>` — gecachte Übersichten pro Zeitraum
  - `isGenerating: boolean`
  - `generatingProgress: string` (Phasen-Text für Ladebildschirm)
  - `error: string | null`
- Aktionen:
  - `setActiveTimeRange(range)` — Tab wechseln
  - `setOverviewData(timeRange, data)` — Daten im Cache speichern
  - `getOverviewData(timeRange)` — Daten aus Cache lesen
  - `setGenerating(isGenerating, progress?)` — Lade-Zustand setzen
  - `setError(message)` — Fehler-Zustand setzen
  - `clearError()` — Fehler zurücksetzen
  - `reset()` — Alles zurücksetzen (beim Projektwechsel)
- Persistierung: `activeTimeRange` im localStorage, `overviewCache` nicht (wird vom Server geladen)

#### 3.2 Dashboard-Typen

**`apps/chat/src/stores/dashboard-types.ts`** (~60 Zeilen, neue Datei)
- `DashboardTimeRange = '12h' | '24h' | '4d' | '1w'`
- `DashboardOverviewData` Interface:
  - `timeRange`, `generatedAt` (ISO Zeitstempel), `model` (welches KI-Modell)
  - `summary` (2-3 Sätze Zusammenfassung)
  - `sections: DashboardSection[]` (Was wurde gemacht)
  - `improvements: DashboardImprovement[]` (Verbesserungsvorschläge)
  - `security: DashboardSecurityItem[]` (Sicherheitshinweise)
  - `stats: DashboardStats` (Dateien geändert, Commits, Zeilen+/-)
  - `metadata: DashboardMetadata` (Git verfügbar, Dateien analysiert, gekürzt?)
  - `mode: 'standard' | 'simplify' | 'detail'` (welcher Modus wurde verwendet)
- Untertypen: `DashboardSection`, `DashboardItem`, `DashboardImprovement`, `DashboardSecurityItem`, `DashboardStats`, `DashboardMetadata`

#### 3.3 Dashboard-Hook

**`apps/chat/src/hooks/use-dashboard.ts`** (~40 Zeilen, neue Datei)
- Hook `useDashboard()` der den Store + nützliche Hilfsfunktionen bündelt
- `hasDataForTab(timeRange)` — prüft ob Daten im Cache oder auf Server liegen
- `currentData` — Daten für den aktiven Zeitraum-Tab
- Koppelt Store-Selektoren mit `useShallow` (Zustand-Regel aus Memory!)

**Geschätzt: ~300 Zeilen neue/geänderte Zeilen, verteilt auf 3 neue Dateien**

---

## 📋 Zusammenfassung

| Phase | Typ | Dateien | ~Zeilen | Inhalt |
|-------|-----|---------|---------|--------|
| 1 | Frontend | 3 Dateien | ~250 | Tab-Umschalter, Sidebar-Umbau, Preferences |
| 2 | Frontend | 3 Dateien | ~350 | Dashboard-Panel, Zeitraum-Tabs, Leerer Zustand |
| 3 | Frontend | 3 Dateien | ~300 | Store, Typen, Hook |
| **Gesamt** | | **~9 Dateien** | **~900** | |

### Umsetzungs-Reihenfolge
1. Phase 3 zuerst (Store + Typen = Grundlage für alles)
2. Phase 2 danach (UI-Komponenten nutzen den Store)
3. Phase 1 zuletzt (Sidebar-Umbau bindet Dashboard-Panel ein)

### CHAT-Zuordnung
- **CHAT 9:** Phase 3 + Phase 2 + Phase 1 zusammen (~40-50k Tokens geschätzt, gemeinsam mit Plan 19)

---

## 📚 Dokumentation

Nach Abschluss aktualisieren:
- `plans/standalone-chat-v2/00-global-tasklist.md` → Plan 20 als ✅ markieren
- Die Tab-Umschalter-Architektur kurz dokumentieren (falls andere Panels später auch Tabs bekommen)
