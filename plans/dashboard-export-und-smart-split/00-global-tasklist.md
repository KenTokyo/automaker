# 🎯 Dashboard Export & Smart Split

**Erstellt:** 2026-03-12
**Status:** Planung abgeschlossen, bereit zur Umsetzung
**Betroffener Bereich:** Rechtes Panel (Dashboard, Split-Modus, Tab-Verwaltung)

---

## 🚀 Strategie & Ziele

Der User hat sich die Dashboard-Übersicht angeschaut und möchte drei konkrete Dinge verbessern:

1. **Übersicht exportieren** – Die generierte Projekt-Übersicht soll per Knopfdruck als Markdown kopiert oder als Datei gespeichert werden können. Aktuell muss man den Text manuell aus dem Chat kopieren.

2. **Smart Terminal-Split** – Wenn man das Panel aufteilt, soll nur das Terminal unten erscheinen – nicht beliebige Tabs. Der User hatte das Problem, dass Browser zweimal angezeigt wurde (oben + unten), was Ressourcen verschwendet.

3. **Verbesserungen bearbeitbar machen** – Die Verbesserungsvorschläge aus der Übersicht sollen nicht nur lesbar sein, sondern man soll sie direkt als Feature auf das Kanban-Board übernehmen können.

**Was bedeutet das konkret für den User?**
Statt mühsam Text aus dem Chat rauszukopieren, hat der User zwei Buttons: "Kopieren" und "Als Datei speichern". Das Split-Panel zeigt nur Terminal unten, keine doppelten Browser-Tabs mehr. Und die Verbesserungsvorschläge der KI können direkt zu Aufgaben werden.

---

## ❓ Fragen & Edge-Cases

✅ **Was passiert, wenn noch keine Übersicht generiert wurde?**
→ Die Export-Buttons sind ausgegraut/deaktiviert. Ein Tooltip erklärt: "Erstelle zuerst eine Übersicht".

✅ **Was passiert, wenn der User das Panel sehr schmal macht?**
→ Export-Buttons werden zu Icon-Only (wie die bestehende Mode-Tabs-Logik bei < 360px).

✅ **Was, wenn der User Terminal als Haupt-Tab hat und aufteilt?**
→ Terminal ist bereits oben. Der Split zeigt dann stattdessen "Dateien" unten (nächstbester Fallback).

✅ **Was, wenn eine Verbesserung als Feature erstellt wird – wird sie doppelt angelegt?**
→ Nach dem Erstellen wird die Verbesserung visuell markiert (Häkchen) und der Button deaktiviert.

✅ **Was passiert beim Kopieren, wenn der Text sehr lang ist?**
→ Clipboard-API hat kein Größen-Limit für Text. Funktioniert auch bei langen Übersichten.

✅ **Wo wird die exportierte Datei gespeichert?**
→ Im Projekt unter `.automaker/overviews/overview-{zeitraum}-{datum}.md`. Der User wird per kurzer Benachrichtigung informiert.

---

## 📱 Beispiele

```
🖥️ Du öffnest die Übersicht → Siehst die generierte Zusammenfassung
📋 Du klickst "Kopieren" → Alles als Markdown im Zwischenspeicher
💾 Du klickst "Speichern" → Datei liegt unter .automaker/overviews/
✅ Fertig – du kannst die Zusammenfassung jetzt überall einfügen oder öffnen!
```

```
🖥️ Du klickst den Split-Button → Terminal erscheint unten
📐 Du ziehst die Trennlinie → Terminal wird größer/kleiner
❌ Browser erscheint NICHT doppelt → Ressourcen gespart!
```

```
🖥️ Übersicht zeigt "Files Panel UX – Eingabefelder vereinheitlichen" als Verbesserung
👉 Du klickst "Als Feature übernehmen" → Feature erscheint auf dem Board
✅ Verbesserung ist jetzt markiert mit Häkchen
```

---

## ⚡ Performance & Regeln

- **Kein zusätzlicher API-Call** für den Export – die Daten sind bereits im Dashboard-Store gecacht
- **Markdown-Konvertierung** passiert rein client-seitig (kein Server-Roundtrip für Copy)
- **Datei-Speicherung** nutzt einen einzigen POST-Endpunkt
- **Lazy Unmount** beim Schließen des Split-Panels → Browser-iframe wird freigegeben
- **useCallback** für alle Export-Handler (Regel 3.2)
- **Keine verschachtelten Komponenten** (Regel 2.1)

---

## 📋 Phasen-Übersicht

| Phase | Name | Bereich | Geschätzte Zeilen | Status |
|-------|------|---------|-------------------|--------|
| 1 | Dashboard Export (Kopieren & Speichern) | Frontend + Backend | ~500 | ✅ Fertig |
| 2 | Smart Terminal-Split | Frontend | ~200 | ✅ Fertig |
| 3 | Verbesserungen als Features übernehmen | Frontend | ~350 | ✅ Fertig |

