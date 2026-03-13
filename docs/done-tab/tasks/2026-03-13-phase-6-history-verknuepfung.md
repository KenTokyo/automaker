# 🔗 Phase 6: History-Verknüpfung

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)
**Voraussetzung:** Phase 4 (Task-Karten) muss abgeschlossen sein

---

## 🎯 Was soll diese Phase leisten?

Erledigte Aufgaben werden mit ihren zugehörigen History-Dateien verknüpft. Wenn eine Karte im Fertig-Tab eine History-Datei hat, kann der User draufklicken und die Datei wird angezeigt. Außerdem wird der History-Ordner gescannt, um bestehende History-Dateien als Vorschläge anzubieten.

**Was bedeutet das für den User?** Jede Karte hat einen "History öffnen"-Link. Klickt man drauf, sieht man die komplette Verlaufsdokumentation – wann was passiert ist, welche Entscheidungen getroffen wurden, usw.

---

## 🚀 Strategie

Drei Teile:

1. **History-Ordner scannen** – Server-Endpunkt, der den `History/`-Ordner liest und verfügbare Dateien zurückgibt
2. **Verlinkung in Karten** – Die Task-Karte zeigt einen klickbaren Link zur History-Datei
3. **Datei anzeigen** – Bei Klick wird die History-Datei in einem Panel oder Modal angezeigt (Markdown-gerendert)

### Abhängigkeiten

- Phase 4 (Task-Karten müssen existieren, damit der Link eingebaut werden kann)
- History-Ordner im Projekt-Root (`History/`)
- Markdown-Rendering (bestehend oder neue leichte Bibliothek)
- File-System-Zugriff über bestehende Server-Patterns

---

## ❓ Wichtige Fragen & Antworten

**Wo liegen die History-Dateien?**
✅ Im `History/`-Ordner im Projekt-Root. Dateinamen folgen dem Pattern `{name}-history.md` oder `{name}-verlauf.md`. Es sind Markdown-Dateien.

**Wie wird die Verknüpfung hergestellt?**
✅ Auf zwei Wegen:

1. **Manuell:** Der User (oder Agent) gibt beim Erstellen einer Aufgabe das `historyFile`-Feld an (relativer Pfad)
2. **Automatisch:** Wenn der Agent die Aufgabe erstellt (über den Systemprompt-Schalter aus Phase 5), kann er die passende History-Datei angeben

**Was wenn die History-Datei nicht mehr existiert?**
✅ Der Link wird ausgegraut angezeigt mit einem Tooltip "Datei nicht gefunden". Kein Fehler.

**Wie wird die Datei angezeigt?**
✅ In einem Slide-Over-Panel (von rechts reinfahrendes Panel), das den Markdown-Inhalt gerendert anzeigt. Alternativ: In einem Dialog/Modal. Wir nutzen das gleiche Pattern wie die bestehende Datei-Vorschau.

**Kann man die History-Datei bearbeiten?**
✅ Nein, nur lesen. Zum Bearbeiten soll der User die Datei im Editor öffnen. Dafür gibt es einen "Im Editor öffnen"-Button.

---

## 📱 Beispiel: So sieht es aus

```
🖥️ Karte mit History-Link:

┌─────────────────────────────────────┐
│ 🚀 Dark Mode für Dashboard         │
│ ┌─────────┐ ┌──────────┐           │
│ │ Feature │ │ Frontend │           │
│ └─────────┘ └──────────┘           │
│ Dunkles Farbschema implementiert    │
│ 📅 vor 2 Stunden                    │
│ ─────────────────────────────────── │
│ 📄 History/dark-mode-verlauf.md  →  │  ← Klickbar!
└─────────────────────────────────────┘

Klick auf History-Link öffnet Slide-Over:

┌──────────┬──────────────────────────┐
│ Fertig-  │ 📄 dark-mode-verlauf.md  │
│ Tab      │ [✕ Schließen] [📝 Editor]│
│          │ ─────────────────────── │
│ (Karten) │ # Dark Mode Verlauf     │
│          │                          │
│          │ ## Chat 1 – Planung      │
│          │ - Farben definiert       │
│          │ - Komponenten identif.   │
│          │                          │
│          │ ## Chat 2 – Umsetzung    │
│          │ - CSS-Variablen angelegt │
│          │ - Toggle implementiert   │
│          │ ...                      │
└──────────┴──────────────────────────┘
```

