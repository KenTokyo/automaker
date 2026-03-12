ULTRATHINK

# Phase 2: Auf- und Zuklappen mit Animation

## Status

- Status: 📝 Geplant
- Abhängigkeit: Phase 1 sollte fertig sein
- Umsetzung geplant in: Chat 3

## Ziel

Der bisherige `Collapse` Button wird zu einer klaren Umschaltung mit 2 Zuständen:

1. `Alles zuklappen`
2. `Alles aufklappen`

Dazu kommt eine ruhige Animation am Button-Symbol, damit man den Zustand sofort erkennt.

### Was bedeutet das für den Nutzer?

Der Nutzer kann den Baum schnell aufräumen und ebenso schnell wieder komplett öffnen.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-collapse-toggle.tsx` (neu, ca. 130 Zeilen)

- Eigener Button mit klaren Texten für beide Zustände.
- Wechselt Icon und Tooltip passend zum Zustand.
- Enthält kleine Übergangsanimation (drehen oder sanftes Umklappen).

### 2. `explorer-store.ts` (anpassen, ca. 110 Zeilen Änderung)

- Neuer Zustand für globale Baumansicht, z. B. `allCollapsed`.
- Zwei klare Aktionen:
  - `collapseAllNodes()`
  - `expandAllNodes()`
- Sicherstellen, dass man beim Projektwechsel keinen alten Zustand mitschleppt.

### 3. `file-tree.tsx` (anpassen, ca. 90 Zeilen Änderung)

- Reagiert sauber auf den globalen Auf/Zu-Befehl.
- Achtet darauf, dass manuelle Klicks danach weiter normal funktionieren.

### 4. `files-panel.tsx` (anpassen, ca. 80 Zeilen Änderung)

- Alten Collapse-Button entfernen.
- Neuen Toggle-Button in die Toolbar setzen.
- Beschriftung und Reihenfolge im Toolbar-Layout sauber halten.

## Nutzerbeispiele

### Beispiel 1

Du hast viele offene Ordner.
Ein Klick auf `Alles zuklappen` macht die Liste sofort kurz und übersichtlich.

### Beispiel 2

Du willst wieder alle Ebenen sehen.
Ein Klick auf `Alles aufklappen` zeigt dir den vollen Baum.

## Edge Cases

1. Es gibt nur eine Ebene ohne Unterordner.
   - Lösung: Button bleibt aktiv, aber ohne harte Sprünge im Layout.
2. Sehr große Baumstruktur.
   - Lösung: Zustand in einem Schritt setzen, keine langsame Schleife pro Klick.
3. Während Daten neu geladen werden wird geklickt.
   - Lösung: Kurze Sperre während Reload, mit Hinweistext.
4. Nutzer klappt manuell einzelne Ordner auf.
   - Lösung: Nach globalem Klick bleibt manuelle Steuerung weiterhin möglich.

## Performance und Stabilität

- Zustand einmal im Store setzen statt viele Einzel-Updates.
- Animation nur am Button-Icon, nicht auf jedem Baumknoten.
- Keine zusätzlichen Server-Calls.

## Betroffene Dateien

- `apps/ui/src/store/explorer-store.ts`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/file-tree.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-collapse-toggle.tsx` (neu)

## Abnahme-Check

- [ ] Button hat klar 2 Zustände mit gut lesbaren Texten.
- [ ] Icon-Animation ist ruhig und nicht hektisch.
- [ ] Baum lässt sich komplett schließen und öffnen.
- [ ] Keine Hänger bei großen Strukturen.
- [ ] `npm run type-check` ist ohne Fehler.