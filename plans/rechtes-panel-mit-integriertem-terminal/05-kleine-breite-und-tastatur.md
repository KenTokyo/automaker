ULTRATHINK

# Phase 5: Kleine Breite und Tastatur-Bedienung

## Status

- Status: Fertig
- Abhängigkeit: Phase 2 und Phase 3
- Umgesetzt in: Umsetzungs-Chat 2 (orch-run-mmn4ahvc-errun5, Iteration 3)

## Ziel

Das rechte Panel soll auch bei schmaler Breite gut nutzbar bleiben.
Zusätzlich soll man die wichtigsten Aktionen per Tastatur erreichen.

## Was bedeutet das für den Nutzer?

Du kannst das Panel schmal ziehen und trotzdem Dateien und Terminal sinnvoll nutzen.
Du erreichst die häufigsten Funktionen auch ohne Maus.

## Bereich der Phase

Diese Phase verbessert bestehendes Layout und ergänzt Tastatur-Kürzel.
Keine neuen Features, sondern Feinschliff für schmale Bildschirme und Tastatur-Nutzer.

## Geplante Komponenten und Aufgaben

### 1. `right-panel-shell.tsx` (anpassen, ca. 100 Zeilen Änderung)

- Mindestbreite für das rechte Panel setzen (z. B. 280px).
- Wenn das Panel schmaler als ein Schwellwert ist, schaltet die Tab-Leiste auf reine Icons um.
- Tooltip mit dem vollen Tab-Namen bei Icon-Modus.
- Tab-Leiste bekommt `role="tablist"` und die einzelnen Tabs `role="tab"` mit `aria-selected`.

### 2. `files-panel.tsx` (anpassen, ca. 80 Zeilen Änderung)

- Toolbar-Buttons bei schmaler Breite auf Icons ohne Text reduzieren.
- Sortier- und Filter-Dropdowns bekommen Tooltip-Beschriftungen.
- Datei-Vorschau blendet bei sehr schmaler Breite die Seitenleiste aus.

### 3. `files-panel-terminal-split.tsx` (anpassen, ca. 60 Zeilen Änderung)

- Mindesthöhe für Terminal-Bereich auch bei sehr kleinem Panel einhalten.
- Zieh-Leiste bekommt einen sichtbaren Griff und `aria-label="Trennleiste zwischen Dateien und Terminal"`.
- Tastatur-Bedienung: Pfeiltasten auf der Zieh-Leiste verschieben die Aufteilung schrittweise.

### 4. `use-agent-shortcuts.ts` (anpassen, ca. 60 Zeilen Änderung)

- Neues Kürzel: Ctrl+Shift+T wechselt zum Terminal-Tab im rechten Panel.
- Neues Kürzel: Ctrl+Shift+F wechselt zum Dateien-Tab im rechten Panel.
- Neues Kürzel: Ctrl+Shift+E blendet das eingebettete Terminal im Dateien-Bereich ein oder aus.
- Bestehende Kürzel bleiben unverändert (Ctrl+Shift+B für Browser, Ctrl+Shift+D für Docs).

## Nutzerbeispiele

### Beispiel 1

Du arbeitest auf einem schmalen Bildschirm.
Die Tab-Leiste zeigt nur Icons mit Tooltip.
Die Toolbar-Buttons im Dateien-Bereich sind kompakt.
Alles bleibt bedienbar.

### Beispiel 2

Du drückst Ctrl+Shift+T.
Das rechte Panel wechselt sofort zum Terminal-Tab.
Kein Mausklick nötig.

### Beispiel 3

Du bist im Dateien-Bereich und drückst Ctrl+Shift+E.
Das eingebettete Terminal klappt unten auf.
Nochmal drücken: Terminal klappt wieder zu.

## Edge Cases

1. Panel ist auf Mindestbreite und Nutzer versucht, noch schmaler zu ziehen.
   - Lösung: Panel stoppt bei Mindestbreite, kein Layout-Bruch.
2. Mehrere Kürzel-Kombinationen in schneller Folge.
   - Lösung: Jedes Kürzel wirkt sofort, keine Warteschlange nötig.
3. Fokus liegt im Terminal, Nutzer drückt Ctrl+Shift+F.
   - Lösung: Terminal verliert Fokus, Dateien-Tab wird aktiv. Terminal-Eingabe wird nicht gestört.
4. Barrierefreiheit: Screenreader sollen Tab-Wechsel ankündigen.
   - Lösung: `aria-selected` und `aria-label` auf allen Tabs.

## Performance und Stabilität

- Icon-Modus wird per CSS-Klasse gesteuert, kein Re-Mount der Tabs.
- Kürzel werden zentral in `use-agent-shortcuts.ts` registriert, keine doppelten Listener.
- Keine zusätzlichen API-Calls für die schmale Darstellung.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/right-panel-shell.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-split.tsx`
- `apps/ui/src/components/views/agent-view/hooks/use-agent-shortcuts.ts`

## Abnahme-Check

- [ ] Tab-Leiste wechselt bei schmaler Breite auf Icon-Modus.
- [ ] Tooltips sind bei Icon-Modus sichtbar.
- [ ] Ctrl+Shift+T wechselt zum Terminal-Tab.
- [ ] Ctrl+Shift+F wechselt zum Dateien-Tab.
- [ ] Ctrl+Shift+E blendet eingebettetes Terminal ein/aus.
- [ ] Zieh-Leiste ist per Tastatur bedienbar.
- [ ] Aria-Attribute sind auf Tabs und Trennleiste gesetzt.
- [ ] `npm run type-check` ist ohne Fehler.