---

## 🧩 Komponenten & Dateien

### 6.1 Server-Route: History-Dateien auflisten **~80 Zeilen**

#### `apps/server/src/routes/completed-tasks/history.ts`

Neuer Endpunkt:

```
GET /api/completed-tasks/history-files?projectPath=/mein/projekt
→ { files: ["History/dark-mode-verlauf.md", "History/login-fix-history.md", ...] }
```

- Scannt den `History/`-Ordner im Projekt-Root
- Gibt nur `.md`-Dateien zurück
- Sortiert nach Änderungsdatum (neueste zuerst)
- Falls `History/` nicht existiert → leeres Array, kein Fehler

#### `GET /api/completed-tasks/history-file?projectPath=...&file=History/dark-mode.md`

Liest den Inhalt einer einzelnen History-Datei:

```
→ { content: "# Dark Mode Verlauf\n\n## Chat 1...", fileName: "dark-mode-verlauf.md" }
```

- Pfad-Validierung: Datei muss unter `History/` liegen (Sicherheit!)
- Datei nicht gefunden → 404
- Nur `.md`-Dateien erlaubt

### 6.2 History-Link in Karte: `completed-task-card.tsx` **~30 Zeilen Änderung**

Die bestehende Karte aus Phase 4 wird erweitert:

- **Neuer Bereich am Kartenende** (nur wenn `task.historyFile` gesetzt):
  ```
  ┌─ Trennlinie (border-t border-muted mt-2 pt-2) ─┐
  │ 📄 History/dateiname.md                    →    │
  └─────────────────────────────────────────────────┘
  ```
- Styling: `flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer`
- Icon: `FileText` (w-3 h-3) von Lucide
- Pfad: Nur Dateiname anzeigen, vollen Pfad als Tooltip
- Klick → `onHistoryClick(task.historyFile)` Callback auslösen
- Nicht gefunden: `text-muted-foreground/50` + durchgestrichen + Tooltip "Datei nicht gefunden"

### 6.3 History-Viewer-Panel: `apps/ui/src/components/session-manager/history-viewer-panel.tsx` **~150 Zeilen**

Slide-Over-Panel zum Anzeigen von History-Dateien:

- **Overlay:** `fixed inset-0 bg-black/20 z-40` (klick schließt)
- **Panel:** `fixed right-0 top-0 h-full w-[480px] bg-background border-l border-border shadow-xl z-50`
  - Slide-In Animation: `transition-transform duration-200`
- **Header:** `flex items-center justify-between p-3 border-b border-border`
  - Dateiname (font-medium text-sm)
  - Buttons: "Im Editor öffnen" (optional) + "Schließen" (X-Icon)
- **Content:** `flex-1 overflow-y-auto p-4`
  - Markdown gerendert als HTML
  - Styling: `prose prose-sm dark:prose-invert` (Tailwind Typography Plugin)
  - Falls kein Typography-Plugin: Eigene Basis-Styles für h1-h3, p, ul, ol, code
- **Ladezustand:** Skeleton-Loader während Datei geladen wird
- **Fehlerzustand:** "Datei konnte nicht geladen werden" + Schließen-Button

**Props:**

```typescript
interface HistoryViewerPanelProps {
  filePath: string | null; // null = geschlossen
  projectPath: string;
  onClose: () => void;
}
```

### 6.4 API-Hook: `apps/ui/src/hooks/use-history-files.ts` **~80 Zeilen**

- `useHistoryFiles(projectPath)` – Lädt die Liste verfügbarer History-Dateien
  - Wird gebraucht für Auto-Complete / Vorschläge beim Erstellen von Aufgaben
  - Caching mit `staleTime` (5 Minuten)
- `useHistoryFileContent(projectPath, filePath)` – Lädt den Inhalt einer Datei
  - Nur laden wenn `filePath` nicht null
  - Caching pro Datei

### 6.5 Panel-Integration: `completed-tasks-panel.tsx` **~20 Zeilen Änderung**

