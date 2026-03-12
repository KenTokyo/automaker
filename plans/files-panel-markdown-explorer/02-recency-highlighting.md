ULTRATHINK

# Phase 2: Recency-Highlighting & Date-Display

## Status: ✅ Abgeschlossen

## Abhaengigkeit: Phase 1 muss abgeschlossen sein (Timestamps im Store vorhanden)

## 🎯 Ziel

Dateien und Ordner werden **farblich hervorgehoben** je nachdem, wie kuerzlich sie geaendert wurden. Jede Datei zeigt **Erstellungsdatum und Aenderungsdatum** mit Icons an. Das Datumformat ist **smart** - heute nur Uhrzeit, gestern "Gestern HH:MM", aeltere Dateien mit vollem Datum.

### Was bedeutet das konkret fuer den Nutzer?

Der Nutzer sieht auf einen Blick, welche Dateien gerade eben geaendert wurden (rot leuchtend), welche vor einer Stunde (gelb), und welche schon laenger nicht angefasst wurden (kein Highlight). Ordner, die kuerzlich geaenderte Kinder haben, leuchten ebenfalls auf. Das spart enorm Zeit beim Navigieren.

---

## 🚀 Strategie

### Recency-Klassen-System (aus VSCode Extension uebernommen)

Das System teilt Dateien in 5 Recency-Stufen ein, basierend auf dem Alter der letzten Aenderung:

