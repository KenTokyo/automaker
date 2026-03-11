# Phase 3: Session/Thread Zustand Store

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 1
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Der Chat hatte nur eine Session.
Für mehrere Chats parallel fehlte ein eigener Speicher für Sessions.

## Was soll passieren?

Ein eigener Zustand-Store (`useSessionStore`) für:

- mehrere Sessions gleichzeitig
- aktive Session plus Reihenfolge
- Drafts pro Session (Text, Bilder, Dateien)
- Session-Status, Modell, Tokens und Kosten
- sauberes Wiederverwenden von inaktiven Sessions

## Wie der User die App jetzt erlebt

1. „Neuer Chat“ erstellt einen neuen Chat oder nutzt einen freien Chat wieder.
2. Beim Wechseln bleibt die Eingabe pro Chat erhalten.
3. Session-Status wird pro Chat korrekt angezeigt.
4. Nach Neustart wird die letzte aktive Session weiter genutzt.

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                          | Zweck                                                       |
| ------------------------------ | ----------------------------------------------------------- |
| `stores/types.ts`              | Typen für Session-Daten                                     |
| `stores/session-store.ts`      | Zustand-Store inkl. Persistenz und Session-Logik            |
| `hooks/use-active-session.ts`  | Hook für aktive Session plus Sessions im aktuellen Projekt  |
| `hooks/use-session-actions.ts` | Aktionen mit API-Anbindung (erstellen, wechseln, schließen) |

### Geänderte Dateien

| Datei                      | Was wurde ergänzt                                         |
| -------------------------- | --------------------------------------------------------- |
| `components/chat-view.tsx` | Session-Store angebunden (Drafts, Wechsel, Event-Routing) |
| `src/app.tsx`              | Projektkontext für Session-Store gesetzt                  |

---

## Konkret umgesetzt

### Aufgabe 3.1: TypeScript Typen definieren (`stores/types.ts`)

- `SessionState` und unterstützende Typen angelegt.
- Draft-Daten und Orchestrator-Felder enthalten.
- Persistierte Metadaten sauber getrennt.

### Aufgabe 3.2: Zustand Store erstellen (`stores/session-store.ts`)

- Voller Session-Store mit Aktionen erstellt.
- Persistenz mit `persist` eingebaut.
- Nachrichten und große Draft-Arrays werden bei Persistenz bewusst geleert.
- Projektbezogene Session-Reihenfolge und aktive Session werden stabil geführt.

### Aufgabe 3.3: Session-Erstellung

- Session-Erstellung über API integriert.
- Neue Sessions werden sofort im Store gesetzt und aktiv geschaltet.
- Idle-Session-Wiederverwendung mit Namen-Vergabe eingebaut.

### Aufgabe 3.4: Session-Wechsel

- Draft der alten Session wird vor Wechsel gespeichert.
- Draft der neuen Session wird beim Wechsel geladen.
- Aktive Session wird im Store und in der UI synchron gehalten.

### Aufgabe 3.5: Session-Wiederverwendung

- Erst aktive idle Session prüfen, dann andere idle Session ohne Draft.
- Nur wenn keine passt, wird neu erstellt.
- Überzählige idle Sessions werden automatisch archiviert.

### Aufgabe 3.6: Hooks erstellen

- `use-active-session.ts` liefert aktive Session und Projekt-Sessions.
- `use-session-actions.ts` kapselt API-Aktionen und Store-Updates.

### Aufgabe 3.7: WebSocket Event-Routing

- Stream-Events werden per `sessionId` der richtigen Session zugeordnet.
- Statuswechsel (running, idle, error) wird pro Session gepflegt.
- Titel/Metadaten-Updates landen in der passenden Session.

---

## Prüfpunkte

- [x] Neue Session erstellen funktioniert
- [x] Zwischen Sessions wechseln ohne Datenverlust
- [x] Draft-Nachrichten bleiben pro Session erhalten
- [x] Session-Status (running/idle) wird korrekt angezeigt
- [x] Token/Kosten-Zähler funktionieren pro Session
- [x] WebSocket-Events landen in der richtigen Session
- [x] App-Neustart: Letzte Session wird wiederhergestellt
- [x] Idle Sessions werden automatisch aufgeräumt

## TypeScript-Check

- `npm run typecheck:chat` ✅

## Definition von fertig

1. Mehrere Sessions laufen stabil parallel. ✅
2. Session-Wechsel verliert keine Eingaben. ✅
3. Session-Metadaten bleiben über Neustart erhalten. ✅
4. Grundlage für Tab-Leiste (Phase 4) steht. ✅