- State für geöffnete History-Datei: `const [historyFile, setHistoryFile] = useState<string | null>(null)`
- `onHistoryClick` Callback an Karten weitergeben
- `HistoryViewerPanel` am Ende rendern (nur wenn `historyFile !== null`)

### 6.6 Visueller Feinschliff **~30 Zeilen insgesamt**

Letzte Verbesserungen am Fertig-Tab:

- **Karten-Animationen:** Sanftes Ein-/Ausblenden bei Filter-Änderungen (`transition-all duration-150`)
- **Hover-Effekte:** Karte hebt sich leicht an bei Hover (`hover:shadow-sm hover:border-muted-foreground/20`)
- **Statistik-Zeile im Footer:** "12 Aufgaben · 5 Features · 3 Bugfixes"
- **Tastatur-Navigation:** Enter/Space auf Karte → Details aufklappen, Tab für Navigation

---

## ⚡ Edge Cases

| Was könnte passieren?                       | Lösung                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| History-Ordner existiert nicht              | API gibt leeres Array zurück, kein Fehler                                        |
| History-Datei wurde gelöscht/umbenannt      | Link wird ausgegraut, Tooltip erklärt es                                         |
| History-Datei ist sehr groß (>1MB)          | Server begrenzt auf 500KB, zeigt Hinweis "Datei zu groß, bitte im Editor öffnen" |
| Pfad enthält `../` (Path-Traversal-Angriff) | Server validiert: Datei muss unter `History/` im Projektordner liegen            |
| Markdown enthält gefährliches HTML          | Markdown-Renderer sanitized HTML (kein raw HTML erlaubt)                         |
| Schneller Wechsel zwischen History-Dateien  | Vorherige Anfrage abbrechen (AbortController)                                    |
| Panel ist offen, Tab wird gewechselt        | Panel schließt automatisch                                                       |
| Kein Markdown-Rendering-Plugin installiert  | Fallback: Rohtext in `<pre>` anzeigen, Hinweis auf fehlende Bibliothek           |

---

## 🔄 Wiederverwendung

- **Slide-Over-Pattern:** Ähnlich wie bestehende Panel-Patterns im Projekt (rechtes Panel in Agent-View)
- **Markdown-Rendering:** Falls `react-markdown` oder ähnliches bereits als Dependency existiert → nutzen; sonst mit einfachem Regex-Renderer oder `marked` (leichtgewichtig)
- **File-API-Pattern:** Ähnlich wie Feature-Loader (Dateien im Projekt lesen)
- **Pfad-Validierung:** Nutzt bestehende `validatePathParams` aus Server-Routes
- **AbortController-Pattern:** Wie in `FileSearch` für abbrechbare Anfragen

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 8 – Phase 6 implementieren (~40.000 Tokens)

**Schritt 1:** Server-Route für History-Dateien

- `history.ts`: Endpunkte für Dateiliste und Dateiinhalt
- Router-Registrierung in `completed-tasks/index.ts`
- Pfad-Validierung (Sicherheit!)

**Schritt 2:** API-Hook erstellen

- `use-history-files.ts`: Hooks für Dateiliste und Dateiinhalt
- Caching und AbortController

**Schritt 3:** History-Viewer-Panel erstellen

- `history-viewer-panel.tsx`: Slide-Over mit Markdown-Rendering
- Lade-, Fehler- und Leerzustand

**Schritt 4:** Karten erweitern

- `completed-task-card.tsx`: History-Link am Kartenende einbauen
- Prüfung ob Datei existiert (ausgegraut wenn nicht)

**Schritt 5:** Panel-Integration

- `completed-tasks-panel.tsx`: State für History-Viewer, Callbacks

**Schritt 6:** Visueller Feinschliff

- Animationen, Hover-Effekte, Statistik-Footer
- Tastatur-Zugänglichkeit

**Schritt 7:** TypeScript-Check

- `npx tsc --noEmit` über Server und UI

---

**Vorherige Phase:** [Phase 5 – Systemprompt-Schalter](./2026-03-13-phase-5-systemprompt-schalter.md)
**Fertig!** Alle 6 Phasen sind geplant. 🎉