---

## Phase 1: 📋 Dashboard Export (Kopieren & Speichern)

**Was bedeutet das konkret für den User?**
Zwei neue Buttons in der Übersicht-Kopfzeile: "Kopieren" (legt die ganze Übersicht als Markdown in die Zwischenablage) und "Speichern" (speichert sie als .md-Datei im Projekt).

### 🎯 Ziel
Der User kann die generierte Übersicht mit einem Klick exportieren – entweder in die Zwischenablage (Markdown) oder als Datei im Projekt.

### 📁 Betroffene Dateien

#### 1.1 Neue Datei: `dashboard-export-utils.ts` **~120 Zeilen**
- Pfad: `apps/ui/src/components/views/agent-view/components/dashboard-panel/dashboard-export-utils.ts`
- Zweck: Konvertiert `DashboardOverviewData` → formatierter Markdown-String
- Funktion `overviewToMarkdown(data: DashboardOverviewData): string`
  - Baut den vollständigen Markdown-Text: Titel, Zusammenfassung, Stats, Sections, Verbesserungen, Sicherheit, Metadaten
  - Nutzt bestehende Helper (`modeLabel`, `modelLabel`, `formatNumber`) – die werden dafür aus `dashboard-cards.tsx` exportiert
- Funktion `getOverviewFileName(data: DashboardOverviewData): string`
  - Erzeugt Dateiname wie `overview-24h-2026-03-12.md`

#### 1.2 Anpassung: `dashboard-panel.tsx` **~30 Zeilen Änderung**
- Pfad: `apps/ui/src/components/views/agent-view/components/dashboard-panel/dashboard-panel.tsx`
- Zwei neue Buttons in der Kopfzeile (neben Model-Selector):
  - "Kopieren" Button (Copy-Icon) → ruft `overviewToMarkdown()` + `navigator.clipboard.writeText()`
  - "Speichern" Button (Download-Icon) → ruft neuen API-Endpunkt
- Copy-Feedback: Icon wechselt kurz zu Checkmark (2 Sekunden)
- Save-Feedback: Kurze Statusmeldung "Gespeichert!" oder Fehlertext
- Beide Buttons disabled wenn `currentData` null ist (mit Tooltip "Erstelle zuerst eine Übersicht")

#### 1.3 Neue Server-Route: `save.ts` **~60 Zeilen**
- Pfad: `apps/server/src/routes/overview/routes/save.ts`
- `POST /api/overview/save` – Speichert Markdown-Datei
- Body: `{ projectPath: string, markdown: string, fileName: string }`
- Speichert unter `{projectPath}/.automaker/overviews/{fileName}`
- Erstellt den `overviews/` Ordner falls nicht vorhanden
- Response: `{ success: true, filePath: string }`

#### 1.4 Anpassung: `apps/server/src/routes/overview/index.ts` **~5 Zeilen**
- Neuen Route-Handler registrieren: `router.post('/save', createSaveHandler())`

#### 1.5 Anpassung: `apps/ui/src/lib/overview-api.ts` **~20 Zeilen**
- Neue Funktion `saveOverviewAsFile(projectPath, markdown, fileName): Promise<{ filePath: string }>`

### 🔗 Abhängigkeiten
- Nutzt bestehenden `DashboardOverviewData` Typ aus `@automaker/types`
- Nutzt bestehende `apiFetch()` Helper
- Kein neues npm-Paket nötig

### ⚠️ Edge Cases
- Clipboard API erfordert HTTPS oder localhost (haben wir ✅)
- Dateiname muss Windows-kompatibel sein (keine Sonderzeichen) → `getOverviewFileName()` sanitized
- Überschreiben bestehender Dateien: Wenn gleicher Zeitraum + gleiches Datum → überschreiben (gewollt)

---

## Phase 2: 🔀 Smart Terminal-Split

**Was bedeutet das konkret für den User?**
Der Split-Button teilt das Panel immer so auf: Aktueller Tab oben, Terminal unten. Kein verwirrendes Dropdown mehr, keine doppelten Browser-Tabs.

### 🎯 Ziel
Beim Aufteilen wird immer Terminal als zweites Panel geöffnet. Falls Terminal bereits das Hauptpanel ist, wird stattdessen "Dateien" unten geöffnet. Die sekundäre Tab-Leiste bleibt erhalten, damit der User bei Bedarf wechseln kann – aber der Standard ist klar: Terminal unten.

### 📁 Betroffene Dateien

#### 2.1 Anpassung: `app-store.ts` **~15 Zeilen Änderung**
- Pfad: `apps/ui/src/store/app-store.ts`
- `toggleRightPanelSplit()` ändern:
  - Beim Aktivieren: Immer `terminal` als Secondary setzen
  - Ausnahme: Wenn Primary bereits `terminal` ist → `files` als Secondary
  - Logik: `const secondary = primary === 'terminal' ? 'files' : 'terminal'`
