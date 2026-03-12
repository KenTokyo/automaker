ULTRATHINK

# Phase 2: Terminal im Dateien-Bereich

## Status

- Status: Fertig
- Abhängigkeit: Phase 1 muss stehen
- Umsetzung geplant in: Umsetzungs-Chat 1

## Ziel

Im Dateien-Bereich gibt es unten ein einblendbares Terminal.
Das Terminal nimmt standardmäßig ungefähr ein Drittel der Höhe.

## Was bedeutet das für den Nutzer?

Du kannst Datei lesen und direkt darunter Befehle starten.
Du musst nicht ständig zwischen "Dateien" und "Terminal" wechseln.

## Bereich der Phase

Diese Phase baut nur die sichtbare Einbettung im Dateien-Bereich.
Noch kein Merken der Größe über Neustarts hinweg (kommt in Phase 3).

## Geplante Komponenten und Aufgaben

### 1. `files-panel-terminal-toggle.tsx` (neu, ca. 120 Zeilen)

- Ein klarer Ein/Aus-Schalter in der Toolbar vom Dateien-Bereich.
- Beschriftung in einfacher Sprache, z. B. "Terminal unten anzeigen".
- Sichtbarer Fokus für Tastatur-Bedienung.

### 2. `files-panel-terminal-split.tsx` (neu, ca. 220 Zeilen)

- Kapselt die vertikale Aufteilung: oben Dateien, unten Terminal.
- Startgröße etwa 65% Dateien, 35% Terminal.
- Zieh-Leiste mit Mindesthöhen, damit nichts unbenutzbar klein wird.

### 3. `files-panel-terminal-embed.tsx` (neu, ca. 140 Zeilen)

- Ein schlanker Wrapper für das bestehende Terminal.
- Nutzt Lazy Loading, damit der Dateien-Bereich schnell öffnet.
- Leitet den Projektpfad als Startordner weiter.

### 4. `files-panel.tsx` (anpassen, ca. 180 Zeilen Änderung)

- Toolbar um Toggle ergänzen.
- Hauptlayout auf Split-Ansicht erweitern.
- Bestehende Datei-Funktionen unverändert lassen.

## Nutzerbeispiele

### Beispiel 1

Du öffnest den Dateien-Bereich, klickst auf "Terminal unten anzeigen" und startest `npm run type-check`, während du eine Datei offen hast.

### Beispiel 2

Du brauchst das Terminal gerade nicht und blendest es aus.
Dann hat die Dateiansicht wieder volle Höhe.

## Edge Cases

1. Sehr schmale oder niedrige Panel-Größe.
   - Lösung: Mindesthöhe für beide Bereiche.
2. Projektpfad fehlt kurzzeitig.
   - Lösung: Terminal zeigt freundlichen Hinweis statt leerem Fehler.
3. Terminal braucht etwas beim Laden.
   - Lösung: kleine Ladeanzeige im unteren Bereich.
4. Nutzer öffnet/schließt schnell mehrfach.
   - Lösung: robustes State-Handling ohne Flackern.

## Performance und Stabilität

- Terminal nur laden, wenn es wirklich sichtbar ist.
- Datei-Baum und Vorschau dürfen beim Umschalten nicht neu geladen werden.
- Keine zusätzlichen API-Calls für den Datei-Teil.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-toggle.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-split.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-embed.tsx` (neu)

## Abnahme-Check

- [x] Toggle ist sichtbar und verständlich.
- [x] Terminal lässt sich unten ein- und ausblenden.
- [x] Split ist per Ziehen verstellbar.
- [x] Dateien-Bereich bleibt stabil nutzbar.
- [x] `npm run type-check` ist ohne Fehler.