| Klasse | Zeitfenster | Farbe | Intensitaet |
| --- | --- | --- | --- |
| `recency-10m` | ≤ 10 Minuten | Orange-Rot (#ff6b35) | Stark - Border + Background + farbige Daten |
| `recency-30m` | ≤ 30 Minuten | Gold (#e8a317) | Mittelstark - Border + Background + farbiges Modified-Datum |
| `recency-1h` | ≤ 1 Stunde | Gelbgruen (#c4a72a) | Mittel - Duenner Border + leichter Background |
| `recency-2h` | ≤ 2 Stunden | Gruenlich (#8a9a3a) | Subtil - Nur leichter Background |
| `recency-6h` | ≤ 6 Stunden | Blau (focusBorder) | Minimal - Nur duenner Border |

### Highlight-Window

Das Highlight-Window bestimmt, **bis zu welchem Alter** Dateien ueberhaupt hervorgehoben werden. Ist auf 6h eingestellt (Standard), werden Dateien aelter als 6h gar nicht markiert. Das Window ist konfigurierbar via Dropdown (kommt in Phase 3).

### Smart-Date-Formatting

| Alter | Anzeige |
| --- | --- |
| Heute | `14:35` (nur Uhrzeit) |
| Gestern | `Gestern 14:35` |
| Innerhalb 7 Tage | `Mo 14:35` (Wochentag) |
| Aelter | `11.03.2026 14:35` (volles Datum) |

---

## ❓ Proaktive F&A

**Was passiert, wenn der Nutzer das Highlight-Window auf "Kein Highlight" stellt?**
✅ `getMdRecencyClass()` gibt immer einen leeren String zurueck. Keine Farben, keine Borders. Alles sieht gleich aus.

**Was passiert bei Ordnern, die sowohl sehr neue als auch alte Dateien haben?**
✅ Der Ordner erbt die **staerkste** Recency seines gesamten Unterbaums. Hat ein Ordner eine Datei von vor 5 Minuten, wird der ganze Ordner `recency-10m` markiert.

**Wie verhaelt sich Recency beim Re-render?**
✅ Recency wird bei jedem Render neu berechnet (basierend auf `Date.now()`). Da die Berechnung O(n) und rein im RAM ist (kein API-Call), ist das performant. Bei sehr grossen Baeumen (>1000 Dateien) koennte ein `useMemo` mit 60s Intervall sinnvoll sein.

**Was passiert mit Dark/Light Theme?**
✅ Die Farben funktionieren auf dunklem Hintergrund. Fuer Light-Theme muessten die Opacity-Werte ggf. angepasst werden. Da Automaker aktuell nur Dark-Theme nutzt, ist das kein Blocker.

---

## ⚡ Regeleinhaltung & Performance

- **Wiederverwendung:** `getMdRecencyClass()` und `getFolderRecencyClass()` Logik 1:1 aus VSCode Extension uebernommen
- **Performance:** Recency-Berechnung ist O(1) pro Datei, O(n) fuer Folder-Walk
- **CSS:** Tailwind-kompatible Klassen mit `color-mix()` fuer semi-transparente Farben
- **Keine neuen Netzwerk-Calls:** Alles basiert auf den Timestamps aus Phase 1

---

## 🔄 Code-Wiederverwendung

### Aus VSCode Extension uebernommen

- `getMdRecencyClass(timestamp)` → `getRecencyClass(timestamp, highlightWindow)` - Berechnet Recency-Klasse
- `getFolderRecencyClass(folder)` → `getFolderRecency(node)` - Erbt staerkste Kind-Recency
- `formatMdDate(timestamp)` → `formatSmartDate(timestamp)` - Smart-Date-Formatting
- Recency CSS-Klassen (5 Stufen) → Tailwind-kompatible Klassen

### Bestehend

- `FileTreeItem` Komponente wird erweitert (nicht neu erstellt)
- `explorer-store.ts` bekommt `highlightWindow` State-Feld

---

## 🧩 Komponenten & Implementierung

### 2.1 Utility: `recency-utils.ts` erstellen (NEUE DATEI) **~80 Zeilen**

Pfad: `apps/ui/src/components/views/agent-view/components/files-panel/recency-utils.ts`

- `getRecencyClass(timestamp, highlightWindowHours)`: Gibt CSS-Klasse zurueck basierend auf Alter
  - ≤10min → 'recency-10m'
  - ≤30min → 'recency-30m'
  - ≤1h → 'recency-1h'
  - ≤2h → 'recency-2h'
  - ≤highlight window → 'recency-6h'
  - sonst → '' (kein Highlight)
- `getFolderRecency(node, highlightWindowHours)`: Rekursiv staerkste Recency der Kinder ermitteln
  - Ranking: 10m > 30m > 1h > 2h > 6h > none
  - Nutzt `Math.max(modified, created)` pro Datei
- `formatSmartDate(timestamp)`: Smart-Date-Formatting
  - Heute: nur "HH:MM"
  - Gestern: "Gestern HH:MM"
  - Innerhalb 7 Tage: "Mo HH:MM" / "Di HH:MM" etc.
  - Aelter: "DD.MM.YYYY HH:MM"
- Typ-Export: `RecencyClass = '' | 'recency-10m' | 'recency-30m' | 'recency-1h' | 'recency-2h' | 'recency-6h'`

### 2.2 FileTreeItem: `file-tree-item.tsx` erweitern **~80 Zeilen Aenderung**

- **Datums-Anzeige:** Unter dem Dateinamen zwei Zeilen:
  - Erstellt-Datum: Kalender-Icon + `formatSmartDate(node.created)`
  - Geaendert-Datum: Stift-Icon + `formatSmartDate(node.modified)`
- **Recency-Klasse:** Wrapper-`<button>` bekommt die Recency-Klasse als CSS-Klasse
  - `getRecencyClass(Math.max(node.modified, node.created), highlightWindow)`
- **Recency-Farben auf Datum:** Bei `recency-10m` wird Modified-Datum fett+orange
- **Layout-Anpassung:** file-info als flex-column (Name oben, Dates unten)
- Ordner: Zeigt keine Datums-Zeilen, aber bekommt Recency-Klasse vom Folder-Walk

### 2.3 CSS: Recency-Klassen definieren **~100 Zeilen**

Entweder als Tailwind-Plugin oder als CSS-in-JS innerhalb der Komponenten. Empfehlung: Eigene CSS-Datei oder Inline-Styles mit `cn()`.

5 Stufen fuer Dateien:
- `recency-10m`: `border-left: 3px solid #ff6b35`, Background-Gradient orange 12%→4%, Modified-Date orange+bold
- `recency-30m`: `border-left: 3px solid #e8a317`, Background-Gradient gold 10%→3%, Modified-Date gold+semibold
- `recency-1h`: `border-left: 2px solid #c4a72a/70%`, Background-Gradient gelbgruen 7%→2%, Modified-Date gelbgruen
- `recency-2h`: `border-left: 2px solid #8a9a3a/40%`, Background gruen 5%
- `recency-6h`: `border-left: 2px solid focusBorder/25%` (nur Border, kein Background)

5 Stufen fuer Ordner:
- `recency-10m`: Background-Gradient orange 8%, Ordner-Badge orange
- `recency-30m`: Background-Gradient gold 6%, Ordner-Badge gold
- `recency-1h`: Background-Gradient gelbgruen 4%
- `recency-2h`: Ordner-Badge leicht gruen
- `recency-6h`: kein visueller Unterschied

### 2.4 Store: `explorer-store.ts` erweitern **~15 Zeilen**

- Neues State-Feld: `highlightWindow: number` (Standard: 6, in Stunden)
- Neue Action: `setHighlightWindow(hours: number)`
- Persistenz: `localStorage` wie bei `timeFilter`

### 2.5 FileTree: `file-tree.tsx` erweitern **~15 Zeilen**

- `highlightWindow` aus dem Store lesen
- An `TreeNodeList` und weiter an `FileTreeItem` durchreichen
- Ordner-Items bekommen `getFolderRecency(node, highlightWindow)` als Klasse

---

## 📋 Chat-Implementierungs-Reihenfolge

### Chat 3 - Phase 2 Implementierung (~80.000-100.000 Tokens)

**Schritt 1:** Utility erstellen (2.1)
- `recency-utils.ts` mit `getRecencyClass`, `getFolderRecency`, `formatSmartDate`
- TypeScript-Check

**Schritt 2:** Store erweitern (2.4)
- `highlightWindow` Feld und Action
- TypeScript-Check

**Schritt 3:** FileTreeItem umbauen (2.2)
- Datums-Anzeige mit Icons hinzufuegen
- Recency-Klasse auf Wrapper setzen
- TypeScript-Check

**Schritt 4:** FileTree anpassen (2.5)
- `highlightWindow` durchreichen
- Folder-Recency berechnen
- TypeScript-Check

**Schritt 5:** CSS/Styling (2.3)
- Recency-Klassen als Inline-Styles oder Tailwind-Klassen
- Visueller Check: Farben korrekt auf Dark-Theme

**Abschluss:** Gesamt-TypeScript-Check

---

## 🔗 Betroffene Dateien

| Datei | Aenderungstyp | Geschaetzte Zeilen |
| --- | --- | --- |
| `apps/ui/src/.../files-panel/recency-utils.ts` | **NEU** | ~80 |
| `apps/ui/src/.../files-panel/file-tree-item.tsx` | Erweitern | ~80 |
| `apps/ui/src/.../files-panel/file-tree.tsx` | Erweitern | ~15 |
| `apps/ui/src/store/explorer-store.ts` | Erweitern | ~15 |
| **Gesamt** | | **~190** |

---

## 🧪 Validierung nach Abschluss

- [ ] `cd apps/ui && npx tsc --noEmit` → 0 Fehler
- [ ] Dateien zeigen Created + Modified Datum mit Icons
- [ ] Kuerzlich geaenderte Dateien haben farbigen Border + Background
- [ ] Ordner erben Recency vom neuesten Kind
- [ ] Smart-Date zeigt "14:35" fuer heute, "Gestern 14:35" fuer gestern
- [ ] Ohne Highlight-Window: Keine Farben sichtbar
- [ ] `recency-10m` Dateien sind am auffaelligsten (orange/rot)
