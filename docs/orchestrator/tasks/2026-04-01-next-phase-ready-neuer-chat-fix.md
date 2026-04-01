# Orchestrator Bugfix: `NEXT_PHASE_READY` erzeugt nicht immer den richtigen neuen Chat

> Status: ✅ Abgeschlossen
> Erstellt: 2026-04-01
> Typ: Bugfix (UI / Orchestrator)

## Problem in 1 Satz

Bei `NEXT_PHASE_READY` wurde zwar teils ein neuer Chat erzeugt, aber der Auto-Send landete in manchen Fällen im falschen (alten) Chat.

## Auswirkung für User in 1 Satz

Der Orchestrator-Fluss springt durcheinander, und man muss manuell eingreifen, obwohl der Ablauf automatisch weiterlaufen sollte.

## Lösungsweg in 1 Satz

Wir binden den Auto-Send strikt an die tatsächlich erzeugte Ziel-Session-ID und schränken den globalen Completion-Trigger auf den aktiven Orchestrator-Run ein.

## Phasenplan

### Phase 1 - Quick-Create Ergebnis härten

Ziel:

- Session-Erstellung liefert nicht nur Erfolg/Fehler, sondern auch die konkrete Session-ID zurück.

Risiko:

- Mehrere Call-Sites erwarten bisher nur `boolean`.

Test:

- TypeScript-Check und Durchlauf aller betroffenen Call-Sites.

Sichtbarer Nutzen:

- Folge-Logik kann eindeutig auf den richtigen Ziel-Chat zeigen.

Status:

- ✅ Abgeschlossen

### Phase 2 - Orchestrator auf Ziel-Session fixieren

Ziel:

- Auto-Send startet nur, wenn wirklich die erzeugte Ziel-Session aktiv ist.

Risiko:

- Zu strikte Guards könnten Auto-Send verzögern.

Test:

- Kontrollierte Guard-Logik + bestehender Trigger bleibt intakt.

Sichtbarer Nutzen:

- Keine versehentliche Nachricht mehr im falschen Chat.

Status:

- ✅ Abgeschlossen

### Phase 3 - Globalen Trigger auf Run-Kontext begrenzen

Ziel:

- Background-Trigger reagiert nur noch auf Sessions des relevanten Orchestrator-Runs statt auf alle Sessions im Projekt.

Risiko:

- Zu enge Filterung könnte legitime Trigger blockieren.

Test:

- Filter mit aktivem Session-Fallback und Run-ID-Abgleich.

Sichtbarer Nutzen:

- Weniger Cross-Chat-Regressionen.

Status:

- ✅ Abgeschlossen

### Phase 4 - Abschluss, Verlauf, Completed-Doku

Ziel:

- `History/` und `.completed/` sauber aktualisieren.

Risiko:

- Keins, rein dokumentarisch.

Test:

- Dateipfade und Inhalte prüfen.

Sichtbarer Nutzen:

- Transparenz für spätere Fehlersuche.

Status:

- ✅ Abgeschlossen

## Umgesetzt am 2026-04-01

### Phase 1 Ergebnis

- `QuickCreateSession` liefert jetzt `{ success, sessionId }` statt nur `boolean`.
- Betroffene Stellen wurden auf das neue Ergebnis umgestellt.

### Phase 2 Ergebnis

- Der Orchestrator merkt sich beim Erzeugen des Folge-Chats explizit die Ziel-Session-ID.
- Auto-Send wird erst ausgeführt, wenn genau diese Ziel-Session aktiv ist.

### Phase 3 Ergebnis

- Der globale Completion-Listener reagiert nicht mehr pauschal auf alle Projekt-Sessions.
- Er erlaubt nur noch:
  - aktive Session oder
  - Sessions aus dem aktiven Orchestrator-Run (`orchestratorRunId` + `sourceType: orchestrator`).

### Phase 4 Ergebnis

- TypeScript erfolgreich geprüft (`npm run typecheck`).
- Verlauf und Completed-Dokumentation wurden aktualisiert.