- `setRightPanelMode()` erweitern:
  - Wenn Split aktiv und neuer Primary-Mode === Secondary-Mode → Secondary auf nächsten freien Mode umschalten (statt wie aktuell: Split schließen)

#### 2.2 Anpassung: `right-panel-shell.tsx` **~20 Zeilen Änderung**
- Pfad: `apps/ui/src/components/views/agent-view/components/right-panel-shell.tsx`
- `SecondaryTabBar`: Doppelte Modes verhindern
  - Wenn User im Secondary-Bar denselben Mode wie Primary wählt → Primary und Secondary tauschen
- Split-Button Tooltip aktualisieren: "Terminal unten einblenden" / "Terminal ausblenden"

### 🔗 Abhängigkeiten
- Nur Frontend-Änderungen
- Nutzt bestehende Store-Logik, kein neuer State nötig

### ⚠️ Edge Cases
- User hat Split offen mit Terminal unten → wechselt Primary zu Terminal → Secondary muss automatisch auf was anderes wechseln (z.B. Dateien)
- LocalStorage enthält alten Secondary-Mode → beim Laden prüfen ob er != Primary ist
- Schmale Breite (Icon-Only-Mode) → Tooltips korrekt aktualisieren

---

## Phase 3: ✨ Verbesserungen als Features übernehmen

**Was bedeutet das konkret für den User?**
Jede Verbesserung in der Übersicht bekommt einen kleinen Button "Als Feature übernehmen". Ein Klick erstellt daraus eine neue Aufgabe auf dem Kanban-Board.

### 🎯 Ziel
Die KI-generierten Verbesserungsvorschläge aus der Übersicht können direkt in Features umgewandelt werden. So muss der User nichts mehr manuell abtippen oder kopieren.

### 📁 Betroffene Dateien

#### 3.1 Anpassung: `dashboard-details.tsx` **~80 Zeilen Änderung**
- Pfad: `apps/ui/src/components/views/agent-view/components/dashboard-panel/dashboard-details.tsx`
- Jede Improvement-Card bekommt einen "Als Feature" Button (Plus-Icon)
- Button-States:
  - Normal: Plus-Icon + "Als Feature"
  - Erstellt: Checkmark-Icon + "Erstellt" (disabled, grün)
- Lokaler State `createdFeatures: Set<number>` trackt welche Improvements bereits übernommen wurden
- Beim Klick: API-Call zum Feature-Erstellen, dann Index zur Set hinzufügen

#### 3.2 Anpassung: `apps/ui/src/lib/http-api-client.ts` **~15 Zeilen Änderung**
- Neue Funktion nutzen oder bestehende `createFeature()` Funktion finden
- Feature erstellen mit: `title` = Improvement-Titel, `description` = Improvement-Beschreibung, `priority` = Improvement-Priority gemappt

#### 3.3 Anpassung: `@automaker/types` (falls nötig) **~5 Zeilen**
- Prüfen ob `DashboardImprovement` Typ eine `id` braucht für eindeutige Zuordnung
- Falls nicht vorhanden: Index als Fallback nutzen

### 🔗 Abhängigkeiten
- Braucht bestehende Feature-Creation-API (`POST /api/features`)
- Feature-Store muss nach Erstellung aktualisiert werden (Refetch)
- Nutzt bestehende Feature-Typen aus `@automaker/types`

### ⚠️ Edge Cases
- User klickt doppelt schnell → Debounce/disabled während API-Call läuft
- User generiert Übersicht neu → `createdFeatures` Set wird zurückgesetzt (korrekt, weil neue Improvements)
- Priority-Mapping: high → priority 1, medium → priority 2, low → priority 3
- Feature-Titel könnte zu lang sein → truncate auf 100 Zeichen

---

## 🔄 Code-Wiederverwendung

| Bestehend | Wird genutzt in |
|-----------|----------------|
| `DashboardOverviewData` Typ | Phase 1 (Export-Konvertierung) |
| `apiFetch()` Helper | Phase 1 (Save-API), Phase 3 (Feature-API) |
| `modeLabel()`, `modelLabel()` | Phase 1 (Markdown-Export) |
| `PRIORITY_STYLES` Mapping | Phase 3 (Priority-Konvertierung) |
| `toggleRightPanelSplit()` | Phase 2 (Logik-Anpassung) |
| Feature-Creation API | Phase 3 (Verbesserungen übernehmen) |
| `navigator.clipboard.writeText()` | Phase 1 (bereits in file-preview.tsx genutzt) |

---

## 📚 Dokumentation

Nach Abschluss aktualisieren:
- Diese Datei (Phasen als ✅ markieren)
- `History/dashboard-export-smart-split-verlauf.md` (Verlauf)
