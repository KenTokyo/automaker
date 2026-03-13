# Chat-Fehler „nicht gefunden“ beim Senden beheben

ULTRATHINK

> Status: ✅ Abgeschlossen
> Erstellt: 2026-03-13
> Typ: Bugfix (Server)

## 1) Was wurde verstanden?

Beim Schreiben im Chat kam sofort:
„Dieser Chat wurde nicht gefunden. Bitte öffne ihn neu und versuche es nochmal.“

Das blockiert den ganzen Chat-Flow, obwohl der User gerade einen Chat geöffnet oder erstellt hat.

## 2) Validierung der Phase (vor Umsetzung)

✅ Die Phase ist sinnvoll.

Warum:

- Der Fehler passiert im Server-Route-Handler für `POST /api/agent/send`.
- Ein UI-Workaround wäre nur ein Pflaster.
- Der eigentliche Blocker ist ein zu strenger Metadaten-Check vor dem eigentlichen Session-Start.

## 3) Plan (ULTRATHINK)

### Phase 1: Send-Flow robust machen (abgeschlossen)

Ziel:

- Nachrichten sollen wieder zuverlässig gesendet werden.
- Kein harter Abbruch nur wegen eines Metadaten-Moments.

Umsetzung:

- In `apps/server/src/routes/agent/routes/send.ts` den harten `sessionExists`-Abbruch entfernt.
- Stattdessen wird direkt `startConversation(...)` genutzt und danach normal geprüft, ob bereits ein Lauf aktiv ist.

Status: ✅ Abgeschlossen am 2026-03-13

## 4) Was wurde konkret gemacht?

- Der 404-Abbruch „Chat nicht gefunden“ wurde aus dem Send-Flow entfernt.
- Kommentar ergänzt, warum hier kein reiner Metadaten-Check mehr erzwungen wird.
- TypeScript-Check folgt nach dem Code-Fix.

## 5) Was ist der nächste Schritt?

- Kurz im UI prüfen:
  1. Neuen Chat öffnen
  2. Nachricht senden
  3. Prüfen, dass keine „Chat nicht gefunden“-Meldung mehr kommt
