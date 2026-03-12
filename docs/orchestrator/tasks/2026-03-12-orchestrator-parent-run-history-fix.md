# Orchestrator-Historie: Phasen unter einem Obertask bündeln

ULTRATHINK

> Status: ✅ Abgeschlossen
> Erstellt: 2026-03-12
> Typ: Bugfix (Frontend)

## 1) Was wurde verstanden?

Im Orchestrator-Modus wurden neue Chats oft mit neuer Run-ID angelegt.
Dadurch bekam jede Phase einen eigenen Obertask.
Die Liste wurde unnötig voll und unübersichtlich.

## 2) Validierung der Phase (vor Umsetzung)

✅ Die Phase ist sinnvoll.

Warum:

- Der Fehler liegt nicht im UI-Rendering, sondern in der Run-ID-Vergabe beim Erstellen neuer Sessions.
- Wenn die Run-ID stabil bleibt, funktioniert die vorhandene Gruppierung direkt korrekt.
- Kein Umbau an Backend oder Datenformat nötig.

## 3) Plan

### Phase 1: Run-ID beim Session-Erstellen stabil halten (abgeschlossen)

Ziel:

- Neue Orchestrator-Phasen sollen dieselbe Run-ID behalten.
- Dadurch landen sie im selben Elternblock in der Historie.

Umsetzung:

- In `apps/ui/src/components/session-manager.tsx` wird bei aktivem Orchestrator zuerst die bereits gespeicherte `orchestratorRunId` genutzt.
- Nur wenn keine Run-ID vorhanden ist, wird eine neue erzeugt.

Status: ✅ Abgeschlossen am 2026-03-12

## 4) Was wurde konkret gemacht?

- Funktion `resolveOrchestratorRunIdForSessionCreation()` angepasst.
- Das bisherige Verhalten „bei manuellem New Chat immer neue Run-ID“ wurde entfernt.
- Fallback bleibt erhalten: Wenn keine Run-ID existiert, wird sicher eine neue erstellt.

## 5) Was ist der nächste Schritt?

- Sichtprüfung im UI mit einem neuen Orchestrator-Lauf:
  - Phase 1 starten
  - Phase 2/3 automatisch oder manuell im Modus fortsetzen
  - Prüfen, dass alle Phasen im selben Obertask erscheinen
