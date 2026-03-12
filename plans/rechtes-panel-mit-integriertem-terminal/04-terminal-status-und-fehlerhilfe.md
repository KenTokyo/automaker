ULTRATHINK

# Phase 4: Status und Fehlerhilfe im eingeblendeten Terminal

## Status

- Status: Fertig
- Abhängigkeit: Phase 2 und Phase 3
- Umgesetzt in: Umsetzungs-Chat 2 (orch-run-mmn4ahvc-errun5, Iteration 3)

## Ziel

Wenn das Terminal unten eingeblendet ist, sollen alle typischen Situationen klar erklärt werden:
aktiv, lädt, gesperrt, aus, oder Verbindung fehlgeschlagen.

## Was bedeutet das für den Nutzer?

Du weißt immer sofort, was los ist und was du als Nächstes klicken sollst.

## Bereich der Phase

Diese Phase verbessert Rückmeldungen und Hilfetexte.
Keine neuen Terminal-Features.

## Geplante Komponenten und Aufgaben

### 1. `files-panel-terminal-status.tsx` (neu, ca. 140 Zeilen)

- Einheitliche Statuskarten für die häufigsten Fälle.
- Klare Texte ohne Fachsprache.
- Optionaler Knopf "Im großen Terminal öffnen".

### 2. `files-panel-terminal-embed.tsx` (anpassen, ca. 120 Zeilen Änderung)

- Liefert Statusinformationen an die Status-Komponente.
- Zeigt Ladezustand kurz und ruhig ohne Flackern.

### 3. `files-panel-terminal-actions.tsx` (neu, ca. 110 Zeilen)

- Kleine Aktionsleiste: Neu laden, im Tab öffnen.
- Buttons haben klare Deaktiviert-Hinweise.

### 4. `files-panel.tsx` (anpassen, ca. 90 Zeilen Änderung)

- Bindet Status-Komponente und Aktionen sauber ein.
- Hält die Hauptdatei trotzdem gut lesbar.

## Nutzerbeispiele

### Beispiel 1

Der Server ist kurz nicht erreichbar.
Du siehst unten eine klare Meldung und einen Knopf "Neu verbinden".

### Beispiel 2

Terminal ist passwortgeschützt.
Du bekommst einen verständlichen Hinweis und kannst direkt in den großen Terminal-Tab wechseln.

## Edge Cases

1. Verbindungsfehler während ein Befehl läuft.
   - Lösung: Keine harten Abstürze, stattdessen klare Meldung.
2. Terminal ist auf Server-Seite deaktiviert.
   - Lösung: Freundlicher Hinweis mit kurzer Erklärung.
3. Passwort nötig, aber noch nicht entsperrt.
   - Lösung: Keine leere Fläche, sondern klare Anleitung.
4. Sehr wenig Platz unten.
   - Lösung: kompakte Statusdarstellung, kein Layout-Bruch.

## Performance und Stabilität

- Statuswechsel ohne unnötige Voll-Reloads.
- Keine doppelte Polling-Logik im Dateien-Bereich.
- Bestehende Terminal-Logik bleibt zentral in `TerminalView`.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-embed.tsx`
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-status.tsx` (neu)
- `apps/ui/src/components/views/agent-view/components/files-panel/files-panel-terminal-actions.tsx` (neu)

## Abnahme-Check

- [ ] Statusmeldungen sind klar und kurz.
- [ ] Deaktivierte Knöpfe haben verständliche Hinweise.
- [ ] Bei Fehlern gibt es immer eine nächste Aktion.
- [ ] Dateien-Bereich bleibt benutzbar.
- [ ] `npm run type-check` ist ohne Fehler.
